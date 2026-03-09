import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowRight, CheckCircle, Code, Eye, XCircle, LayoutTemplate, X, Sparkles, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import PreviewFrame from './PreviewFrame';
import api from '../services/api';

const HtmlCssResult = ({ results, onBack }) => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'
    const [codeTab, setCodeTab] = useState('html'); // 'html', 'css', 'js'

    const [currentIndex, setCurrentIndex] = useState(0);

    // Store scores for ALL questions: { [index]: { structure, content, style, total } }
    const [allScores, setAllScores] = useState({});
    const [isScoring, setIsScoring] = useState(true);


    // Refs for ALL questions to run parallel/hidden analysis
    // Structure: refs.current[index] = { user: ref, correct: ref }
    const previewRefs = useRef({});

    // Visible refs for the current question
    const userPreviewRef = useRef(null);
    const correctPreviewRef = useRef(null);

    // --- Helper to parse code safely ---
    const parseCode = (raw) => {
        try {
            if (!raw) return { html: '', css: '', js: '' };
            if (typeof raw === 'object') return raw;
            return JSON.parse(raw);
        } catch (e) {
            if (typeof raw === 'string') return { html: raw, css: '', js: '' };
            return { html: '', css: '', js: '' };
        }
    };

    const parseAssets = (raw) => {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // Try pipe-separated if JSON fails (old format)
            try {
                return raw.split(',').map(item => {
                    const parts = item.trim().split('|');
                    return {
                        name: parts[0] || '',
                        path: parts[1] || parts[0] || ''
                    };
                }).filter(a => a.name);
            } catch (err) {
                return [];
            }
        }
        return [];
    };

    // Prepare data for all questions
    const questionsData = useMemo(() => {
        return results.questions.map(q => ({
            ...q,
            userCode: parseCode(q.submission?.submitted_code),
            correctCode: parseCode(q.reference_solution),
            assets: parseAssets(q.output_format)
        }));
    }, [results]);

    // Current displayed question
    const currentQuestion = questionsData[currentIndex];
    const currentScore = allScores[currentIndex] || { structure: 0, content: 0, style: 0, total: 0 };


    // Current question assets shorthand
    const currentAssets = currentQuestion?.assets || [];

    // --- ANALYSIS LOGIC ---
    const analyzeQuestion = useCallback((index) => {
        const refs = previewRefs.current[index];
        if (!refs || !refs.user?.current || !refs.correct?.current) return;

        const userWin = refs.user.current.getWindow();
        const correctWin = refs.correct.current.getWindow();

        if (!userWin || !correctWin || !userWin.document.body || !correctWin.document.body) return;

        const correctDoc = correctWin.document;
        const userDoc = userWin.document;
        const correctElements = Array.from(correctDoc.body.querySelectorAll('*'));

        if (correctElements.length === 0) {
            setAllScores(prev => ({ ...prev, [index]: { structure: 100, content: 100, style: 100, total: 100 } }));
            return;
        }

        let structurePoints = 0;
        let maxStructurePoints = 0;
        let contentPoints = 0;
        let maxContentPoints = 0;
        let stylePoints = 0;
        let maxStylePoints = 0;

        const usedUserElements = new Set();

        correctElements.forEach(correctEl => {
            maxStructurePoints += 1;

            // Find match
            const candidates = Array.from(userDoc.body.getElementsByTagName(correctEl.tagName));
            let bestMatch = null;
            let bestMatchScore = -1;

            candidates.forEach(cand => {
                if (usedUserElements.has(cand)) return;
                let s = 0;
                if (correctEl.id && cand.id === correctEl.id) s += 50;
                if (correctEl.className === cand.className) s += 20;
                if (correctEl.textContent.trim() === cand.textContent.trim()) s += 30;
                if (s > bestMatchScore) { bestMatchScore = s; bestMatch = cand; }
            });

            if (!bestMatch && candidates.length > 0) {
                bestMatch = candidates.find(c => !usedUserElements.has(c));
            }

            if (bestMatch) {
                usedUserElements.add(bestMatch);
                structurePoints += 1;
                // Content
                if (correctEl.children.length === 0 && correctEl.textContent.trim()) {
                    maxContentPoints += 1;
                    if (correctEl.textContent.trim() === bestMatch.textContent.trim()) contentPoints += 1;
                }

                // Style & Geometry
                const expandedStyles = ['display', 'color', 'background-color', 'font-size', 'margin', 'padding', 'border-radius', 'text-align'];
                maxStylePoints += expandedStyles.length + 4; // +4 for bounding box

                const cStyle = correctWin.getComputedStyle(correctEl);
                const uStyle = userWin.getComputedStyle(bestMatch);

                expandedStyles.forEach(p => {
                    if (cStyle.getPropertyValue(p) === uStyle.getPropertyValue(p)) stylePoints += 1;
                });

                const cRect = correctEl.getBoundingClientRect();
                const uRect = bestMatch.getBoundingClientRect();
                if (Math.abs(cRect.width - uRect.width) < 5) stylePoints += 1;
                if (Math.abs(cRect.height - uRect.height) < 5) stylePoints += 1;
                if (Math.abs(cRect.top - uRect.top) < 5) stylePoints += 1;
                if (Math.abs(cRect.left - uRect.left) < 5) stylePoints += 1;

            } else {
                if (correctEl.children.length === 0 && correctEl.textContent.trim()) maxContentPoints += 1;
                maxStylePoints += 12; // Penalty
            }
        });

        const calc = (pts, max) => max > 0 ? Math.round((pts / max) * 100) : 100;
        const sScore = calc(structurePoints, maxStructurePoints);
        const cScore = calc(contentPoints, maxContentPoints);
        const stScore = calc(stylePoints, maxStylePoints);
        const total = Math.round((sScore * 0.3) + (stScore * 0.5) + (cScore * 0.2));

        setAllScores(prev => ({
            ...prev,
            [index]: { structure: sScore, content: cScore, style: stScore, total }
        }));

    }, []);

    useEffect(() => {
        // Run analysis for ALL questions after a delay to let iframes load
        setIsScoring(true);
        const timer = setTimeout(() => {
            questionsData.forEach((_, idx) => {
                analyzeQuestion(idx);
            });
            setIsScoring(false);
        }, 3000); // 3 seconds to ensure all iframes rendered

        return () => clearTimeout(timer);
    }, [questionsData, analyzeQuestion]);


    // Calculate Overall Score
    const scoredQuestionsCount = Object.keys(allScores).length;
    const overallTotal = scoredQuestionsCount > 0
        ? Math.round(Object.values(allScores).reduce((acc, s) => acc + s.total, 0) / scoredQuestionsCount)
        : 0;

    const isOverallPass = overallTotal >= 70;

    // --- UI HELPERS ---
    const Donut = ({ score, color, label, subLabel, size = 'normal' }) => {
        const isPass = score >= 70;
        const statusColor = isPass ? 'text-green-600' : 'text-orange-500';

        // Size configurations
        const isSmall = size === 'small';
        const containerPadding = isSmall ? 'p-4' : 'p-6';
        const ringSize = isSmall ? 'w-20 h-20' : 'w-32 h-32';
        const strokeWidth = isSmall ? '8' : '12';
        const fontSizeStats = isSmall ? 'text-xl' : 'text-3xl';
        const fontSizeLabel = isSmall ? 'text-xs' : 'text-sm';
        const mb = isSmall ? 'mb-2' : 'mb-4';

        // SVG Params
        const center = isSmall ? 40 : 64;
        const radius = isSmall ? 34 : 54;
        const circumference = 2 * Math.PI * radius;

        return (
            <div className={`bg-white dark:bg-slate-800 ${containerPadding} rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center h-full`}>
                <div className={`relative ${ringSize} flex items-center justify-center ${mb}`}>
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx={center} cy={center} r={radius} className="stroke-gray-100 dark:stroke-slate-700" strokeWidth={strokeWidth} fill="none" />
                        <circle
                            cx={center} cy={center} r={radius}
                            className={color}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference - (circumference * score) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`${fontSizeStats} font-bold text-gray-800 dark:text-white`}>{score}%</span>
                        <span className={`text-[10px] font-bold uppercase mt-0.5 ${statusColor}`}>{isPass ? 'PASSED' : 'FAILED'}</span>
                    </div>
                </div>
                <h3 className={`font-bold text-gray-800 dark:text-white mb-0.5 ${isSmall ? 'text-xs' : ''}`}>{label}</h3>
                {subLabel && <p className={`${fontSizeLabel} text-gray-500 dark:text-gray-400`}>{subLabel}</p>}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 font-sans transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                {/* --- 1. HEADER --- */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 mb-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full xl:w-auto">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                                <LayoutTemplate size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Result Overview</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{results.session.course_title || 'Web Development Challenge'}</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block h-10 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>

                        {/* Tabs container - Segmented Control Style */}
                        <div className="flex p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700/50 w-full md:w-auto overflow-x-auto">
                            {questionsData.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${currentIndex === idx
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    Question {idx + 1}
                                </button>
                            ))}
                            <div className="w-px h-5 bg-gray-300 dark:bg-slate-600 mx-1 self-center"></div>
                            <button className="px-4 py-2 rounded-lg text-sm font-bold bg-gray-900 dark:bg-blue-600 text-white shadow-md hover:bg-gray-800 dark:hover:bg-blue-500 transition-all flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                Overall Result
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Score & Actions */}
                    <div className="flex items-center gap-5 w-full xl:w-auto justify-between xl:justify-end">
                        {/* LARGE OVERALL INDICATOR */}
                        <div className="flex flex-col items-end mr-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Score</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-3xl font-black ${isOverallPass ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
                                    {isScoring && scoredQuestionsCount < questionsData.length ? '...' : `${overallTotal}%`}
                                </span>
                                <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isOverallPass ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                    {isOverallPass ? 'PASSED' : 'FAILED'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleTheme}
                                className="p-3 rounded-xl bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                                title="Toggle Theme"
                            >
                                {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
                            </button>
                            <button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0">
                                Next Lesson <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- 2. MAIN CONTENT GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                    {/* Left: Question Info & Metrics */}
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-start h-full">
                            {/* Question Header */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-50 dark:bg-slate-700/50 rounded-lg text-blue-600 dark:text-blue-400">
                                    <LayoutTemplate size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Question {currentIndex + 1}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{currentQuestion.title}</p>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-5 font-normal">
                                {currentQuestion.description}
                            </p>

                            {/* Explanation Section */}
                            {currentQuestion.explanation && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl relative overflow-hidden mb-6">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Sparkles size={80} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                                <Sparkles size={16} className="text-blue-600 dark:text-blue-300" />
                                            </div>
                                            <h3 className="font-bold text-blue-900 dark:text-blue-100 text-xs tracking-wide uppercase">Explanation</h3>
                                        </div>
                                        <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                                            {currentQuestion.explanation}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Metrics inside the card */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-auto">
                                <Donut
                                    score={currentScore.structure}
                                    color="stroke-green-500"
                                    label="DOM CORRECTNESS"
                                    subLabel="Structure"
                                    size="small"
                                />
                                <Donut
                                    score={currentScore.content}
                                    color="stroke-indigo-400"
                                    label="TEXT SIMILARITY"
                                    subLabel="Content"
                                    size="small"
                                />
                                <Donut
                                    score={currentScore.style}
                                    color="stroke-orange-400"
                                    label="PIXEL SIMILARITY"
                                    subLabel="Style"
                                    size="small"
                                />
                            </div>
                        </div>

                        {/* Hidden Previews */}
                        <div style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                            {questionsData.map((q, idx) => (
                                <div key={`hidden-${idx}`}>
                                    <PreviewFrame
                                        ref={el => { if (!previewRefs.current[idx]) previewRefs.current[idx] = {}; previewRefs.current[idx].user = { current: el }; }}
                                        code={q.userCode}
                                        assets={q.assets}
                                    />
                                    <PreviewFrame
                                        ref={el => { if (!previewRefs.current[idx]) previewRefs.current[idx] = {}; previewRefs.current[idx].correct = { current: el }; }}
                                        code={q.correctCode}
                                        assets={q.assets}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Score, Tutor, Analysis */}
                    <div className="flex flex-col gap-5 h-full">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <Donut
                                score={currentScore.total}
                                color={currentScore.total >= 70 ? "stroke-green-500" : "stroke-orange-500"}
                                label={`QUESTION ${currentIndex + 1}`}
                                subLabel="RESULT SCORE"
                            />
                        </div>

                    </div>
                </div>

                {/* --- 3. COMPARISON & EDITOR SECTION --- */}
                < div className="mb-5 flex items-center justify-center gap-4" >
                    <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex">
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Eye size={16} /> Visual Preview
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'code' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Code size={16} /> Source Code
                        </button>
                    </div>
                </div >

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8 h-[500px]">
                    {/* --- USER OUTPUT PANEL --- */}
                    <div className="bg-[#1e293b] rounded-xl overflow-hidden shadow-lg flex flex-col border border-gray-700">
                        <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-gray-800">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">YOUR OUTPUT</span>
                                {viewMode === 'code' && (
                                    <div className="flex bg-[#1e293b] rounded-md overflow-hidden ml-4">
                                        {['html', 'css', 'javascript'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setCodeTab(lang === 'javascript' ? 'js' : lang)}
                                                className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${(lang === 'javascript' ? 'js' : lang) === codeTab
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-500 hover:text-gray-300'
                                                    }`}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {!isScoring && currentScore.total < 100 && (
                                <div className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded border border-red-500/30">
                                    Issues Found
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden bg-white relative">
                            <div style={{ width: '100%', height: '100%', display: viewMode === 'preview' ? 'block' : 'none' }}>
                                <PreviewFrame ref={userPreviewRef} code={currentQuestion.userCode} assets={currentAssets} isRestricted={true} />
                            </div>

                            {/* CODE EDITOR */}
                            <div className={`w-full h-full bg-[#1e293b] ${viewMode === 'code' ? 'block' : 'hidden'}`}>
                                <Editor
                                    height="100%"
                                    language={codeTab === 'js' ? 'javascript' : codeTab}
                                    value={currentQuestion.userCode[codeTab]}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        padding: { top: 16 },
                                        lineNumbers: 'on',
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- EXPECTED OUTPUT PANEL --- */}
                    <div className="bg-[#1e293b] rounded-xl overflow-hidden shadow-lg flex flex-col border border-gray-700">
                        <div className="bg-[#0f172a] px-4 py-3 flex items-center justify-between border-b border-gray-800">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">EXPECTED OUTPUT</span>
                                {viewMode === 'code' && (
                                    <div className="flex bg-[#1e293b] rounded-md overflow-hidden ml-4">
                                        {['html', 'css', 'javascript'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setCodeTab(lang === 'javascript' ? 'js' : lang)}
                                                className={`px-3 py-1 text-[10px] font-bold uppercase transition-colors ${(lang === 'javascript' ? 'js' : lang) === codeTab
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-500 hover:text-gray-300'
                                                    }`}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="bg-blue-500/20 p-1 rounded-full">
                                <CheckCircle size={14} className="text-blue-400" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden bg-white relative">
                            <div style={{ width: '100%', height: '100%', display: viewMode === 'preview' ? 'block' : 'none' }}>
                                <PreviewFrame ref={correctPreviewRef} code={currentQuestion.correctCode} assets={currentAssets} isRestricted={true} />
                            </div>

                            {/* CODE EDITOR */}
                            <div className={`w-full h-full bg-[#1e293b] ${viewMode === 'code' ? 'block' : 'hidden'}`}>
                                <Editor
                                    height="100%"
                                    language={codeTab === 'js' ? 'javascript' : codeTab}
                                    value={currentQuestion.correctCode[codeTab]}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        padding: { top: 16 },
                                        lineNumbers: 'on',
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div >

        </div>
    );
};

export default HtmlCssResult;
