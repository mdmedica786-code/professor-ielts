import { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import { BrandWordmark } from '../common/BrandLogo';
import { Loader2 } from 'lucide-react';

export default function NamePromptScreen({ onComplete }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError('');
      // Update the user's profile in Firebase
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      onComplete(); // Notify the parent to continue into the app
    } catch (err) {
      setLoading(false);
      setError('Failed to save name. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <BrandWordmark height={40} className="mx-auto" />
        <h2 className="mt-6 text-2xl font-extrabold text-slate-900 text-center">What should we call you?</h2>
        <p className="mt-2 text-sm text-slate-500 text-center">
          Please enter your name to personalize your experience.
        </p>
        
        {error && (
          <div className="mt-4 bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your First Name"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
