import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AudioRecorder from './AudioRecorder';
import AudioUploader from './AudioUploader';
import TranscriptInput from './TranscriptInput';
import SubmitButton from './SubmitButton';
import { Mic, Upload, FileText, MessageSquare } from 'lucide-react';

export default function RecorderPanel() {
  const { selectedQuestion } = useApp();
  const [inputMode, setInputMode] = useState('record'); // 'record' | 'upload' | 'text'
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState('');

  const modes = [
    { id: 'record', icon: Mic, label: 'Record' },
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'text', icon: FileText, label: 'Text Only' },
  ];

  // Determine what to submit
  const getSubmitData = () => {
    if (inputMode === 'record' && audioBlob) {
      return { audioFile: new File([audioBlob], 'recording.webm', { type: audioBlob.type }) };
    }
    if (inputMode === 'upload' && audioFile) {
      return { audioFile };
    }
    if (inputMode === 'text' && transcript.trim()) {
      return { transcript };
    }
    return null;
  };

  const canSubmit = !!getSubmitData() && !!selectedQuestion;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Selected Question Display */}
      {selectedQuestion ? (
        <div className="card-padded animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-brand-500" />
            <span className={`part-tag part-${selectedQuestion.part}`}>
              Part {selectedQuestion.part}
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {selectedQuestion.topic}
            </span>
          </div>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
            {selectedQuestion.text}
          </p>
        </div>
      ) : (
        <div className="card-padded text-center py-12">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Select a question to begin</p>
          <p className="text-xs text-slate-400 mt-1">
            Choose from the question bank on the left
          </p>
        </div>
      )}

      {/* Input Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
          {modes.map((m) => (
            <button
              key={m.id}
              id={`input-mode-${m.id}`}
              onClick={() => setInputMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                inputMode === m.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="card-padded">
        {inputMode === 'record' && (
          <AudioRecorder onRecorded={setAudioBlob} />
        )}
        {inputMode === 'upload' && (
          <AudioUploader onFileSelected={setAudioFile} />
        )}
        {inputMode === 'text' && (
          <TranscriptInput value={transcript} onChange={setTranscript} />
        )}
      </div>

      {/* Transcript textarea (always available for record/upload modes) */}
      {inputMode !== 'text' && (
        <div className="card-padded">
          <TranscriptInput
            value={transcript}
            onChange={setTranscript}
            label="Optional: Edit transcript"
            placeholder="The transcript will be auto-generated from your audio. You can also type or edit here..."
          />
        </div>
      )}

      {/* Submit */}
      <SubmitButton
        disabled={!canSubmit}
        submitData={getSubmitData()}
        transcript={transcript}
      />
    </div>
  );
}
