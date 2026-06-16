/**
 * A selectable writing-task card for the task bank. Mirrors QuestionCard.
 */
export default function WritingTaskCard({ task, isSelected, onClick }) {
  return (
    <button
      id={`writing-task-${task.id}`}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-brand-300 bg-brand-50/50 shadow-sm ring-1 ring-brand-200'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`part-tag part-${task.task} flex-shrink-0 mt-0.5`}>
          Task {task.task}
        </span>
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {task.topic}
          </span>
          <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{task.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
            {task.text.split('\n')[0]}
          </p>
        </div>
      </div>
    </button>
  );
}
