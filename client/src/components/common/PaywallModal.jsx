import { useState, useEffect } from 'react';
import { Lock, Clock, Sparkles, X } from 'lucide-react';
import { adsAvailable, showRewardedAd } from '../../services/admob';
import { claimAdReward } from '../../api/ads';

export default function PaywallModal() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [rewardBusy, setRewardBusy] = useState(false);
  const [rewardMsg, setRewardMsg] = useState(null);

  useEffect(() => {
    const handlePaywall = (e) => {
      setDetails(e.detail);
      setRewardMsg(null);
      setOpen(true);
    };
    window.addEventListener('show-paywall', handlePaywall);
    return () => window.removeEventListener('show-paywall', handlePaywall);
  }, []);

  if (!open || !details) return null;

  // details: { error: string, retryAfterMs: number, upgradeRequired: boolean }
  const formatWaitTime = (ms) => {
    const hours = Math.ceil(ms / (60 * 60 * 1000));
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const watchAdForCredit = async () => {
    setRewardMsg(null);
    setRewardBusy(true);
    try {
      const earned = await showRewardedAd();
      if (!earned) {
        setRewardMsg('Ad was not completed — no reward this time.');
        return;
      }
      const res = await claimAdReward();
      setRewardMsg(res?.data?.message || 'You earned 1 free evaluation! Close this and try again.');
      setTimeout(() => { setOpen(false); setRewardMsg(null); }, 1600);
    } catch (err) {
      setRewardMsg(err?.response?.data?.error || 'Could not grant the reward. Please try again.');
    } finally {
      setRewardBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="relative p-6 text-center">
          <button 
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-sm mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Usage Limit Reached
          </h2>
          
          <p className="text-sm text-slate-600 mb-6 px-2">
            {details.error}
          </p>
          
          {details.retryAfterMs > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50 py-3 rounded-xl border border-amber-100 mb-6">
              <Clock className="w-4 h-4" />
              Next free evaluation in: {formatWaitTime(details.retryAfterMs)}
            </div>
          )}
          
          <div className="space-y-3">
            {adsAvailable() && (
              <button
                onClick={watchAdForCredit}
                disabled={rewardBusy}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-60 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {rewardBusy ? 'Loading ad…' : 'Watch an ad for 1 free evaluation'}
              </button>
            )}
            {rewardMsg && (
              <p className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg py-2 px-3">{rewardMsg}</p>
            )}
            <button
              onClick={() => {
                setOpen(false);
                // Dispatch event to navigate to upgrade screen if needed
                window.dispatchEvent(new CustomEvent('navigate-upgrade'));
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to Pro
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full py-3.5 px-4 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
