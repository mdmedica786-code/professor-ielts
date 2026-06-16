import { useApp } from '../../context/AppContext';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Desktop-only collapsible left column shared by the Speaking / Writing / Reading
 * rooms. Collapses to a thin rail with an expand button; the collapsed state is
 * remembered globally (bankCollapsed). On mobile each room handles its own
 * collapsible bank, so this renders nothing below md.
 *
 * @param {string} title  - short label shown on the collapsed rail
 * @param {ReactNode} children - the bank content (question/task list)
 */
export default function BankColumn({ title = 'Bank', children }) {
  const { bankCollapsed, toggleBankCollapsed } = useApp();

  if (bankCollapsed) {
    return (
      <div className="hidden md:flex flex-col items-center w-12 border-r border-slate-200 bg-white flex-shrink-0 pt-2.5">
        <button
          onClick={toggleBankCollapsed}
          title={`Show ${title}`}
          aria-label={`Show ${title}`}
          className="btn-ghost p-2"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
        <span className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none [writing-mode:vertical-rl] rotate-180">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div className="hidden md:flex md:flex-col md:w-[340px] lg:w-[420px] border-r border-slate-200 bg-white flex-shrink-0 min-h-0">
      <div className="flex items-center justify-end h-8 px-2 border-b border-slate-100 flex-shrink-0">
        <button
          onClick={toggleBankCollapsed}
          title="Collapse panel"
          aria-label="Collapse panel"
          className="btn-ghost p-1 text-slate-400 hover:text-slate-600"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
    </div>
  );
}
