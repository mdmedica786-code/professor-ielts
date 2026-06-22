import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import SignInScreen from './components/auth/SignInScreen';
import LandingPage from './components/landing/LandingPage';
import PaywallModal from './components/common/PaywallModal';
import ChatWidget from './components/chatbot/ChatWidget';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import SectionPicker from './components/layout/SectionPicker';
import PracticeRoom from './components/practice/PracticeRoom';
import WritingRoom from './components/writing/WritingRoom';
import ReadingRoom from './components/reading/ReadingRoom';
import ListeningRoom from './components/listening/ListeningRoom';

import HistoryView from './components/history/HistoryView';
import EvaluationPanel from './components/evaluation/EvaluationPanel';
import UpgradeScreen from './components/payments/UpgradeScreen';
import AdminDashboard from './components/admin/AdminDashboard';
import ChartGenerator from './components/common/ChartGenerator';
import VocabDeck from './components/vocab/VocabDeck';
import logoImg from './assets/bandlogic-logo-transparent.png';

export default function App() {
  const { section, currentView, currentEvaluation, setCurrentView } = useApp();
  const { user } = useAuth();

  const [showSignIn, setShowSignIn] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  useEffect(() => {
    const handleUpgrade = () => setCurrentView('upgrade');
    window.addEventListener('navigate-upgrade', handleUpgrade);

    // Fade out splash after 2000ms
    const fadeTimer = setTimeout(() => {
      setSplashFade(true);
    }, 2000);

    // Completely unmount splash after 2500ms
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => {
      window.removeEventListener('navigate-upgrade', handleUpgrade);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [setCurrentView]);

  if (showSplash) {
    return (
      <div 
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ease-out ${
          splashFade ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="relative flex flex-col items-center gap-7 scale-up">
          {/* Outer glow aura */}
          <div className="absolute -inset-6 bg-indigo-600/20 rounded-full blur-2xl animate-pulse" />
          
          <img
            src={logoImg}
            alt="BandLogic"
            className="w-56 h-auto object-contain relative z-10 animate-logo-pulse"
            draggable={false}
          />
          
          {/* Subtle horizontal loading shimmer */}
          <div className="w-20 h-[3px] bg-slate-800 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-indigo-500 rounded-full w-2/5 animate-shimmer-custom" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showSignIn) {
      return <SignInScreen onBack={() => setShowSignIn(false)} />;
    }
    return <LandingPage onSignInClick={() => setShowSignIn(true)} />;
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
          {currentView === 'admin' && <AdminDashboard />}
          {currentView === 'charts' && <ChartGenerator />}
          {currentView === 'vocab' && <VocabDeck />}
        </main>
      </div>
      <ChatWidget />
      <PaywallModal />
    </div>
  );
}
