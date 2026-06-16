export default function QuestionCard({ question, isSelected, onClick }) {
  const partClass = `part-${question.part}`;

  return (
    <button
      id={`question-${question.id}`}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-brand-300 bg-brand-50/50 shadow-sm ring-1 ring-brand-200'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`part-tag ${partClass} flex-shrink-0 mt-0.5`}>
          Part {question.part}
        </span>
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {question.topic}
          </span>
          <p className="text-xs text-slate-700 mt-0.5 line-clamp-2 leading-relaxed">
            {question.text.split('\n')[0]}
          </p>
        </div>
      </div>
    </button>
  );
}
