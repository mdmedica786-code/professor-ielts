import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, User } from 'lucide-react';
import api from '../../api/client';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your BandLogic tutor. Need help with grammar, vocabulary, or rewriting a sentence? Just ask!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newHistory = [...messages, { role: 'user', content: userMessage }];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Send history excluding the first greeting to save tokens, or include it? 
      // Including it is fine, it's small.
      const { data } = await api.post('/chatbot/message', {
        message: userMessage,
        history: messages.filter(m => m.role !== 'system') // send visible history
      });
      
      if (data.success) {
        setMessages([...newHistory, { role: 'assistant', content: data.data.reply }]);
      }
    } catch (error) {
      console.error(error);
      setMessages([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 hover:scale-105 transition-all z-40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-40 animate-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-brand-600 text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Tutor Assistant</h3>
              <p className="text-xs text-brand-100">Grammar & Vocabulary Help</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="ml-auto p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-slate-200 text-slate-500' : 'bg-brand-100 text-brand-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 rounded-tl-sm shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for help..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
