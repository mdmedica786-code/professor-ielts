import { useApp } from '../../context/AppContext';
import { GraduationCap, Briefcase } from 'lucide-react';

/**
 * Academic vs General Training selector. Reads/writes the global ieltsModule.
 * Used by the Writing and Reading sections (Speaking is module-agnostic).
 */
export default function ModuleToggle({ size = 'md' }) {
  const { ieltsModule, setIeltsModule } = useApp();

  const options = [
    { value: 'academic', label: 'Academic', icon: GraduationCap },
    { value: 'general', label: 'General Training', icon: Briefcase },
  ];

  const pad = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
      {options.map((opt) => {
        const active = ieltsModule === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setIeltsModule(opt.value)}
            className={`flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200 ${pad} ${
              active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
