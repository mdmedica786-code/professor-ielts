import EvaluationPanel from '../evaluation/EvaluationPanel';
import WritingEvaluationPanel from '../writing/WritingEvaluationPanel';
import ReadingResult from '../reading/ReadingResult';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, Calendar } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

function HistoryHeader({ record, onBack }) {
  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
      <button
        onClick={onBack}
        className="btn-ghost flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to History
      </button>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Calendar className="w-3 h-3" />
        {formatDateTime(record.timestamp)}
        {record.studentName && (
          <span className="text-slate-600 font-medium">{record.studentName}</span>
        )}
      </div>
    </div>
  );
}

export default function RecordDetail({ record, onBack }) {
  const { setCurrentEvaluation } = useApp();
  const kind = record.kind || 'speaking';

  if (!record.evaluation) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-slate-500">Evaluation data not available.</p>
        <button onClick={onBack} className="btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  // Writing — its panel takes the evaluation directly (no global currentEvaluation).
  if (kind === 'writing') {
    return (
      <div className="h-full flex flex-col">
        <HistoryHeader record={record} onBack={onBack} />
        <div className="flex-1 overflow-hidden">
          <WritingEvaluationPanel evaluation={record.evaluation} />
        </div>
      </div>
    );
  }

  // Reading — its result view takes the result directly.
  if (kind === 'reading') {
    return (
      <div className="h-full flex flex-col">
        <HistoryHeader record={record} onBack={onBack} />
        <div className="flex-1 overflow-hidden">
          <ReadingResult result={record.evaluation} onBack={onBack} backLabel="Back to History" />
        </div>
      </div>
    );
  }

  // Speaking (default) — reuse EvaluationPanel via the shared currentEvaluation.
  // Clear it on the way out so it can't leak into the Speaking practice room.
  const handleMount = () => setCurrentEvaluation(record.evaluation);
  const backAndClear = () => {
    setCurrentEvaluation(null);
    onBack();
  };

  return (
    <div className="h-full flex flex-col">
      <HistoryHeader record={record} onBack={backAndClear} />
      <div className="flex-1 overflow-hidden" ref={() => handleMount()}>
        <EvaluationPanel />
      </div>
    </div>
  );
}
