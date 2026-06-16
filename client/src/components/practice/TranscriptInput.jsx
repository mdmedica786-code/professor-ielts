import { FileText } from 'lucide-react';

export default function TranscriptInput({
  value,
  onChange,
  label = 'Your Transcript',
  placeholder = 'Type or paste your IELTS speaking response here...',
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-slate-400" />
        <label className="text-xs font-medium text-slate-600">{label}</label>
      </div>
      <textarea
        id="transcript-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="textarea-field text-sm leading-relaxed"
      />
      {value && (
        <p className="text-[10px] text-slate-400 text-right">
          {value.split(/\s+/).filter(Boolean).length} words
        </p>
      )}
    </div>
  );
}
