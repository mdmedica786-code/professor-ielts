import { useEffect, useRef, useState } from 'react';
import useAudioRecorder from '../../hooks/useAudioRecorder';
import { formatTime } from '../../utils/formatters';
import { Mic, Square, Trash2, AlertCircle, Settings, Download, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { downloadMP3 } from '../../utils/audioUtils';

export default function AudioRecorder({ onRecorded }) {
  const { settings, setSettings } = useApp();
  const [showSettings, setShowSettings] = useState(false);

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
  } = useAudioRecorder({
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: settings.echoCancellation,
  });

  const audioRef = useRef(null);

  // Notify parent when recording is complete
  useEffect(() => {
    onRecorded(audioBlob);
  }, [audioBlob, onRecorded]);

  // Pre-prompt for microphone permissions on mount
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Immediately stop the stream so we don't leave the recording light on
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.warn('Microphone permission pre-prompt failed or denied:', err);
        });
    }
  }, []);

  return (
    <div className="space-y-4 relative">
      {/* Settings Header Area */}
      <div className="flex justify-end absolute top-0 right-0">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="Audio Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Popover */}
      {showSettings && (
        <div className="absolute top-10 right-0 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-10 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Audio Settings</h4>
            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-slate-700">Noise Suppression</span>
              <input 
                type="checkbox"
                className="toggle-checkbox"
                checked={settings.noiseSuppression}
                onChange={(e) => setSettings({...settings, noiseSuppression: e.target.checked})}
              />
            </label>
            <p className="text-[10px] text-slate-500 leading-tight">
              Removes background noise. Turn off for raw, authentic pronunciation feedback in quiet rooms.
            </p>

            <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-700">Echo Cancellation</span>
              <input 
                type="checkbox"
                className="toggle-checkbox"
                checked={settings.echoCancellation}
                onChange={(e) => setSettings({...settings, echoCancellation: e.target.checked})}
              />
            </label>
            <p className="text-[10px] text-slate-500 leading-tight">
              Prevents mic from picking up speaker audio. Leave on unless using headphones.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded-xl mt-8">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex flex-col items-center gap-4 py-4 mt-4">
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

            <div className="flex items-center justify-between w-full mt-2">
              <span className="text-xs text-slate-500 font-medium">
                {formatTime(duration)} recorded
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadMP3(audioBlob, 'ielts-practice')}
                  className="btn-ghost flex items-center gap-1.5 text-brand-600 hover:bg-brand-50 text-xs px-3 py-1.5"
                  title="Download MP3"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>

                <button
                  id="clear-recording"
                  onClick={clearRecording}
                  className="btn-ghost flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 text-xs px-3 py-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard
                </button>
              </div>
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
