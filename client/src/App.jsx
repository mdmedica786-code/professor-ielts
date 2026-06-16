import { useApp } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import SectionPicker from './components/layout/SectionPicker';
import PracticeRoom from './components/practice/PracticeRoom';
import WritingRoom from './components/writing/WritingRoom';
import ReadingRoom from './components/reading/ReadingRoom';
import HistoryView from './components/history/HistoryView';
import EvaluationPanel from './components/evaluation/EvaluationPanel';

export default function App() {
  const { section, currentView, currentEvaluation } = useApp();

  return (
    // 100dvh keeps the shell correct against mobile browser chrome (address bar).
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {currentView === 'practice' && (
            <div className="h-full">
              {!section && <SectionPicker />}

              {section === 'speaking' &&
                (currentEvaluation ? <EvaluationPanel /> : <PracticeRoom />)}

              {section === 'writing' && <WritingRoom />}

              {section === 'reading' && <ReadingRoom />}
            </div>
          )}
          {currentView === 'history' && <HistoryView />}
        </main>
      </div>
    </div>
  );
}
