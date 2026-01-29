import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowRight, CheckCircle, Code, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import PreviewFrame from './PreviewFrame';

const HtmlCssResult = ({ results, onBack }) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'code'

    // Detailed Scores
    const [scores, setScores] = useState({
        structure: 0,
        content: 0,
        style: 0,
        total: 0
    });
    const [isScoring, setIsScoring] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const userPreviewRef = useRef(null);
    const correctPreviewRef = useRef(null);

    // Extract current question data
    const question = results.questions[currentIndex];

    // Robust parsing for user code
    const userCode = useMemo(() => {
        if (!question?.submission?.submitted_code) return { html: '', css: '', js: '' };

        try {
            const raw = question.submission.submitted_code;
            // If already an object (MySQL JSON type or previously parsed), return it
            if (typeof raw === 'object' && raw !== null) return raw;
            // Otherwise parse it
            return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse user code:", e);
            // If it's a string but NOT JSON, might be direct HTML (old format)
            if (typeof question.submission.submitted_code === 'string') {
                return { html: question.submission.submitted_code, css: '', js: '' };
            }
            return { html: '', css: '', js: '' };
        }
    }, [question]);

    const correctCode = useMemo(() => {
        try {
            if (!question?.reference_solution) return { html: '', css: '', js: '' };
            const raw = question.reference_solution;
            if (typeof raw === 'object' && raw !== null) return raw;
            return JSON.parse(raw);
        } catch (e) {
            return { html: question.reference_solution || '', css: '', js: '' };
        }
    }, [question]);


    // Extract current question assets
    const currentAssets = useMemo(() => {
        if (!question?.output_format) return [];
        try {
            const parsed = JSON.parse(question.output_format);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // Silently fail or try alternative parsing
        }
        return [];
    }, [question]);

    // --- Robust "Smart Match" Scoring Logic ---
    const runAnalysis = () => {
        setIsScoring(true);
        // Wait for iframes (increased timeout for reliability)
        setTimeout(() => {
            try {
                const userWin = userPreviewRef.current?.getWindow();
                const correctWin = correctPreviewRef.current?.getWindow();

                if (!userWin || !correctWin) {
                    console.warn("Analysis: Iframe windows not ready");
                    setScores({ structure: 0, content: 0, style: 0, total: 0 });
                    setIsScoring(false);
                    return;
                }

                const userDoc = userWin.document;
                const correctDoc = correctWin.document;

                // Ensure body is loaded
                if (!userDoc.body || !correctDoc.body) {
                    console.warn("Analysis: Documents not fully loaded");
                    setIsScoring(false);
                    return;
                }

                const correctElements = Array.from(correctDoc.body.querySelectorAll('*'));
                console.log(`Analyzing: ${correctElements.length} elements to match`);

                if (correctElements.length === 0) {
                    setScores({ structure: 100, content: 100, style: 100, total: 100 });
                    setIsScoring(false);
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
                    maxStructurePoints += 1; // Base point for existence

                    // --- FIND BEST MATCH START ---
                    const candidates = Array.from(userDoc.body.getElementsByTagName(correctEl.tagName));

                    let bestMatch = null;
                    let bestMatchScore = -1;

                    candidates.forEach(cand => {
                        if (usedUserElements.has(cand)) return;

                        let currentScore = 0;
                        if (correctEl.id && cand.id === correctEl.id) currentScore += 50;

                        const cClasses = Array.from(correctEl.classList);
                        const uClasses = Array.from(cand.classList);
                        const intersection = cClasses.filter(c => uClasses.includes(c));
                        if (cClasses.length > 0) {
                            currentScore += (intersection.length / cClasses.length) * 20;
                        }

                        if (correctEl.children.length === 0 && correctEl.textContent.trim()) {
                            if (correctEl.textContent.trim() === cand.textContent.trim()) currentScore += 30;
                            else if (cand.textContent.includes(correctEl.textContent.trim())) currentScore += 10;
                        }

                        if (correctEl.parentElement && cand.parentElement && correctEl.parentElement.tagName === cand.parentElement.tagName) {
                            currentScore += 5;
                        }

                        if (currentScore > bestMatchScore) {
                            bestMatchScore = currentScore;
                            bestMatch = cand;
                        }
                    });

                    let userEl = bestMatch;
                    if (!userEl && candidates.length > 0) {
                        userEl = candidates.find(c => !usedUserElements.has(c));
                    }
                    // --- FIND BEST MATCH END ---

                    if (userEl) {
                        usedUserElements.add(userEl);

                        // Scored Match
                        structurePoints += 1;

                        const correctClasses = Array.from(correctEl.classList).sort().join(' ');
                        const userClasses = Array.from(userEl.classList).sort().join(' ');
                        if (correctClasses === userClasses) structurePoints += 0.5;
                        maxStructurePoints += 0.5;

                        // Content Check
                        if (correctEl.children.length === 0 && correctEl.textContent.trim().length > 0) {
                            maxContentPoints += 1;
                            const norm = (s) => s.replace(/\s+/g, ' ').trim();
                            if (norm(correctEl.textContent) === norm(userEl.textContent)) {
                                contentPoints += 1;
                            }
                        }

                        // --- PIXEL SIMILARITY / STYLE CHECK ---

                        // 1. Comprehensive CSS Properties
                        const expandedStyles = [
                            'display', 'position', 'color', 'background-color',
                            'font-size', 'font-family', 'font-weight', 'line-height', 'text-align', 'text-decoration',
                            'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                            'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                            'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
                            'border-radius', 'box-shadow', 'opacity',
                            'flex-direction', 'justify-content', 'align-items', 'flex-wrap', 'gap'
                        ];

                        maxStylePoints += expandedStyles.length;
                        const correctStyle = correctWin.getComputedStyle(correctEl);
                        const userStyle = userWin.getComputedStyle(userEl);

                        expandedStyles.forEach(prop => {
                            if (correctStyle.getPropertyValue(prop) === userStyle.getPropertyValue(prop)) {
                                stylePoints += 1;
                            }
                        });

                        // 2. Geometry Check (Bounding Box)
                        // Verifies: Width, Height, Absolute Position (Top, Left)
                        maxStylePoints += 4;
                        const correctRect = correctEl.getBoundingClientRect();
                        const userRect = userEl.getBoundingClientRect();
                        const tolerance = 2; // 2px tolerance

                        // Size
                        if (Math.abs(correctRect.width - userRect.width) <= tolerance) stylePoints += 1;
                        else if (correctRect.width > 0 && Math.abs(correctRect.width - userRect.width) / correctRect.width < 0.05) stylePoints += 1; // 5% diff

                        if (Math.abs(correctRect.height - userRect.height) <= tolerance) stylePoints += 1;
                        else if (correctRect.height > 0 && Math.abs(correctRect.height - userRect.height) / correctRect.height < 0.05) stylePoints += 1;

                        // Position (Layout)
                        if (Math.abs(correctRect.top - userRect.top) <= tolerance) stylePoints += 1;
                        if (Math.abs(correctRect.left - userRect.left) <= tolerance) stylePoints += 1;

                    } else {
                        // Missing element penalties
                        if (correctEl.children.length === 0 && correctEl.textContent.trim().length > 0) {
                            maxContentPoints += 1;
                        }
                        // Style penalties (max points increase but stylePoints don't)
                        // Styles + Geometry points
                        maxStylePoints += 34; // 30 styles + 4 geometry
                    }
                });

                const structureScore = maxStructurePoints > 0 ? Math.round((structurePoints / maxStructurePoints) * 100) : 100;
                const contentScore = maxContentPoints > 0 ? Math.round((contentPoints / maxContentPoints) * 100) : 100;
                const styleScoreVal = maxStylePoints > 0 ? Math.round((stylePoints / maxStylePoints) * 100) : 100;

                // Weighted Total: 30% Structure, 50% Style/Pixels, 20% Content
                const total = Math.round((structureScore * 0.3) + (styleScoreVal * 0.5) + (contentScore * 0.2));

                setScores({
                    structure: structureScore,
                    content: contentScore,
                    style: styleScoreVal,
                    total: total
                });
                setIsScoring(false);

            } catch (e) {
                console.error("Analysis failed", e);
                setIsScoring(false);
            }
        }, 2500);
    };

    useEffect(() => {
        runAnalysis();
    }, [userCode, correctCode]);

    const isPass = scores.total >= 80;
    const issueCount = Math.max(0, Math.ceil((100 - scores.total) / 10));

    const cardStyle = "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full";
    const circularProgress = (score, color = "text-blue-500") => (
        <div className="relative w-24 h-24 flex items-center justify-center mb-2">
            <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" className="stroke-gray-100" strokeWidth="8" fill="none" />
                <circle cx="48" cy="48" r="40" className={color} strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * score) / 100} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${color}`}>{score}%</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Result overview</h1>

                {results.questions.length > 1 && (
                    <div className="flex items-center justify-start gap-2 mb-6 bg-white p-2 rounded-xl border border-gray-200 w-fit">
                        {results.questions.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentIndex === idx ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                Question {idx + 1}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Question {currentIndex + 1}</h2>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{question.title}</h3>
                        <p className="text-gray-600 leading-relaxed mb-4">{question.description}</p>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Result</h2>
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" className="stroke-gray-100" strokeWidth="10" fill="none" />
                                <circle cx="64" cy="64" r="56" className={isPass ? "stroke-green-500" : "stroke-orange-500"} strokeWidth="10" fill="none" strokeDasharray="351.8" strokeDashoffset={351.8 - (351.8 * scores.total) / 100} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-black ${isPass ? "text-green-600" : "text-orange-500"}`}>{scores.total}%</span>
                                <span className={`text-sm font-bold uppercase mt-1 ${isPass ? "text-green-600" : "text-orange-500"}`}>{isPass ? "PASSED" : "FAILED"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mb-6">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex gap-2">
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${viewMode === 'preview' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Eye size={18} /> Visual Preview
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${viewMode === 'code' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <Code size={18} /> Source Code
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                    {/* User Side */}
                    <div className="bg-[#1e293b] rounded-2xl overflow-hidden shadow-lg flex flex-col h-[500px]">
                        <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between border-b border-gray-800">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Output</span>
                            {issueCount > 0 && !isPass && (
                                <div className="bg-red-500/10 text-red-400 text-xs px-3 py-1 rounded-full font-medium border border-red-500/20">{issueCount} ISSUES FOUND</div>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden bg-white relative">
                            <div style={{ width: '100%', height: '100%', display: viewMode === 'preview' ? 'block' : 'none' }}>
                                <PreviewFrame ref={userPreviewRef} code={userCode} assets={currentAssets} isRestricted={true} />
                            </div>
                            <div style={{ width: '100%', height: '100%', display: viewMode === 'code' ? 'block' : 'none' }}>
                                <div className="h-full grid grid-rows-2">
                                    <div className="relative h-full border-b border-gray-700">
                                        <span className="absolute right-2 top-2 text-xs text-gray-500 font-mono z-10">HTML</span>
                                        <Editor height="100%" defaultLanguage="html" value={userCode.html} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
                                    </div>
                                    <div className="relative h-full">
                                        <span className="absolute right-2 top-2 text-xs text-gray-500 font-mono z-10">CSS</span>
                                        <Editor height="100%" defaultLanguage="css" value={userCode.css} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Correct Side */}
                    <div className="bg-[#1e293b] rounded-2xl overflow-hidden shadow-lg flex flex-col h-[500px]">
                        <div className="bg-[#0f172a] px-6 py-4 flex items-center justify-between border-b border-gray-800">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Expected Output</span>
                            <div className="p-1 bg-blue-500 rounded-full"><CheckCircle size={14} className="text-white" /></div>
                        </div>
                        <div className="flex-1 overflow-hidden bg-white relative">
                            <div style={{ width: '100%', height: '100%', display: viewMode === 'preview' ? 'block' : 'none' }}>
                                <PreviewFrame ref={correctPreviewRef} code={correctCode} assets={currentAssets} isRestricted={true} />
                            </div>
                            <div style={{ width: '100%', height: '100%', display: viewMode === 'code' ? 'block' : 'none' }}>
                                <div className="h-full grid grid-rows-2">
                                    <div className="relative h-full border-b border-gray-700">
                                        <span className="absolute right-2 top-2 text-xs text-gray-500 font-mono z-10">HTML</span>
                                        <Editor height="100%" defaultLanguage="html" value={correctCode.html} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
                                    </div>
                                    <div className="relative h-full">
                                        <span className="absolute right-2 top-2 text-xs text-gray-500 font-mono z-10">CSS</span>
                                        <Editor height="100%" defaultLanguage="css" value={correctCode.css} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className={cardStyle}>
                        {isScoring ? (
                            <div className="h-24 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : (
                            circularProgress(scores.structure, "stroke-green-500 text-green-500")
                        )}
                        <h3 className="font-bold text-gray-900 mb-2">DOM CORRECTNESS</h3>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">Structure matches {scores.structure}%.</p>
                    </div>
                    <div className={cardStyle}>
                        {isScoring ? (
                            <div className="h-24 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : (
                            circularProgress(scores.content, "stroke-blue-500 text-blue-500")
                        )}
                        <h3 className="font-bold text-gray-900 mb-2">TEXT SIMILARITY</h3>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">Content matches {scores.content}%.</p>
                    </div>
                    <div className={cardStyle}>
                        {isScoring ? (
                            <div className="h-24 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : (
                            circularProgress(scores.style, "stroke-orange-400 text-orange-400")
                        )}
                        <h3 className="font-bold text-gray-900 mb-2">PIXEL SIMILARITY</h3>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-[200px]">Style matches computed layout.</p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 pb-12">
                    <button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-xl text-lg shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all transform hover:scale-105">
                        Continue to Next Lesson <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HtmlCssResult;
