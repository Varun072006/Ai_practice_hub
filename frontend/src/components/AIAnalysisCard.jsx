import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

const AIAnalysisCard = ({ sessionId, score, isPass }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                // Add a small artificial delay to let the user see the "AI thinking" state (UX)
                await new Promise(resolve => setTimeout(resolve, 800));

                const response = await api.get(`/ai-tutor/analysis/${sessionId}`);
                setAnalysis(response.data);
            } catch (err) {
                console.error('Failed to fetch AI analysis:', err);
                setError('Failed to generate analysis. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) {
            fetchAnalysis();
        }
    }, [sessionId]);

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-400">
                <AlertTriangle size={20} />
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="ml-auto text-xs underline hover:no-underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    // --- LOADING STATE (SHIMMER) ---
    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg"></div>
                    <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-100 dark:bg-slate-700/50 rounded w-full"></div>
                    <div className="h-4 bg-gray-100 dark:bg-slate-700/50 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-100 dark:bg-slate-700/50 rounded w-4/6"></div>
                </div>
            </div>
        );
    }

    if (!analysis) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm transition-all duration-300">
            {/* Header */}
            <div
                className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800/30 flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-600 dark:text-blue-300">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg">AI Performance Review</h3>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Personalized Feedback</p>
                    </div>
                </div>
                <button className="text-gray-500 dark:text-gray-400">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-6 space-y-6">
                    {/* Main Analysis */}
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                            {analysis.analysis}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Key Improvements */}
                        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 border border-orange-100 dark:border-orange-800/30">
                            <h4 className="flex items-center gap-2 font-bold text-orange-800 dark:text-orange-300 mb-3 text-sm uppercase tracking-wide">
                                <AlertTriangle size={16} /> Areas for Improvement
                            </h4>
                            <ul className="space-y-2">
                                {analysis.suggestions.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Next Steps / Strengths */}
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                            <h4 className="flex items-center gap-2 font-bold text-green-800 dark:text-green-300 mb-3 text-sm uppercase tracking-wide">
                                <TrendingUp size={16} /> {isPass ? 'Next Steps' : 'Recommended Focus'}
                            </h4>
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-300 mt-0.5">
                                    <Lightbulb size={16} />
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                    {analysis.nextSteps}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAnalysisCard;
