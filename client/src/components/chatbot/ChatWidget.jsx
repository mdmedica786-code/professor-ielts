import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, User, Mic, MicOff, ImagePlus, XCircle, Phone, PhoneOff, Volume2 } from 'lucide-react';
import api from '../../api/client';

import { useApp } from '../../context/AppContext';

export default function ChatWidget() {
  const { settings } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your BandLogic tutor. Need help with grammar, vocabulary, or rewriting a sentence? Just ask!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);

  // Voice call mode state
  const [isInCall, setIsInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const callActiveRef = useRef(false); // Track call state in ref for async callbacks
  const recordingTimerRef = useRef(null);
  const currentAudioRef = useRef(null); // Track currently playing audio for cleanup

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Text/Image Submission ────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || loading) return;

    const userMessage = input.trim();
    setInput('');
    const currentImage = imageFile;
    setImageFile(null);
    setError(null);

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

    const newHistory = [...messages, { 
      role: 'user', 
      content: userMessage || '(Image attached)', 
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
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Something went wrong.';
      setError(errMsg);
      setMessages([...newHistory, { role: 'assistant', content: `Sorry, I encountered an error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Voice Recording (single message) ─────────────────────────────
  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression
        } 
      });
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
        clearInterval(recordingTimerRef.current);
        setRecordingDuration(0);
        await sendVoiceMessage(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setError("Microphone access denied. Please allow access and try again.");
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
    setCallStatus('processing');
    const newHistory = [...messages, { role: 'user', content: '🎤 (Listening...)' }];
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
        const updatedHistory = [...messages, { role: 'user', content: `🎤 ${data.data.transcription}` }];
        const finalHistory = [...updatedHistory, { role: 'assistant', content: data.data.reply }];
        setMessages(finalHistory);

        // Play the TTS audio response
        if (data.data.audioBase64) {
          setCallStatus('speaking');
          const audioUrl = `data:audio/mp3;base64,${data.data.audioBase64}`;
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          
          audio.onended = () => {
            currentAudioRef.current = null;
            setCallStatus('idle');
            // If in call mode, auto-start recording for the next turn
            if (callActiveRef.current) {
              setTimeout(() => {
                if (callActiveRef.current) {
                  startRecordingForCall();
                }
              }, 500); // Small delay between turns
            }
          };
          
          audio.onerror = () => {
            currentAudioRef.current = null;
            setCallStatus('idle');
            if (callActiveRef.current) {
              setTimeout(() => {
                if (callActiveRef.current) {
                  startRecordingForCall();
                }
              }, 500);
            }
          };

          audio.play().catch(e => {
            console.error("Audio playback prevented:", e);
            currentAudioRef.current = null;
            setCallStatus('idle');
          });
        } else {
          setCallStatus('idle');
        }
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Voice processing failed.';
      setError(errMsg);
      setMessages(prev => [...prev.slice(0, -1), { role: 'user', content: '🎤 (Audio failed)' }, { role: 'assistant', content: `Sorry, I couldn't process your voice: ${errMsg}` }]);
      setCallStatus('idle');
      
      // If in call mode, try to continue despite error
      if (callActiveRef.current) {
        setTimeout(() => {
          if (callActiveRef.current) startRecordingForCall();
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Voice Call Mode (back-and-forth) ─────────────────────────────
  const startRecordingForCall = async () => {
    if (!callActiveRef.current) return;
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression
        } 
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordingTimerRef.current);
        setRecordingDuration(0);
        
        if (!callActiveRef.current) return; // Call was ended while recording
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) { // Only send if there's meaningful audio
          await sendVoiceMessage(audioBlob);
        } else {
          // Too short, restart listening
          if (callActiveRef.current) {
            setTimeout(() => startRecordingForCall(), 300);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setCallStatus('listening');
      
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Auto-stop after 30 seconds of silence prevention
      // (user can also manually tap to stop their turn)
    } catch (err) {
      console.error("Mic error in call mode:", err);
      setError("Microphone error. Call ended.");
      endCall();
    }
  };

  const startCall = async () => {
    setIsInCall(true);
    callActiveRef.current = true;
    setCallStatus('listening');
    
    // Add a system message indicating call started
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: "📞 Voice call started! I'm listening — speak whenever you're ready. Tap the stop button when you're done with your turn, and I'll respond." 
    }]);
    
    await startRecordingForCall();
  };

  const endCall = useCallback(() => {
    callActiveRef.current = false;
    setIsInCall(false);
    setCallStatus('idle');
    setRecordingDuration(0);
    
    // Stop any active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) { /* ignore */ }
    }
    setIsRecording(false);
    
    // Stop recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  const stopCallTurn = () => {
    // User taps to finish their turn during a call
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── Render ───────────────────────────────────────────────────────
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
        <div className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-3rem)] h-[550px] max-h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-40 animate-in slide-in-from-bottom-5 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-brand-600 text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Tutor Assistant</h3>
              <p className="text-xs text-brand-100">
                {isInCall 
                  ? callStatus === 'listening' ? '🔴 Listening...'
                    : callStatus === 'processing' ? '⏳ Thinking...'
                    : callStatus === 'speaking' ? '🔊 Speaking...'
                    : 'In Call'
                  : 'Voice, Image & Grammar Help'
                }
              </p>
            </div>
            <button onClick={() => { endCall(); setIsOpen(false); }} className="ml-auto p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
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
            {loading && !isInCall && (
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

          {/* Error Banner */}
          {error && (
            <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 flex items-center gap-2">
              <span className="text-xs text-rose-700 flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Voice Call Mode UI */}
          {isInCall && (
            <div className="px-4 py-4 bg-gradient-to-r from-brand-50 to-emerald-50 border-t border-brand-100">
              <div className="flex items-center justify-center gap-4">
                {/* Call status indicator */}
                <div className="flex flex-col items-center gap-2">
                  {callStatus === 'listening' && (
                    <>
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-rose-500 flex items-center justify-center animate-pulse shadow-lg shadow-rose-200">
                          <Mic className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
                          <span className="text-[10px] font-bold text-rose-600">{formatDuration(recordingDuration)}</span>
                        </div>
                      </div>
                      <button
                        onClick={stopCallTurn}
                        className="text-xs font-medium text-slate-600 bg-white px-3 py-1.5 rounded-full shadow-sm hover:bg-slate-50 transition-colors border border-slate-200"
                      >
                        Tap when done
                      </button>
                    </>
                  )}
                  {callStatus === 'processing' && (
                    <>
                      <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Thinking...</span>
                    </>
                  )}
                  {callStatus === 'speaking' && (
                    <>
                      <div className="w-14 h-14 rounded-full bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-200 animate-pulse">
                        <Volume2 className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Tutor speaking...</span>
                    </>
                  )}
                  {callStatus === 'idle' && isInCall && (
                    <>
                      <div className="w-14 h-14 rounded-full bg-slate-300 flex items-center justify-center shadow">
                        <Mic className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">Starting...</span>
                    </>
                  )}
                </div>

                {/* End call button */}
                <button
                  onClick={endCall}
                  className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-700 transition-colors hover:scale-105"
                  title="End call"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Image Preview Area */}
          {imageFile && !isInCall && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => {
                    setImageFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-0 right-0 p-0.5 bg-black/50 text-white rounded-bl-lg hover:bg-black/70"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-slate-500 font-medium truncate">{imageFile.name}</span>
            </div>
          )}

          {/* Input Area (hidden during call mode) */}
          {!isInCall && (
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

                {/* Start Voice Call button */}
                <button
                  type="button"
                  onClick={startCall}
                  disabled={loading}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
                  title="Start voice call"
                >
                  <Phone className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isRecording ? "Recording..." : "Ask for help..."}
                  disabled={isRecording || loading}
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
                    onClick={toggleRecording}
                    disabled={loading}
                    className={`absolute right-2 p-2 rounded-xl transition-all ${
                      isRecording 
                        ? 'bg-rose-500 text-white animate-pulse shadow-lg scale-110' 
                        : 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                    } disabled:opacity-50`}
                    title={isRecording ? "Stop recording" : "Record voice message"}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <div className="text-[10px] text-center text-slate-400 mt-2">
                {isRecording 
                  ? `Recording... ${formatDuration(recordingDuration)} — tap mic to stop`
                  : 'Tap 🎤 for voice · 📞 for voice call · 🖼️ for image'
                }
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
