import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, User, Mic, ImagePlus, XCircle } from 'lucide-react';
import api from '../../api/client';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your BandLogic tutor. Need help with grammar, vocabulary, or rewriting a sentence? Just ask!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle Text/Image Submission
  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || loading) return;

    const userMessage = input.trim();
    setInput('');
    const currentImage = imageFile;
    setImageFile(null); // Clear preview

    const newHistory = [...messages, { 
      role: 'user', 
      content: userMessage, 
      imageUrl: currentImage ? URL.createObjectURL(currentImage) : null 
    }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const formData = new FormData();
      if (userMessage) formData.append('message', userMessage);
      if (currentImage) formData.append('image', currentImage);
      
      const serverHistory = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));
      formData.append('history', JSON.stringify(serverHistory));

      const { data } = await api.post('/chatbot/message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
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

  // Handle Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await sendVoiceMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Please allow microphone access to use voice chat.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
    setLoading(true);
    // Optimistically add an audio placeholder
    const newHistory = [...messages, { role: 'user', content: '🎤 (Audio message)' }];
    setMessages(newHistory);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      
      const serverHistory = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role,
        content: m.content
      }));
      formData.append('history', JSON.stringify(serverHistory));

      const { data } = await api.post('/chatbot/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (data.success) {
        // Update user message with actual transcription
        const updatedHistory = [...messages, { role: 'user', content: `🎤 ${data.data.transcription}` }];
        setMessages([...updatedHistory, { role: 'assistant', content: data.data.reply }]);

        // Play the TTS audio response automatically
        if (data.data.audioBase64) {
          const audioUrl = `data:audio/mp3;base64,${data.data.audioBase64}`;
          const audio = new Audio(audioUrl);
          audio.play().catch(e => console.error("Audio playback prevented:", e));
        }
      }
    } catch (error) {
      console.error(error);
      setMessages([...newHistory, { role: 'assistant', content: 'Sorry, I encountered an error processing your voice. Please try again.' }]);
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
              <p className="text-xs text-brand-100">Voice, Image & Grammar Help</p>
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
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-2 object-cover" />
                  )}
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

          {/* Image Preview Area */}
          {imageFile && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setImageFile(null)}
                  className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-lg hover:bg-black/70"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-slate-500 font-medium truncate">{imageFile.name}</span>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white">
            <div className="relative flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setImageFile(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
                title="Attach Image"
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRecording ? "Listening..." : "Ask for help..."}
                disabled={isRecording}
                className="flex-1 min-w-0 pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm disabled:opacity-50 disabled:bg-slate-100"
              />
              
              {/* If user typed text or attached an image, show Send button. Otherwise show Mic. */}
              {(input.trim() || imageFile) ? (
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={loading}
                  className={`absolute right-2 p-2 rounded-xl transition-all ${
                    isRecording 
                      ? 'bg-rose-500 text-white animate-pulse shadow-lg scale-110' 
                      : 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                  } disabled:opacity-50`}
                  title="Hold to talk"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="text-[10px] text-center text-slate-400 mt-2">
              Hold the microphone to talk, or attach an image.
            </div>
          </form>
        </div>
      )}
    </>
  );
}
