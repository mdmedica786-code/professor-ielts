import lamejs from 'lamejs';

/**
 * Downloads a Blob as a file to the user's device.
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Downloads the recording directly in its native format (.webm usually).
 */
export function downloadWebM(audioBlob, prefix = 'recording') {
  if (!audioBlob) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadBlob(audioBlob, `${prefix}-${timestamp}.webm`);
}

/**
 * Converts a WebM audio blob to MP3 using lamejs and downloads it.
 */
export async function downloadMP3(audioBlob, prefix = 'recording') {
  if (!audioBlob) return;
  
  try {
    // 1. Decode the audio blob into raw audio data using AudioContext
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    // 2. Prepare lamejs encoder
    // We mix down to 1 channel (mono) for simplicity and size
    const channels = 1; 
    const sampleRate = audioBuffer.sampleRate;
    const kbps = 128; // 128kbps is plenty for voice
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];

    // 3. Get audio data for the first channel (left)
    const channelData = audioBuffer.getChannelData(0); 
    
    // 4. Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767)
    // lamejs expects 16-bit PCM data
    const sampleBlockSize = 1152; // multiple of 576
    const samples = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      let s = Math.max(-1, Math.min(1, channelData[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // 5. Encode chunks
    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    // 6. Finish encoding
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    // 7. Create final Blob and download
    const finalBlob = new Blob(mp3Data, { type: 'audio/mp3' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadBlob(finalBlob, `${prefix}-${timestamp}.mp3`);
    
  } catch (err) {
    console.error("Error converting to MP3:", err);
    // Fallback to webm if conversion fails
    downloadWebM(audioBlob, prefix);
  }
}
