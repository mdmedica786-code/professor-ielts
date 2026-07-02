import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { generateId } from '../utils/formatters';
import { addCardsFromEvaluation } from '../api/vocab';

const AppContext = createContext(null);

// Small id helper for roster entities (students). Eval records use generateId().
function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AppProvider({ children }) {
  // ─── Persisted state (device-local, survives reloads / browser restarts) ───
  const [history, setHistory] = useState([]);
  const [students, setStudents] = useLocalStorage('ielts:students', []);
  const [activeStudentId, setActiveStudentId] = useLocalStorage('ielts:activeStudentId', null);
  const [settings, setSettings] = useLocalStorage('ielts:settings', {
    darkMode: false,
    autoPlayback: true,
    noiseSuppression: true,
    echoCancellation: true,
  });
  // IELTS module choice (Academic vs General Training) — affects Writing & Reading.
  const [ieltsModule, setIeltsModule] = useLocalStorage('ielts:module', 'academic');
  // Whether the desktop question/task bank is collapsed (preference remembered).
  const [bankCollapsed, setBankCollapsed] = useLocalStorage('ielts:bankCollapsed', false);

  // ─── Session state ───
  // `section` is intentionally NOT persisted: a fresh load / reload returns the
  // student to the Speaking / Writing / Reading picker, as requested.
  const [section, setSection] = useState(null); // null | 'speaking' | 'writing' | 'reading'
  const [currentView, setCurrentView] = useState('practice'); // 'practice' | 'history'
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationStep, setEvaluationStep] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState(null); // speaking
  const [selectedWritingTask, setSelectedWritingTask] = useState(null); // writing
  const [sidebarOpen, setSidebarOpen] = useState(false); // drawer (mobile) / expanded (desktop)
  const [testMode, setTestMode] = useState('practice'); // 'practice' | 'full'

  const toggleBankCollapsed = useCallback(() => setBankCollapsed((c) => !c), [setBankCollapsed]);

  // ─── One-time migration: ensure there's always at least one student ───
  // Migrates the legacy single 'ielts:studentName' into the roster and stamps
  // any pre-existing history records with the new student's id.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    if (students.length === 0) {
      let oldName = '';
      try {
        const raw = window.localStorage.getItem('ielts:studentName');
        oldName = raw ? JSON.parse(raw) : '';
      } catch {
        oldName = '';
      }
      const student = {
        id: makeId('student'),
        name: (oldName && oldName.trim()) || 'Student 1',
        createdAt: new Date().toISOString(),
      };
      setStudents([student]);
      setActiveStudentId(student.id);
      setHistory((prev) => prev.map((r) => (r.studentId ? r : { ...r, studentId: student.id })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep activeStudentId pointing at a real student.
  useEffect(() => {
    if (students.length > 0 && !students.some((s) => s.id === activeStudentId)) {
      setActiveStudentId(students[0].id);
    }
  }, [students, activeStudentId, setActiveStudentId]);

  // Fetch history from backend on load
  useEffect(() => {
    let mounted = true;
    import('../api/client').then(({ fetchHistory }) => {
      fetchHistory().then(res => {
        if (mounted && res.success && res.data) {
          setHistory(res.data);
        }
      }).catch(err => console.error("Failed to fetch history from backend:", err));
    });
    return () => { mounted = false; };
  }, []);

  // ─── Student roster actions ───
  const addStudent = useCallback((name) => {
    const clean = (name || '').trim();
    if (!clean) return null;
    const student = { id: makeId('student'), name: clean, createdAt: new Date().toISOString() };
    setStudents((prev) => [...prev, student]);
    setActiveStudentId(student.id);
    return student;
  }, [setStudents, setActiveStudentId]);

  const renameStudent = useCallback((id, name) => {
    const clean = (name || '').trim();
    if (!clean) return;
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, name: clean } : s)));
  }, [setStudents]);

  const deleteStudent = useCallback((id) => {
    const next = students.filter((s) => s.id !== id);
    setStudents(next);
    // Remove that student's attempts too (their data leaves with them).
    setHistory((prev) => prev.filter((r) => r.studentId !== id));
    // If we deleted the active student, fall back to the first remaining one.
    if (activeStudentId === id) setActiveStudentId(next[0]?.id ?? null);
  }, [students, activeStudentId, setStudents, setHistory, setActiveStudentId]);

  const setActiveStudent = useCallback((id) => setActiveStudentId(id), [setActiveStudentId]);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === activeStudentId) || null,
    [students, activeStudentId]
  );
  // Back-compat read used by SubmitButton / ReportCard.
  const studentName = activeStudent?.name || 'Student';

  // History scoped to the active student (legacy records were stamped on migration).
  const studentHistory = useMemo(
    () => history.filter((r) => r.studentId === activeStudentId),
    [history, activeStudentId]
  );

  // ─── Evaluation history actions ───
  // `opts` lets Writing/Reading stamp their own kind/module/task. Speaking calls
  // saveEvaluation(data) with no opts and keeps its original behaviour.
  const saveEvaluation = useCallback((evaluation, opts = {}) => {
    const record = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      studentId: activeStudentId,
      studentName: activeStudent?.name || 'Student',
      kind: opts.kind || 'speaking',
      module: opts.module || null,
      question: opts.question !== undefined ? opts.question : selectedQuestion,
      evaluation,
    };
    
    // Optimistic UI update
    setHistory((prev) => [record, ...prev]);

    // Save to backend
    import('../api/client').then(({ saveHistoryRecord }) => {
      saveHistoryRecord(record).catch(err => console.error("Failed to save history to backend:", err));
    });

    // Auto-add any vocabulary corrections from this evaluation into the
    // Vocabulary SRS deck (fire-and-forget; server dedups by word).
    if (evaluation?.mistakes) {
      addCardsFromEvaluation(evaluation).catch(() => {});
    }
    return record;
  }, [activeStudentId, activeStudent, selectedQuestion, setHistory]);

  const deleteHistoryRecord = useCallback((id) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
  }, [setHistory]);

  // Clears only the active student's attempts (what the History screen shows).
  const clearStudentHistory = useCallback(() => {
    setHistory((prev) => prev.filter((r) => r.studentId !== activeStudentId));
  }, [activeStudentId, setHistory]);

  // ─── Sidebar / drawer ───
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const value = useMemo(() => ({
    // Persisted
    history,
    studentHistory,
    students,
    activeStudentId,
    activeStudent,
    studentName,
    settings,
    ieltsModule,
    bankCollapsed,

    // Session
    section,
    currentView,
    currentEvaluation,
    isEvaluating,
    evaluationStep,
    selectedQuestion,
    selectedWritingTask,
    sidebarOpen,
    testMode,

    // Setters
    setSettings,
    setIeltsModule,
    setBankCollapsed,
    toggleBankCollapsed,
    setSection,
    setCurrentView,
    setCurrentEvaluation,
    setIsEvaluating,
    setEvaluationStep,
    setSelectedQuestion,
    setSelectedWritingTask,
    setSidebarOpen,
    setTestMode,

    // Student actions
    addStudent,
    renameStudent,
    deleteStudent,
    setActiveStudent,

    // History actions
    saveEvaluation,
    deleteHistoryRecord,
    clearStudentHistory,

    // Sidebar actions
    toggleSidebar,
    closeSidebar,
  }), [
    history,
    studentHistory,
    students,
    activeStudentId,
    activeStudent,
    studentName,
    settings,
    ieltsModule,
    bankCollapsed,
    section,
    currentView,
    currentEvaluation,
    isEvaluating,
    evaluationStep,
    selectedQuestion,
    selectedWritingTask,
    sidebarOpen,
    testMode,
    setSettings,
    setIeltsModule,
    setBankCollapsed,
    toggleBankCollapsed,
    setSection,
    setCurrentView,
    setCurrentEvaluation,
    setIsEvaluating,
    setEvaluationStep,
    setSelectedQuestion,
    setSelectedWritingTask,
    setSidebarOpen,
    setTestMode,
    addStudent,
    renameStudent,
    deleteStudent,
    setActiveStudent,
    saveEvaluation,
    deleteHistoryRecord,
    clearStudentHistory,
    toggleSidebar,
    closeSidebar,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
