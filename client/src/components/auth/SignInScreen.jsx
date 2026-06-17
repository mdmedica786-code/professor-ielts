import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BrandWordmark } from '../common/BrandLogo';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function SignInScreen({ onBack }) {
  const { signInWithGoogle, signInWithPhone } = useAuth();
  
  const [method, setMethod] = useState('select'); // 'select', 'phone'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Google sign in failed');
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    try {
      setLoading(true);
      setError('');
      // Basic formatting cleanup
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const result = await signInWithPhone(formattedNumber, 'recaptcha-container');
      setConfirmationResult(result);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to send OTP. Ensure phone number includes country code (e.g. +1).');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || !confirmationResult) return;

    try {
      setLoading(true);
      setError('');
      await confirmationResult.confirm(otpCode);
      // Auth state will change and this component will unmount
    } catch (err) {
      setLoading(false);
      setError('Invalid code. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 relative">
      {onBack && (
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>
      )}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="text-center">
            <BrandWordmark height={40} className="mx-auto" />
          <h2 className="mt-6 text-2xl font-extrabold text-slate-900">Sign in to BandLogic</h2>
          <p className="mt-2 text-sm text-slate-500">
            Decode your IELTS. Quantify your progress.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-xl border border-rose-100">
            {error}
          </div>
        )}

        {method === 'select' && (
          <div className="space-y-4 mt-8">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 shadow-sm bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  <path d="M1 1h22v22H1z" fill="none"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or</span>
              </div>
            </div>

            <button
              onClick={() => setMethod('phone')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 shadow-sm bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
            >
              Continue with Phone
            </button>
          </div>
        )}

        {method === 'phone' && !confirmationResult && (
          <form onSubmit={handleSendOtp} className="space-y-4 mt-8">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div id="recaptcha-container"></div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setMethod('select'); setError(''); }}
                className="flex-1 px-4 py-2 border border-slate-300 shadow-sm bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Code'}
              </button>
            </div>
          </form>
        )}

        {method === 'phone' && confirmationResult && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 mt-8">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700">
                Verification Code
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setConfirmationResult(null); setError(''); }}
                className="flex-1 px-4 py-2 border border-slate-300 shadow-sm bg-white rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !otpCode}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
