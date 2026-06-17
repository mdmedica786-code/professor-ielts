import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, Sparkles, Shield, Zap, MessageCircle } from 'lucide-react';

const plans = [
  {
    id: 'monthly',
    name: 'BandLogic Pro',
    price: 'Rs. 500',
    duration: '/month',
    description: 'Unlimited access to all AI evaluations and mock tests.',
    features: [
      'Unlimited Speaking mock tests',
      'Unlimited Writing evaluations',
      'Unlimited Reading & Listening generation',
      'Detailed examiner feedback',
      'Priority support'
    ]
  }
];

export default function UpgradeScreen() {
  const { user } = useAuth();
  const { setCurrentView } = useApp();

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
          Unlock unlimited IELTS evaluations. Pay easily using local payment methods in Pakistan.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
        {/* Pricing Card */}
        <div className="bg-white rounded-3xl p-8 border-2 border-brand-500 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            MOST POPULAR
          </div>
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{plans[0].name}</h3>
            <p className="text-slate-500 text-sm mb-6">{plans[0].description}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-extrabold text-slate-900">{plans[0].price}</span>
              <span className="text-slate-500 font-medium">{plans[0].duration}</span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {plans[0].features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                <span className="text-slate-600 text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-6">How to Upgrade</h3>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <h4 className="font-semibold text-slate-900">Send the Payment</h4>
                <p className="text-sm text-slate-500 mt-1">Send <strong>Rs. 500</strong> to the following account:</p>
                <div className="bg-white p-4 rounded-xl mt-3 border border-slate-200 text-sm">
                  <p><span className="text-slate-500">Easypaisa / JazzCash:</span> <strong className="text-slate-800">[Your Number]</strong></p>
                  <p className="mt-1"><span className="text-slate-500">Account Title:</span> <strong className="text-slate-800">[Your Name]</strong></p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <h4 className="font-semibold text-slate-900">Send Screenshot on WhatsApp</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Send a screenshot of the successful transaction along with your email address (<strong>{user?.email}</strong>) to our WhatsApp number.
                </p>
                <a 
                  href={`https://wa.me/923000000000?text=Hi,%20I%20have%20sent%20the%20payment%20for%20BandLogic%20Pro.%20My%20email%20is%20${user?.email}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold shadow-sm transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  Send Screenshot on WhatsApp
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
