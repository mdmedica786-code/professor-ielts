import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import SignInScreen from './components/auth/SignInScreen';
import LandingPage from './components/landing/LandingPage';
import PaywallModal from './components/common/PaywallModal';
import AdBanner from './components/common/AdBanner';
import ChatWidget from './components/chatbot/ChatWidget';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import SectionPicker from './components/layout/SectionPicker';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const HistoryView = lazy(() => import('./components/history/HistoryView'));
const EvaluationPanel = lazy(() => import('./components/evaluation/EvaluationPanel'));
const UpgradeScreen = lazy(() => import('./components/payments/UpgradeScreen'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const VocabDeck = lazy(() => import('./components/vocab/VocabDeck'));
const PracticeRoom = lazy(() => import('./components/practice/PracticeRoom'));
const WritingRoom = lazy(() => import('./components/writing/WritingRoom'));
const ReadingRoom = lazy(() => import('./components/reading/ReadingRoom'));
const ListeningRoom = lazy(() => import('./components/listening/ListeningRoom'));
import logoImg from './assets/bandlogic-logo-transparent.png';

export default function App() {
  const { section, currentView, currentEvaluation, setCurrentView } = useApp();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    const handleUpgrade = () => setCurrentView('upgrade');
    window.addEventListener('navigate-upgrade', handleUpgrade);
    return () => window.removeEventListener('navigate-upgrade', handleUpgrade);
  }, [setCurrentView]);

  const [showSignIn, setShowSignIn] = useState(false);

  if (!user) {
    if (showSignIn) {
      return <SignInScreen onBack={() => setShowSignIn(false)} />;
    }
    return <LandingPage onSignInClick={() => setShowSignIn(true)} />;
  }

  return (
    // 100dvh keeps the shell correct against mobile browser chrome (address bar).
    <div className="flex h-[100dvh] app-canvas overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
          }>
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
            {currentView === 'admin' && <AdminDashboard />}
            {currentView === 'vocab' && <VocabDeck />}
          </Suspense>
        </main>
      </div>
      <ChatWidget />
      <PaywallModal />
      <AdBanner />
    </div>
  );
}
