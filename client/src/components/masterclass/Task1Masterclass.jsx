import React, { useState, useEffect } from 'react';
import { task1Data as DATA } from '../../data/masterclassTask1Data';
import './masterclass.css';

const CHART_LABELS = {
    line: 'Line Graph',
    bar: 'Bar Chart',
    pie: 'Pie Chart',
    table: 'Table',
    map: 'Map',
    process: 'Process',
    mixed: 'Mixed'
};

const DEFAULT_BAND_1 = '7.0';
const DEFAULT_BAND_2 = '9.0';

export default function Task1Masterclass() {
    const [currentVisual, setCurrentVisual] = useState('line');
    const [currentScenario, setCurrentScenario] = useState(0);
    const [isCompare, setIsCompare] = useState(false);
    const [band1, setBand1] = useState(DEFAULT_BAND_1);
    const [band2, setBand2] = useState(DEFAULT_BAND_2);
    const [modalData, setModalData] = useState(null);

    const D = DATA[currentVisual];
    const scenario = D.scenarios[currentScenario];

    const switchVisual = (type) => {
        setCurrentVisual(type);
        setCurrentScenario(0);
    };

    const toggleDiagnostics = (contentId) => {
        const el = document.getElementById(contentId);
        if (el) {
            const isHidden = el.classList.contains('hidden');
            if (isHidden) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    };

    const openModal = (type, title, text) => {
        setModalData({ title, text });
    };
    
    const closeModal = () => setModalData(null);

    return (
        <div className="flex h-full w-full bg-slate-50 relative overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-white tracking-tight">Task 1</h1>
                    <p className="text-sm text-slate-500 mt-1">Masterclass UI</p>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    {Object.entries(CHART_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => switchVisual(key)}
                            className={`nav-btn ${currentVisual === key ? 'active' : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
                    
                    {/* Scenario Tabs */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {D.scenarios.map((sc, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentScenario(idx)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${currentScenario === idx ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                            >
                                {sc.scenarioLabel || `Scenario ${idx + 1}`}
                            </button>
                        ))}
                    </div>

                    {/* Prompt Area */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-semibold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {CHART_LABELS[currentVisual]}
                            </span>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-[1fr_400px] gap-8 items-start">
                            <div>
                                <p className="text-lg text-slate-900 leading-relaxed font-medium mb-6">
                                    {scenario.prompt}
                                </p>
                            </div>
                            <div className="visual-frame border border-slate-200 rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                                <img src={scenario.image || ''} alt={CHART_LABELS[currentVisual]} className="w-full h-auto object-contain max-h-[300px]" />
                            </div>
                        </div>
                    </div>

                    {/* Diagnostics & Vocab */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Diagnostics */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button onClick={() => toggleDiagnostics('diagnostics-content')} className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                                    Prompt Diagnostics
                                </h3>
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <div id="diagnostics-content" className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 hidden">
                                <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100/50">
                                    <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Subject</div>
                                    <div className="text-sm text-slate-700">{scenario.diagnostics.subject}</div>
                                </div>
                                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100/50">
                                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Timeframe & Tense</div>
                                    <div className="text-sm text-slate-700">{scenario.diagnostics.timeframe}</div>
                                </div>
                                <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100/50">
                                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Units</div>
                                    <div className="text-sm text-slate-700">{scenario.diagnostics.units}</div>
                                </div>
                                <div className="p-4 rounded-lg bg-rose-50/50 border border-rose-100/50">
                                    <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Macro Trend</div>
                                    <div className="text-sm text-slate-700">{scenario.diagnostics.macro_trend}</div>
                                </div>
                            </div>
                        </div>

                        {/* Vocabulary */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button onClick={() => toggleDiagnostics('vocab-content')} className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left border-b border-slate-200">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                                    Target Vocabulary
                                </h3>
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <div id="vocab-content" className="p-6 hidden">
                                <div className="flex flex-col gap-2">
                                    {scenario.vocabulary.map((v, i) => (
                                        <div key={i} className="px-3 py-2 rounded-md text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            <strong>{v.word || v}</strong> {v.definition ? `: ${v.definition}` : ''}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tools */}
                    <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input type="checkbox" checked={isCompare} onChange={(e) => setIsCompare(e.target.checked)} className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
                            Compare Bands
                        </label>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">Band 1:</span>
                            <select value={band1} onChange={(e) => setBand1(e.target.value)} className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                {Object.keys(scenario.bands).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        {isCompare && (
                            <div className="flex items-center gap-2 ml-4">
                                <span className="text-sm font-medium text-slate-600">Band 2:</span>
                                <select value={band2} onChange={(e) => setBand2(e.target.value)} className="text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                    {Object.keys(scenario.bands).map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Essays */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                        {/* Pane 1 */}
                        <EssayPane 
                            band={band1} 
                            sentences={scenario.bands[band1]} 
                            openModal={openModal} 
                        />
                        
                        {/* Pane 2 */}
                        {isCompare && (
                            <EssayPane 
                                band={band2} 
                                sentences={scenario.bands[band2]} 
                                openModal={openModal} 
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modalData && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">{modalData.title}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <p className="text-slate-600 whitespace-pre-line">{modalData.text}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EssayPane({ band, sentences, openModal }) {
    const STRUCT_LABELS = {
        intro: 'Introduction',
        overview: 'Overview',
        body1: 'Body Paragraph 1',
        body2: 'Body Paragraph 2',
        conclusion: 'Conclusion'
    };

    // Group sentences by structure label
    const groups = {};
    sentences.forEach(s => {
        // Task 1 structure labels vary, but we can default to the raw label
        let key = s.label.toLowerCase().replace(/\s+/g, '');
        if (s.label === 'Body 1') key = 'body1';
        if (s.label === 'Body 2') key = 'body2';
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex justify-between items-center flex-shrink-0">
                <span className="font-bold text-slate-800">Band {band} Response</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Analysis Mode</span>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                {Object.entries(groups).map(([label, sents], i) => (
                    <div key={i} className="essay-container">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            {STRUCT_LABELS[label] || label}
                            <div className="h-px bg-slate-100 flex-1"></div>
                        </div>
                        <p className="text-[1.05rem] leading-[2.2] text-slate-700">
                            {sents.map((s, j) => (
                                <span 
                                    key={j} 
                                    className={`sentence type-${s.type} cursor-pointer transition-colors duration-200 mr-1`}
                                    onClick={() => openModal(s.type, s.type.toUpperCase() + ' Analysis', s.text)}
                                >
                                    {s.text}
                                </span>
                            ))}
                        </p>
                    </div>
                ))}
            </div>
            <div className="bg-slate-50 border-t border-slate-100 p-4">
                <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Structure</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Lexical</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>Grammar</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Cohesion</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>Data Integration</span>
                </div>
            </div>
        </div>
    );
}
