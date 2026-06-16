import { useState, useRef } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';

const ACCEPTED = '.wav,.mp3,.m4a,.webm,.ogg,.flac';

export default function AudioUploader({ onFileSelected }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (f) {
      setFile(f);
      onFileSelected(f);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const clearFile = () => {
    setFile(null);
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      {!file ? (
        <div
          className={`dropzone ${isDragging ? 'active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">
            Drag & drop audio file here
          </p>
          <p className="text-xs text-slate-400 mt-1">
            WAV, MP3, M4A, WebM, OGG — Max 25MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
          <FileAudio className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button onClick={clearFile} className="btn-ghost text-slate-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
