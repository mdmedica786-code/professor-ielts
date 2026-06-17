import { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState('30');
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [loading, setLoading] = useState(false);

  // Security check: Only show to admin email
  if (user?.email !== 'mdmedica786@gmail.com') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Access Denied.</p>
      </div>
    );
  }

  const handleGrantPro = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setStatus(null);
      const { data } = await api.post('/admin/grant-pro', {
        email,
        days: parseInt(days, 10)
      });
      setStatus({ type: 'success', message: data.message });
      setEmail('');
    } catch (err) {
      console.error(err);
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.error || 'Failed to grant Pro access.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10 pb-24">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage user subscriptions and access.</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-xl">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Grant Pro Access</h2>
        
        {status && (
          <div className={`p-4 rounded-xl mb-6 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleGrantPro} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Student Email Address</label>
            <input
              type="email"
              required
              placeholder="student@example.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Duration (Days)</label>
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
            >
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="90">90 Days</option>
              <option value="365">365 Days</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3.5 bg-brand-600 text-white rounded-xl font-semibold shadow-sm hover:bg-brand-700 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {!loading && 'Grant Pro Status'}
          </button>
        </form>
      </div>
    </div>
  );
}
