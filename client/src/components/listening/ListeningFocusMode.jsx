import { useState } from 'react';
import { ArrowRight, PlayCircle, Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function ListeningFocusMode({ onComplete }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [playing, setPlaying] = useState(false);
  
  // Hardcoded Test 1 questions for now since we built test_1.json manually
  const questions = [
    { num: 1, prompt: "Start of run: in front of the 1 ________________" },
    { num: 2, prompt: "Time of start: 2 ________________" },
    { num: 3, prompt: "Length of run: 3 ________________" },
    { num: 4, prompt: "At end of run: volunteer scans 4 ________________" },
    { num: 5, prompt: "Best way to register: on the 5 ________________" },
    { num: 6, prompt: "Cost of run: 6 £ ________________" },
    { num: 7, prompt: "Contact name: Pete 7 ________________" },
    { num: 8, prompt: "Phone number: 8 ________________" },
    { num: 9, prompt: "9 ________________ the runners" },
    { num: 10, prompt: "10 ________________ for the weekly report" }
  ];

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(q => q + 1);
    } else {
      onComplete(answers);
    }
  };

  const currentQ = questions[currentQuestion];
  // the mp3 snippets will be served from a local URL or github if we upload them
  // For now, since they are local, we'll assume they will be moved to the public folder.
  // Actually, we can serve them from the express server if we add a static route!
  const audioUrl = `http://localhost:3001/snippets/test_1/q${currentQuestion + 1}.mp3`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-800">Test 1 - Focus Mode</h2>
        <p className="text-slate-500 mt-2">Listen to the snippet and answer the single question below.</p>
      </div>

      <div className="card-padded">
        {/* Audio Player Snippet */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 mb-6 flex flex-col items-center">
          <audio 
            controls 
            src={audioUrl} 
            className="w-full"
            autoPlay
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        </div>

        {/* Question */}
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <div className="text-sm font-bold text-slate-400 mb-2">Question {currentQ.num} of 10</div>
          <p className="text-lg font-medium text-slate-800 mb-6">{currentQ.prompt}</p>
          
          <input
            autoFocus
            type="text"
            className="input-field w-full text-lg py-4"
            placeholder="Type your answer here..."
            value={answers[currentQ.num] || ''}
            onChange={e => setAnswers({ ...answers, [currentQ.num]: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleNext()}
          />
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={handleNext} className="btn-primary flex items-center gap-2">
            {currentQuestion === questions.length - 1 ? 'Finish Section' : 'Next Question'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
