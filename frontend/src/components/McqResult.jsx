import React, { useState } from 'react';
import Layout from './Layout';
import { CheckCircle, XCircle, MessageSquare, Send, X } from 'lucide-react';
import api from '../services/api';
import AIAnalysisCard from './AIAnalysisCard';

const McqResult = ({ results, onBack }) => {
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
    const [showTutor, setShowTutor] = useState(false);
    const [tutorMessages, setTutorMessages] = useState([]);
    const [tutorInput, setTutorInput] = useState('');
    const [tutorLoading, setTutorLoading] = useState(false);

    const selectedQuestion = results.questions[selectedQuestionIndex];

    const fetchInitialHint = async () => {
        try {
            const response = await api.get(`/ai-tutor/hint/${results.session.id}`);
            if (response.data.hint) {
                setTutorMessages([{ role: 'assistant', content: response.data.hint }]);
            }
        } catch (error) {
            console.error('Failed to fetch initial hint:', error);
        }
    };

    const handleTutorSubmit = async (e) => {
        e.preventDefault();
        if (!tutorInput.trim() || tutorLoading) return;

        const userMessage = tutorInput.trim();
        setTutorInput('');
        setTutorMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setTutorLoading(true);

        try {
            const response = await api.post('/ai-tutor/chat', {
                sessionId: results.session.id,
                message: userMessage,
            });
            setTutorMessages((prev) => [
                ...prev,
                { role: 'assistant', content: response.data.message },
            ]);
        } catch (error) {
            console.error('Failed to get tutor response:', error);
            setTutorMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
            ]);
        } finally {
            setTutorLoading(false);
        }
    };

    // Calculate Score
    const correctCount = results.questions.filter(q => q.submission?.is_correct).length;
    const totalCount = results.questions.length;
    const scorePercentage = Math.round((correctCount / totalCount) * 100);
    const isPassing = scorePercentage >= 60; // MCQ passing threshold is 60%

    return (
        <Layout>
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">MCQ Results</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {results.session.course_title} - {results.session.level_title}
                        </p>
                    </div>
                    <button
                        onClick={onBack}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Back to Course
                    </button>
                </div>

                {/* Score Summary Card with Pass/Fail */}
                <div className={`mb-6 p-6 rounded-lg shadow-sm border-2 flex flex-col md:flex-row items-center justify-between gap-4 ${isPassing
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                    <div className="flex items-center gap-6">
                        {/* Pass/Fail Badge */}
                        <div className={`px-6 py-3 rounded-xl font-bold text-2xl shadow-md ${isPassing
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                            }`}>
                            {isPassing ? '✓ PASS' : '✗ FAIL'}
                        </div>

                        <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide text-xs">Total Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-bold ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {scorePercentage}%
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">({correctCount}/{totalCount} correct)</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center md:text-right">
                        <div className={`text-sm font-medium ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPassing
                                ? (scorePercentage >= 80 ? '🎉 Excellent work!' : '👍 Good effort!')
                                : '📚 Keep practicing! (60% needed to pass)'}
                        </div>
                    </div>
                </div>

                {/* AI Performance Analysis */}
                <div className="mb-8">
                    <AIAnalysisCard
                        sessionId={results.session.id}
                        score={scorePercentage}
                        isPass={isPassing}
                    />
                </div>

                {/* Question Navigation */}
                <div className="mb-6 flex gap-2 flex-wrap">
                    {results.questions.map((q, index) => {
                        const hasSubmission = !!q.submission;
                        const isCorrect = q.submission?.is_correct;

                        let buttonClass = '';
                        if (index === selectedQuestionIndex) {
                            buttonClass = 'bg-blue-600 text-white shadow-md';
                        } else if (!hasSubmission) {
                            // Not answered - amber/yellow
                            buttonClass = 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50';
                        } else if (isCorrect) {
                            // Correct answer - green
                            buttonClass = 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50';
                        } else {
                            // Wrong answer - red
                            buttonClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50';
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => setSelectedQuestionIndex(index)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${buttonClass}`}
                            >
                                Q{index + 1}
                                {!hasSubmission ? (
                                    <span className="text-amber-500">—</span>
                                ) : isCorrect ? (
                                    <CheckCircle size={16} />
                                ) : (
                                    <XCircle size={16} />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Question Detail Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                                {selectedQuestion.title}
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-6 text-lg leading-relaxed">
                                {selectedQuestion.description}
                            </p>

                            <div className="space-y-3">
                                {/* Show notice if question was not answered */}
                                {!selectedQuestion.submission && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg mb-4">
                                        <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                                            ⚠️ You did not answer this question
                                        </p>
                                    </div>
                                )}
                                {selectedQuestion.options && selectedQuestion.options.map((option) => {
                                    const isSelected = selectedQuestion.submission?.selected_option_id === option.id;
                                    const isCorrect = option.is_correct;

                                    let cardClass = "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700";
                                    let icon = null;

                                    if (isCorrect) {
                                        cardClass = "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/50 ring-1 ring-green-300 dark:ring-green-800/50";
                                        icon = <CheckCircle className="text-green-600 dark:text-green-400" size={20} />;
                                    } else if (isSelected && !isCorrect) {
                                        cardClass = "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800/50 ring-1 ring-red-300 dark:ring-red-800/50";
                                        icon = <XCircle className="text-red-600 dark:text-red-400" size={20} />;
                                    } else {
                                        cardClass = "bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600";
                                    }

                                    return (
                                        <div key={option.id} className={`p-4 rounded-lg border flex items-start gap-3 ${cardClass}`}>
                                            <div className="mt-0.5 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`font-medium ${isCorrect ? 'text-green-800 dark:text-green-300' : isSelected ? 'text-red-800 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {option.option_letter}. {option.option_text}
                                                    </span>
                                                    {icon}
                                                </div>
                                                {isCorrect && (
                                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">Correct Answer</p>
                                                )}
                                                {isSelected && !isCorrect && (
                                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">Your Answer</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Explanation Section */}
                        {selectedQuestion.explanation && (
                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1 bg-blue-100 dark:bg-blue-800 rounded-lg">
                                        <SparklesIcon className="text-blue-600 dark:text-blue-300" size={20} />
                                    </div>
                                    <h3 className="font-bold text-blue-900 dark:text-blue-300">Explanation</h3>
                                </div>
                                <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                                    {selectedQuestion.explanation}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Help & Info */}
                    <div className="space-y-4">
                        {/* Concepts Section */}
                        {selectedQuestion.concepts && (
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 shadow-sm">
                                <h3 className="font-semibold text-gray-800 dark:text-white mb-3 text-sm uppercase tracking-wide">Key Concepts</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(typeof selectedQuestion.concepts === 'string'
                                        ? JSON.parse(selectedQuestion.concepts)
                                        : selectedQuestion.concepts
                                    ).map((concept, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50 rounded-full text-sm font-medium">
                                            {concept}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg p-6 text-white shadow-md">
                            <h3 className="font-bold text-lg mb-2">Still confused?</h3>
                            <p className="text-blue-100 text-sm mb-4">
                                Our AI Tutor can explain this concept in simple terms.
                            </p>
                            <button
                                onClick={() => {
                                    setShowTutor(true);
                                    fetchInitialHint();
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors font-bold shadow-sm"
                            >
                                <MessageSquare size={18} />
                                Ask AI Tutor
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Tutor Chat Modal */}
                {showTutor && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden animate-fade-in-up">
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                        <MessageSquare className="text-blue-600 dark:text-blue-400" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800 dark:text-white">AI Tutor</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Always here to help</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTutor(false)}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-900/50">
                                {tutorMessages.length === 0 && (
                                    <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <MessageSquare className="text-blue-500 dark:text-blue-400" size={32} />
                                        </div>
                                        <p className="font-medium">Ask me anything about this question!</p>
                                        <p className="text-sm mt-1">I can explain why an option is correct or incorrect.</p>
                                    </div>
                                )}
                                {tutorMessages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white border border-gray-100 dark:border-slate-600 rounded-bl-none'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                {tutorLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl p-4 rounded-bl-none shadow-sm">
                                            <div className="flex gap-1.5">
                                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-100"></div>
                                                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-200"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                <form
                                    onSubmit={handleTutorSubmit}
                                    className="flex gap-2"
                                >
                                    <input
                                        type="text"
                                        value={tutorInput}
                                        onChange={(e) => setTutorInput(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-600 transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                        disabled={tutorLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!tutorInput.trim() || tutorLoading}
                                        className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                    >
                                        <Send size={20} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

// Helper icon component
function SparklesIcon({ size = 20, className = "" }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
    )
}

export default McqResult;
