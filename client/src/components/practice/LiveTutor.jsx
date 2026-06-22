import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Phone, Loader2, Sparkles, Activity } from 'lucide-react';
import api from '../../api/client';

export default function LiveTutor({ question, onEndSession }) {
  const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [errorMessage, setErrorMessage] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  
  const pcRef = useRef(null);
  const audioRef = useRef(null);
  const localStreamRef = useRef(null);
  const dataChannelRef = useRef(null);

  useEffect(() => {
    return () => stopSession();
  }, []);

  const startSession = async () => {
    try {
      setStatus('connecting');
      setErrorMessage('');

      // 1. Get Ephemeral Token
      const tokenRes = await api.post('/realtime/token');
      const EPHEMERAL_KEY = tokenRes.data.client_secret;

      // 2. Setup WebRTC Peer Connection with STUN/TURN for NAT traversal
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          // Add TURN server for symmetric NAT (replace with your own or a
          // provider like Twilio/Xirsys when scaling to production):
          // { urls: 'turn:your-turn-server.com:443', username: '...', credential: '...' },
        ],
      });
      pcRef.current = pc;

      // Setup audio element for remote stream
      audioRef.current = document.createElement("audio");
      audioRef.current.autoplay = true;
      pc.ontrack = e => {
        audioRef.current.srcObject = e.streams[0];
      };

      // 3. Get Local Microphone Audio
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;
      pc.addTrack(localStream.getTracks()[0]);

      // 4. Setup Data Channel for events
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;
      
      dc.addEventListener("message", (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'response.audio.delta') {
          setAiSpeaking(true);
        } else if (msg.type === 'response.done') {
          setAiSpeaking(false);
        } else if (msg.type === 'input_audio_buffer.speech_started') {
          setUserSpeaking(true);
        } else if (msg.type === 'input_audio_buffer.speech_stopped') {
          setUserSpeaking(false);
        }
      });

      dc.addEventListener("open", () => {
        // We can send an initial message to start the conversation!
        const event = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{
              type: 'input_text',
              text: `Hello! I am ready to practice. Please ask me this question: ${question?.topic || "Let's talk about my hobbies."}`
            }]
          }
        };
        dc.send(JSON.stringify(event));
        
        // Tell the AI to generate a response
        dc.send(JSON.stringify({ type: 'response.create' }));
      });

      // 5. Connect to OpenAI
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2024-12-17";
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) {
        throw new Error('Failed to connect to AI server');
      }

      const answer = { type: "answer", sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);
      
      setStatus('connected');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to start live session.');
      stopSession();
    }
  };

  const stopSession = () => {
    setStatus('disconnected');
    setAiSpeaking(false);
    setUserSpeaking(false);
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-xl border border-slate-800">
      
      {/* Background ambient glow when connected */}
      {status === 'connected' && (
        <div className={`absolute inset-0 bg-brand-500/10 transition-opacity duration-1000 ${aiSpeaking ? 'opacity-100' : 'opacity-30'}`}></div>
      )}

      <div className="z-10 text-center">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-400" />
          Live IELTS Tutor
        </h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          {status === 'disconnected' && "Start a real-time voice call. The tutor will listen, speak, and correct you instantly."}
          {status === 'connecting' && "Connecting to server..."}
          {status === 'connected' && !aiSpeaking && !userSpeaking && "Tutor is listening..."}
          {status === 'connected' && aiSpeaking && "Tutor is speaking..."}
          {status === 'connected' && userSpeaking && "You are speaking..."}
        </p>
      </div>

      {/* The pulsing orb */}
      <div className="z-10 relative flex items-center justify-center w-48 h-48">
        {status === 'connected' && (
          <>
            <div className={`absolute inset-0 rounded-full bg-brand-500/20 blur-xl transition-all duration-300 ${aiSpeaking ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`}></div>
            <div className={`absolute inset-4 rounded-full bg-brand-400/30 blur-md transition-all duration-200 ${aiSpeaking ? 'scale-110 opacity-100 animate-pulse' : 'scale-100 opacity-50'}`}></div>
            <div className={`absolute inset-8 rounded-full bg-brand-500/50 blur-sm transition-all duration-100 ${aiSpeaking ? 'scale-105 opacity-100' : 'scale-100 opacity-60'}`}></div>
          </>
        )}
        <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-300 ${status === 'connected' ? 'bg-brand-600 shadow-lg shadow-brand-500/50' : 'bg-slate-800 border border-slate-700'}`}>
          {status === 'connected' ? (
            aiSpeaking ? <Activity className="w-10 h-10 text-white animate-pulse" /> : <Mic className="w-10 h-10 text-white" />
          ) : (
            <MicOff className="w-10 h-10 text-slate-500" />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="z-10 flex gap-4 mt-8">
        {status === 'disconnected' || status === 'error' ? (
          <button
            onClick={startSession}
            className="flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-bold shadow-lg shadow-brand-600/30 transition-all hover:-translate-y-1"
          >
            <Phone className="w-5 h-5" />
            Start Live Call
          </button>
        ) : status === 'connecting' ? (
          <button disabled className="flex items-center gap-2 px-8 py-4 bg-slate-800 text-slate-300 rounded-full font-bold cursor-not-allowed">
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting...
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="flex items-center gap-2 px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold shadow-lg shadow-rose-600/30 transition-all hover:-translate-y-1"
          >
            <PhoneOff className="w-5 h-5" />
            End Call
          </button>
        )}
      </div>

      {status === 'error' && (
        <div className="z-10 mt-4 text-rose-400 text-sm bg-rose-900/20 px-4 py-2 rounded-lg">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
