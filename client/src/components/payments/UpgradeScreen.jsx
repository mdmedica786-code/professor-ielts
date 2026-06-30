import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Sparkles, Shield, Zap, MessageCircle } from 'lucide-react';
import { createCheckout } from '../../api/payments';

const plans = [
  {
    id: 'pro-daily',
    name: 'BandLogic Pro (Daily)',
    price: '30,000',
    currency: 'UZS',
    duration: '/day',
    description: '10 requests. Great for a quick intensive practice session.',
    features: [
      '10 evaluations for 24 hours',
      'Detailed examiner feedback',
      'Access to all sections'
    ]
  },
  {
    id: 'pro-weekly',
    name: 'BandLogic Pro (Weekly)',
    price: '100,000',
    currency: 'UZS',
    duration: '/week',
    description: '10 requests daily. Perfect for short-term consistent prep.',
    features: [
      '10 daily evaluations',
      'Detailed examiner feedback',
      'Priority support',
      'Access to all sections'
    ]
  },
  {
    id: 'ultra-monthly',
    name: 'BandLogic Ultra',
    price: '250,000',
    currency: 'UZS',
    duration: '/month',
    description: '30 requests daily. For intense, power-user prep.',
    features: [
      '30 daily evaluations',
      'Ultra-detailed examiner feedback',
      'Top priority support',
      'Access to all sections'
    ]
  }
];

export default function UpgradeScreen() {
  const { user } = useAuth();
  const { setCurrentView } = useApp();

  const payOnline = async (plan) => {
    try {
      const res = await createCheckout(plan);
      if (res?.data?.url) window.location.href = res.data.url;
    } catch (e) {
      alert('Could not start online checkout. Please use the manual method below.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 pb-24">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center justify-center p-3 bg-brand-100 text-brand-600 rounded-2xl mb-6 shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
          Upgrade to BandLogic Pro
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Unlock your true IELTS potential. Pay easily using local payment methods in Uzbekistan.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto mb-16">
        {/* Pricing Cards */}
        {plans.map((plan, index) => (
          <div key={plan.id} className={`bg-white rounded-3xl p-8 border-2 shadow-xl relative overflow-hidden ${index === 1 ? 'border-brand-500 scale-105 z-10' : 'border-slate-200'}`}>
            {index === 1 && (
              <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
            )}
            
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p className="text-slate-500 text-sm mb-6">{plan.description}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-900">{plan.price}</span>
                <span className="text-slate-500 font-medium">{plan.currency}{plan.duration}</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                  <span className="text-slate-600 text-sm leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto mb-8 text-center">
        <button
          onClick={() => payOnline('monthly')}
          className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-sm transition-all"
        >
          <Zap className="w-5 h-5" /> Pay online by card (Visa/Mastercard)
        </button>
        <p className="text-xs text-slate-400 mt-2">International cards — instant activation. Local users can use the manual method below.</p>
      </div>

      <div className="max-w-3xl mx-auto mb-8">
        {/* Remove Ads — cheaper one-time option that keeps full free usage */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-3xl p-6 border border-emerald-200 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Just want to remove ads?</h3>
            <p className="text-sm text-slate-600">Keep practicing for free, without ads. A one-time upgrade — Pro plans are already ad-free.</p>
          </div>
          <a
            href={`https://t.me/Nerd_medica?text=Hi,%20I%20want%20to%20Remove%20Ads%20on%20BandLogic.%20My%20email%20is%20${user?.email}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm transition-all"
          >
            <Shield className="w-5 h-5" />
            Remove Ads
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Payment Instructions */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6">How to Upgrade</h3>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <h4 className="font-semibold text-slate-900">Send the Payment</h4>
                <p className="text-sm text-slate-500 mt-1">Send the corresponding amount to the following Humo card:</p>
                <div className="bg-white p-4 rounded-xl mt-3 border border-slate-200 text-sm">
                  <p><span className="text-slate-500">Humo Card:</span> <strong className="text-slate-800 text-lg tracking-wider">9860 1201 2498 1347</strong></p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <h4 className="font-semibold text-slate-900">Send Screenshot on Telegram</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Send a screenshot of the successful transaction along with your email address (<strong>{user?.email}</strong>) and the plan you selected to our Telegram.
                </p>
                <a 
                  href={`https://t.me/Nerd_medica?text=Hi,%20I%20have%20sent%20the%20payment%20for%20BandLogic.%20My%20email%20is%20${user?.email}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#0088cc] hover:bg-[#0077b3] text-white rounded-xl font-bold shadow-sm transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send Screenshot on Telegram (@Nerd_medica)
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">3</div>
              <div>
                <h4 className="font-semibold text-slate-900">Pro Account Activated</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Your account will be upgraded manually within a few hours, and you will get unlimited access!
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
