import { useState } from 'react';
import { Sparkles, Check, Loader2 } from 'lucide-react';
import api from '../../api/client';

export default function UpgradeScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckout = async (plan) => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.post('/payments/checkout', { plan });
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('Failed to start checkout');
      }
    } catch (err) {
      console.error(err);
      setError('Could not start checkout. Please try again later.');
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Pro',
      price: '$9.99',
      interval: '/month',
      description: 'Unlimited access to all AI evaluations.',
      features: [
        'Unlimited Speaking Evaluations',
        'Unlimited Writing Evaluations',
        'Unlimited Reading & Listening tests',
        'Priority AI processing',
      ]
    },
    {
      id: 'sprint',
      name: '7-Day Sprint',
      price: '$4.99',
      interval: ' / one-time',
      description: 'Perfect for last-minute exam prep.',
      features: [
        '7 days of unlimited access',
        'All Pro features included',
        'No recurring billing',
      ]
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Upgrade to BandLogic Pro
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Get unlimited AI evaluations across all four skills and fast-track your IELTS preparation.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 max-w-2xl mx-auto text-center">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col hover:border-brand-300 hover:shadow-md transition-all">
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
              
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                <span className="text-slate-500 font-medium">{plan.interval}</span>
              </div>

              <ul className="space-y-4 flex-1 mb-8">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex gap-3 text-slate-700">
                    <Check className="w-5 h-5 text-brand-500 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Select {plan.name}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
