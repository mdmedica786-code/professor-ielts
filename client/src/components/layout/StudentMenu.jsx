import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, ChevronDown, Plus, Check, Pencil, Trash2, X } from 'lucide-react';

/**
 * Student roster control. Everything here is stored in the browser's local
 * storage (device-only) — no server. Touch-friendly: row actions are always
 * visible (no hover-only controls) since the app is used mostly on phones.
 */
export default function StudentMenu() {
  const {
    students,
    activeStudent,
    activeStudentId,
    setActiveStudent,
    addStudent,
    renameStudent,
    deleteStudent,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const close = () => {
    setOpen(false);
    setEditingId(null);
  };

  const handleAdd = (e) => {
    e?.preventDefault();
    const created = addStudent(newName);
    if (created) setNewName('');
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const commitEdit = () => {
    renameStudent(editingId, editName);
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (s) => {
    if (
      window.confirm(
        `Delete "${s.name}" and all their saved attempts? This data lives only on this device and can't be undone.`
      )
    ) {
      deleteStudent(s.id);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 hover:border-slate-300 transition-colors max-w-[46vw] sm:max-w-none"
      >
        <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5" />
        </span>
        <span className="text-sm font-medium text-slate-800 truncate">
          {activeStudent?.name || 'Add student'}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-40" onClick={close} aria-hidden="true" />

          <div className="absolute right-0 mt-2 z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white shadow-xl p-2 animate-scale-in">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
              Students · saved on this device
            </div>

            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {students.length === 0 && (
                <p className="px-2 py-3 text-xs text-slate-400">
                  No students yet — add your first below.
                </p>
              )}

              {students.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-1 rounded-xl px-2 py-1.5 ${
                    s.id === activeStudentId ? 'bg-brand-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {editingId === s.id ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="input-field py-1 text-sm flex-1"
                      />
                      <button
                        onClick={commitEdit}
                        className="p-1.5 rounded-lg hover:bg-brand-100 text-brand-600"
                        aria-label="Save name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setActiveStudent(s.id);
                          close();
                        }}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            s.id === activeStudentId ? 'bg-brand-500' : 'bg-slate-200'
                          }`}
                        />
                        <span className="text-sm text-slate-800 truncate">{s.name}</span>
                      </button>
                      <button
                        onClick={() => startEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                        aria-label={`Rename ${s.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAdd}
              className="flex items-center gap-1.5 border-t border-slate-100 mt-1.5 pt-2"
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add new student…"
                className="input-field py-1.5 text-sm flex-1"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="btn-primary px-3 py-1.5 disabled:opacity-40"
                aria-label="Add student"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
