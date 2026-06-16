import { useApp } from '../../context/AppContext';
import ProgressChart from './ProgressChart';
import RecordCard from './RecordCard';
import RecordDetail from './RecordDetail';
import { useState } from 'react';
import { History, Trash2, TrendingUp } from 'lucide-react';

export default function HistoryView() {
  const { studentHistory, clearStudentHistory, activeStudent } = useApp();
  const history = studentHistory;
  const [selectedRecord, setSelectedRecord] = useState(null);

  if (selectedRecord) {
    return (
      <RecordDetail
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <h2 className="text-base md:text-lg font-bold text-slate-900 truncate">
            History{activeStudent ? ` — ${activeStudent.name}` : ''}
          </h2>
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 flex-shrink-0">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            id="clear-history"
            onClick={() => {
              if (
                window.confirm(
                  `Clear all of ${activeStudent?.name || 'this student'}'s evaluation history? This cannot be undone.`
                )
              ) {
                clearStudentHistory();
              }
            }}
            className="btn-ghost text-rose-500 hover:bg-rose-50 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="card-padded text-center py-16">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">No evaluations yet</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeStudent ? `${activeStudent.name} hasn't` : "You haven't"} completed a practice evaluation yet — results will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Progress Chart */}
          {history.length >= 2 && (
            <div className="card-padded">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900">Score Progress</h3>
              </div>
              <ProgressChart history={history} />
            </div>
          )}

          {/* History Records */}
          <div className="space-y-3">
            {history.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onClick={() => setSelectedRecord(record)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
