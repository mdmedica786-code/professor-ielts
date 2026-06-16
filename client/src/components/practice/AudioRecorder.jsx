import { useEffect, useRef } from 'react';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import { formatTime } from '../../utils/formatters';
import { Mic, Square, Play, Pause, Trash2, AlertCircle } from 'lucide-react';

export default function AudioRecorder({ onRecorded }) {
  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    waveformData,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const audioRef = useRef(null);

  // Notify parent when recording is complete
  useEffect(() => {
    onRecorded(audioBlob);
  }, [audioBlob, onRecorded]);

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4 py-4">
        {!isRecording && !audioUrl && (
          <button
            id="start-recording"
            onClick={startRecording}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Mic className="w-8 h-8 text-white" />
          </button>
        )}

        {isRecording && (
          <>
            {/* Pulsing red recording indicator */}
            <button
              id="stop-recording"
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg recording-pulse"
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>

            {/* Timer */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-lg font-mono font-bold text-slate-800">
                {formatTime(duration)}
              </span>
            </div>

            {/* Waveform Visualization */}
            <div className="flex items-center gap-[2px] h-8">
              {waveformData.map((v, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-brand-500 transition-all duration-100"
                  style={{
                    height: `${Math.max(4, v * 32)}px`,
                    opacity: 0.4 + v * 0.6,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {!isRecording && audioUrl && (
          <>
            {/* Playback controls */}
            <div className="w-full">
              <audio ref={audioRef} src={audioUrl} className="w-full" controls />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {formatTime(duration)} recorded
              </span>
              <button
                id="clear-recording"
                onClick={clearRecording}
                className="btn-ghost flex items-center gap-1.5 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Discard
              </button>
            </div>
          </>
        )}

        {!isRecording && !audioUrl && (
          <p className="text-xs text-slate-400">Click the mic to start recording</p>
        )}
      </div>
    </div>
  );
}
