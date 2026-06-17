import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import SignInScreen from './components/auth/SignInScreen';
import PaywallModal from './components/common/PaywallModal';
import ChatWidget from './components/chatbot/ChatWidget';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import SectionPicker from './components/layout/SectionPicker';
import PracticeRoom from './components/practice/PracticeRoom';
import WritingRoom from './components/writing/WritingRoom';
import ReadingRoom from './components/reading/ReadingRoom';
import ListeningRoom from './components/listening/ListeningRoom';
import ListeningView from './components/listening/ListeningView';
import HistoryView from './components/history/HistoryView';
import EvaluationPanel from './components/evaluation/EvaluationPanel';
import UpgradeScreen from './components/payments/UpgradeScreen';

export default function App() {
  const { section, currentView, currentEvaluation, setCurrentView } = useApp();
  const { user } = useAuth();

  useEffect(() => {
    const handleUpgrade = () => setCurrentView('upgrade');
    window.addEventListener('navigate-upgrade', handleUpgrade);
    return () => window.removeEventListener('navigate-upgrade', handleUpgrade);
  }, [setCurrentView]);

  if (!user) {
    return <SignInScreen />;
  }

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

              {section === 'listening' && <ListeningRoom />}
            </div>
          )}

          {currentView === 'history' && <HistoryView />}
          {currentView === 'upgrade' && <UpgradeScreen />}
        </main>
      </div>
      <ChatWidget />
      <PaywallModal />
    </div>
  );
}
