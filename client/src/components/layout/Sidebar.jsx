import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Home, Mic, PenLine, BookOpenText, Headphones, History, ArrowLeft, X, Sparkles, LogOut, User, ShieldCheck, Crown, BookOpen } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export default function Sidebar() {
  const {
    section,
    setSection,
    currentView,
    setCurrentView,
    currentEvaluation,
    setCurrentEvaluation,
    sidebarOpen,
    closeSidebar,
  } = useApp();
  const { user, signOut } = useAuth();

  const [userPlan, setUserPlan] = useState('free');

  useEffect(() => {
    if (user) {
      api.get('/user/me')
        .then(res => {
          if (res.data?.success) {
            setUserPlan(res.data.plan);
          }
        })
        .catch(err => console.error("Failed to fetch plan:", err));
    } else {
      setUserPlan('free');
    }
  }, [user]);

  const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

  // Go to a section room (or the picker when id is null).
  const goSection = (id) => {
    setCurrentEvaluation(null);
    setCurrentView('practice');
    setSection(id);
    if (isMobile()) closeSidebar();
  };

  const goHistory = () => {
    setCurrentView('history');
    if (isMobile()) closeSidebar();
  };

  const goUpgrade = () => {
    window.dispatchEvent(new CustomEvent('navigate-upgrade'));
    if (isMobile()) closeSidebar();
  };

  const onPractice = currentView === 'practice';
  const navItems = [
    { id: 'home', icon: Home, label: 'Sections', active: onPractice && !section, onClick: () => goSection(null) },
    { id: 'speaking', icon: Mic, label: 'Speaking', active: onPractice && section === 'speaking', onClick: () => goSection('speaking') },
    { id: 'writing', icon: PenLine, label: 'Writing', active: onPractice && section === 'writing', onClick: () => goSection('writing') },
    { id: 'reading', icon: BookOpenText, label: 'Reading', active: onPractice && section === 'reading', onClick: () => goSection('reading') },
    { id: 'listening', icon: Headphones, label: 'Listening', active: onPractice && section === 'listening', onClick: () => goSection('listening') },
    { id: 'history', icon: History, label: 'History', active: currentView === 'history', onClick: goHistory },
    { id: 'vocab', icon: BookOpen, label: 'Vocabulary', active: currentView === 'vocab', onClick: () => { setCurrentView('vocab'); if (isMobile()) closeSidebar(); } },
  ];

  // Mobile: full-width glass drawer that slides in/out.
  // Desktop: floating glass rail, inset from the canvas edge, that toggles
  // between expanded (w-64) and a slim rail (w-[76px]).
  const widthCls = sidebarOpen ? 'w-64' : 'w-64 md:w-[76px]';
  const translateCls = sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0';
  const labelCls = sidebarOpen ? 'inline' : 'inline md:hidden';
  const justifyCls = sidebarOpen ? 'justify-start' : 'justify-start md:justify-center';

  return (
    <>
      {/* Backdrop (mobile drawer only) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col glass-panel
                    rounded-r-3xl md:rounded-2xl
                    transition-all duration-300 ease-in-out
                    md:static md:z-auto md:my-3 md:ml-3 md:shadow-float
                    ${widthCls} ${translateCls}`}
      >
        {/* Header / brand — clicking returns to the section picker */}
        <div className="flex items-center gap-2 h-14 md:h-16 px-4 border-b border-white/60 flex-shrink-0">
          <button
            onClick={() => goSection(null)}
            title="Sections"
            className="flex-shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Go to sections"
          >
            <BrandLogo size={36} />
          </button>
          <span className={`font-bold text-slate-900 text-sm tracking-tight truncate ${labelCls}`}>
            BandLogic
          </span>
          {sidebarOpen && (
            <button
              onClick={closeSidebar}
              className="ml-auto md:hidden btn-ghost p-1.5"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={item.onClick}
              title={item.label}
              className={`nav-pill ${justifyCls} ${item.active ? 'nav-pill-active' : ''}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={`text-sm font-medium ${labelCls}`}>{item.label}</span>
            </button>
          ))}

          {currentEvaluation && section === 'speaking' && (
            <button
              id="nav-back-to-practice"
              onClick={() => {
                setCurrentEvaluation(null);
                if (isMobile()) closeSidebar();
              }}
              title="Back to Practice"
              className={`nav-pill ${justifyCls}`}
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className={`text-sm font-medium ${labelCls}`}>Back</span>
            </button>
          )}
        </nav>

        {/* User profile & Upgrade (expanded only) */}
        {sidebarOpen && (
          <div className="p-3 border-t border-white/60 flex-shrink-0 space-y-2">
            {user?.email === 'mdmedica786@gmail.com' && (
              <button
                onClick={() => {
                  setCurrentView('admin');
                  if (isMobile()) closeSidebar();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white/80 hover:text-slate-900 transition-all duration-200"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Admin Panel</span>
              </button>
            )}
            {userPlan !== 'ultra' && (
              <button
                onClick={goUpgrade}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-bold text-white
                           bg-gradient-to-r from-brand-600 via-violet-500 to-fuchsia-500 bg-[length:200%_auto] animate-shimmer
                           shadow-glow-sm hover:shadow-glow transition-shadow"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro
              </button>
            )}
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/50 border border-white/70">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${userPlan !== 'free' ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                {userPlan !== 'free' ? <Crown className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {user?.email || user?.phoneNumber || "Student"}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider truncate ${userPlan === 'ultra' ? 'text-amber-600' : userPlan === 'pro' ? 'text-brand-600' : 'text-slate-500'}`}>
                  {userPlan === 'ultra' ? 'Ultra Plan' : userPlan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </div>
              </div>
              <button onClick={() => signOut()} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80" title="Sign Out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
