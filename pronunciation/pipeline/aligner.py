"""Native Python forced aligner using Groq timestamps and G2P."""
import tempfile
import librosa
import soundfile as sf
import numpy as np
import re

try:
    from g2p_en import G2p
    g2p = G2p()
except ImportError:
    print("Warning: g2p_en not found. Will not be able to align phonemes.")
    g2p = None


def prepare_audio(input_path, output_path=None):
    """Convert any audio to 16kHz mono WAV, normalized."""
    if output_path is None:
        output_path = tempfile.mktemp(suffix=".wav")
    audio, sr = librosa.load(input_path, sr=16000, mono=True)
    audio = audio / (np.max(np.abs(audio)) + 1e-8)
    sf.write(output_path, audio, 16000)
    return output_path, audio


def get_word_phones(groq_words):
    """
    Generate word and phoneme sequences based on Groq Whisper timestamps.
    Since we don't have exact phone timings without MFA, we distribute
    the phonemes evenly within the word's duration.
    
    Args:
        groq_words: List of dicts with 'word', 'start', 'end'.
        
    Returns:
        Tuple of (words, phones) where each is a list of dicts with
        'label', 'start', and 'end' keys.
    """
    words = []
    phones = []
    
    if not g2p:
        return words, phones

    for w in groq_words:
        # Clean word to letters only
        clean_word = re.sub(r'[^a-zA-Z\']', '', w.get('word', '')).strip()
        if not clean_word:
            continue
            
        start = w.get('start', 0.0)
        end = w.get('end', start + 0.1)
        duration = max(end - start, 0.05)
        
        # Add to words list
        words.append({
            "label": clean_word,
            "start": start,
            "end": end
        })
        
        # Get phonemes using g2p_en (returns ARPAbet)
        word_phones = [p for p in g2p(clean_word) if p.isalnum()]
        
        if not word_phones:
            continue
            
        # Distribute phone durations evenly across the word
        phone_dur = duration / len(word_phones)
        
        curr_time = start
        for p in word_phones:
            phones.append({
                "label": p,
                "start": round(curr_time, 4),
                "end": round(curr_time + phone_dur, 4)
            })
            curr_time += phone_dur
            
    return words, phones
