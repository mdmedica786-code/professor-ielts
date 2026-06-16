"""Wav2Vec2-based phone scorer with GOP computation."""
import torch
import librosa
import numpy as np
from transformers import Wav2Vec2ForCTC, AutoFeatureExtractor
from huggingface_hub import hf_hub_download
import json
from .phone_map import ARPABET_TO_IPA


class PhoneScorer:
    """
    Scores individual phone segments using Wav2Vec2 posterior probabilities
    and Goodness of Pronunciation (GOP) metric.
    """

    def __init__(self):
        model_name = "facebook/wav2vec2-lv-60-espeak-cv-ft"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Wav2Vec2 on {self.device}...")
        self.feature_extractor = AutoFeatureExtractor.from_pretrained(model_name)
        self.model = Wav2Vec2ForCTC.from_pretrained(model_name).to(self.device)
        self.model.eval()
        
        # Bypass phonemizer by fetching vocab.json directly
        vocab_path = hf_hub_download(repo_id=model_name, filename="vocab.json")
        with open(vocab_path, "r", encoding="utf-8") as f:
            self.vocab = json.load(f)
            
        self.id_to_phone = {v: k for k, v in self.vocab.items()}
        print(f"Loaded. Vocab size: {len(self.vocab)}")

    def get_posteriors(self, audio_path):
        """
        Get frame-level phone posterior probabilities.

        Args:
            audio_path: Path to 16kHz mono WAV file.

        Returns:
            Tuple of (probs, frame_dur) where probs is a numpy array
            of shape (num_frames, vocab_size) and frame_dur is the
            duration of each frame in seconds.
        """
        # Load with librosa (CPU-only, libsndfile/audioread backend) instead of
        # torchaudio.load, which routes through torchcodec and requires CUDA
        # libraries (libnvrtc.so.13) that are absent from this CPU-only image.
        # librosa returns a 1-D float32 numpy array already resampled to 16 kHz
        # mono, so no torchaudio Resample is needed.
        waveform, sr = librosa.load(audio_path, sr=16000, mono=True)

        inputs = self.feature_extractor(
            waveform,
            sampling_rate=16000,
            return_tensors="pt"
        ).to(self.device)

        with torch.no_grad():
            logits = self.model(**inputs).logits

        probs = torch.softmax(logits, dim=-1).squeeze(0).cpu().numpy()
        frame_dur = 320 / 16000   # 0.02s per frame (Wav2Vec2 stride)
        return probs, frame_dur

    def score_phone(self, probs, frame_dur, phone_label, start, end):
        """
        Compute GOP (Goodness of Pronunciation) for a single phone segment.

        Args:
            probs: Frame-level posterior probabilities from get_posteriors()
            frame_dur: Duration of each frame in seconds
            phone_label: ARPAbet phone label (e.g., 'TH', 'IH1')
            start: Start time in seconds
            end: End time in seconds

        Returns:
            Tuple of (gop_score, predicted_phones_counts, status)
            where status is 'good', 'acceptable', or 'mispronounced'
        """
        sf = int(start / frame_dur)
        ef = min(int(end / frame_dur), len(probs) - 1)
        if sf >= ef:
            return 0.0, {}, "unknown"

        segment = probs[sf:ef]
        target_ids = self._map_phone(phone_label)

        if not target_ids:
            return 0.0, {}, "unmapped"

        # GOP = mean log posterior of target phone
        target_probs = np.clip(
            np.sum(segment[:, target_ids], axis=1), 1e-10, 1.0
        )
        gop = float(np.mean(np.log(target_probs)))

        # What did the model actually hear?
        pred_ids = np.argmax(segment, axis=1)
        counts = {}
        for pid in pred_ids:
            p = self.id_to_phone.get(pid, "?")
            if p not in ("<pad>", "|", "<s>", "</s>"):
                counts[p] = counts.get(p, 0) + 1
        top = max(counts, key=counts.get) if counts else "?"

        # Status classification based on GOP thresholds
        if gop > -2.0:
            status = "good"
        elif gop > -5.0:
            status = "acceptable"
        else:
            status = "mispronounced"

        return gop, counts, status

    def _map_phone(self, arpabet):
        """
        Map ARPAbet label to Wav2Vec2 vocabulary IDs.

        Strips stress markers (0/1/2) and maps through ARPABET_TO_IPA
        to find matching entries in the model's vocabulary.
        """
        clean = arpabet.upper().rstrip("012")
        ipa_list = ARPABET_TO_IPA.get(clean, [])
        ids = []
        for label, idx in self.vocab.items():
            for ipa in ipa_list:
                if ipa in label or label in ipa:
                    ids.append(idx)
                    break
        return list(set(ids))
