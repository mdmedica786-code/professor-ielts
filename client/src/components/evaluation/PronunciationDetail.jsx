import { useState } from 'react';
import phoneDescriptions from '../../utils/phoneDescriptions';
import { AudioWaveform, AlertCircle, Info } from 'lucide-react';

/**
 * Tab 6: Pronunciation Heatmap — the key differentiator.
 * Interactive word-by-word heatmap with phoneme-level drill-down.
 */
export default function PronunciationDetail({ evaluation }) {
  const [expandedWord, setExpandedWord] = useState(null);
  const ev = evaluation;
  const pData = ev.criteria?.p;
  const wordScores = pData?.phonemeScores || [];
  const mispronunciations = pData?.mispronunciations || [];

  const hasPronunciationData = wordScores.length > 0;

  if (!hasPronunciationData) {
    if (ev.pronunciationSource === 'intelligibility') {
      const band = ev.scores?.p ?? ev.criteria?.p?.band;
      const pc = ev.criteria?.p || {};
      const tone = band >= 7 ? 'text-emerald-600' : band >= 6 ? 'text-amber-600' : 'text-rose-600';
      return (
        <div className="space-y-5 animate-slide-up">
          <div className="card-padded">
            <div className="flex items-center gap-2 mb-3">
              <AudioWaveform className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900">Pronunciation — Intelligibility</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${tone}`}>{band != null ? Number(band).toFixed(1) : '—'}</span>
              <span className="text-xs text-slate-400">/ 9.0</span>
            </div>
            {(pc.good?.[0] || pc.weak?.[0]) && (
              <p className="text-sm text-slate-600 mt-2">{pc.good?.[0] || pc.weak?.[0]}</p>
            )}
            <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400 bg-slate-50 rounded-lg p-3">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
              <span>{pc.note}</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="card-padded text-center py-12 animate-slide-up">
        <AudioWaveform className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Pronunciation Heatmap</p>
        <p className="text-xs text-slate-400 mt-1">
          {ev.pronunciationSource === 'estimated'
            ? 'Phoneme-level pronunciation scoring is being upgraded to a more accurate engine and is temporarily disabled.'
            : ev.pronunciationSource === 'text_only'
            ? 'No audio was provided. Pronunciation was estimated from text only.'
            : ev.pronunciationSource === 'unavailable'
            ? 'The pronunciation pipeline was unavailable for this evaluation.'
            : 'Phoneme-level data is not available for this evaluation.'}
        </p>
        <p className="text-xs text-slate-400 mt-3">
          {ev.pronunciationSource === 'estimated'
            ? 'Your transcription, fluency, and band scores are unaffected. The pronunciation heatmap will return once the new engine is connected.'
            : 'To see the full pronunciation heatmap, record or upload audio and ensure the Python pronunciation pipeline is running.'}
        </p>
      </div>
    );
  }

  const getWordClass = (score) => {
    if (score > -2.0) return 'heatmap-good';
    if (score > -5.0) return 'heatmap-okay';
    return 'heatmap-poor';
  };

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header */}
      <div className="card-padded">
        <div className="flex items-center gap-2 mb-2">
          <AudioWaveform className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900">Pronunciation Heatmap</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Click any word to see phoneme-level scores. Colors indicate pronunciation quality.
        </p>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
            Good (GOP &gt; -2)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
            Acceptable (-5 to -2)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-rose-100 border border-rose-200" />
            Mispronounced (&lt; -5)
          </span>
        </div>
      </div>

      {/* Word Heatmap */}
      <div className="card-padded">
        <div className="flex flex-wrap">
          {wordScores.map((w, i) => (
            <span
              key={i}
              className={`heatmap-word ${getWordClass(w.score)}`}
              onClick={() => setExpandedWord(expandedWord === i ? null : i)}
              title={`GOP: ${w.score?.toFixed(2)}`}
            >
              {w.word}
            </span>
          ))}
        </div>

        {/* Expanded Phoneme View */}
        {expandedWord !== null && wordScores[expandedWord] && (
          <div className="mt-4 bg-slate-50 rounded-xl p-4 animate-scale-in">
            <h4 className="text-xs font-bold text-slate-800 mb-2">
              Phonemes in "{wordScores[expandedWord].word}"
              <span className="font-normal text-slate-400 ml-2">
                (Overall GOP: {wordScores[expandedWord].score?.toFixed(2)})
              </span>
            </h4>

            <div className="flex flex-wrap gap-2">
              {wordScores[expandedWord].phones?.map((p, j) => {
                const phoneKey = p.phone?.replace(/[0-9]/g, '');
                const desc = phoneDescriptions[phoneKey] || {};

                return (
                  <div
                    key={j}
                    className={`rounded-lg p-2 min-w-[70px] text-center border transition-all ${
                      p.status === 'good'
                        ? 'bg-emerald-50 border-emerald-200'
                        : p.status === 'acceptable'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}
                    title={desc.tip || ''}
                  >
                    <div className="text-xs font-mono font-bold text-slate-800">
                      {p.phone}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${
                      p.status === 'good' ? 'text-emerald-600' :
                      p.status === 'acceptable' ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {p.gop?.toFixed(1)}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {p.status}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Phone tip */}
            {wordScores[expandedWord].phones?.some(p => p.status === 'mispronounced') && (
              <div className="mt-3 flex items-start gap-2 bg-rose-50 rounded-lg p-2.5">
                <Info className="w-3 h-3 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-rose-700">
                  {wordScores[expandedWord].phones
                    .filter(p => p.status === 'mispronounced')
                    .map(p => {
                      const desc = phoneDescriptions[p.phone?.replace(/[0-9]/g, '')] || {};
                      return desc.tip ? `${desc.name || p.phone}: ${desc.tip}` : null;
                    })
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mispronunciation Summary */}
      {mispronunciations.length > 0 && (
        <div className="card-padded">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Mispronunciations ({mispronunciations.length})
            </h3>
          </div>

          <div className="space-y-2">
            {mispronunciations.map((m, i) => {
              const phoneKey = m.expected_phone?.replace(/[0-9]/g, '');
              const desc = phoneDescriptions[phoneKey] || {};

              return (
                <div key={i} className="flex items-start gap-3 bg-rose-50/50 rounded-xl p-3 border border-rose-100">
                  <div className="text-xs font-mono font-bold text-rose-600 bg-rose-100 rounded-lg px-2 py-1 flex-shrink-0">
                    {m.expected_phone}
                  </div>
                  <div>
                    <p className="text-xs text-slate-700">
                      <strong>"{m.word}"</strong> — expected{' '}
                      <span className="text-rose-600">{desc.name || m.expected_phone}</span>
                      {m.likely_produced && (
                        <>, likely produced <span className="text-amber-600">{m.likely_produced}</span></>
                      )}
                    </p>
                    {desc.tip && (
                      <p className="text-[11px] text-slate-500 mt-1">💡 {desc.tip}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fluency Stats */}
      {ev.fluency && Object.keys(ev.fluency).length > 0 && (
        <div className="card-padded">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Fluency Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ev.fluency.speech_rate_wpm && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg font-mono font-bold text-slate-800">
                  {Math.round(ev.fluency.speech_rate_wpm)}
                </div>
                <div className="label-caps">WPM</div>
              </div>
            )}
            {ev.fluency.total_pauses != null && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg font-mono font-bold text-slate-800">
                  {ev.fluency.total_pauses}
                </div>
                <div className="label-caps">Pauses</div>
              </div>
            )}
            {ev.fluency.long_pauses != null && (
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-lg font-mono font-bold text-slate-800">
                  {ev.fluency.long_pauses}
                </div>
                <div className="label-caps">Long Pauses</div>
              </div>
            )}
            {ev.fluency.note && (
              <div className="bg-slate-50 rounded-xl p-3 text-center flex items-center justify-center">
                <span className="text-xs font-medium text-slate-600">{ev.fluency.note}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
