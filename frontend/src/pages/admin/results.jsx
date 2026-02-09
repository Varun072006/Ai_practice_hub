
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Search, Download, X, CheckCircle, XCircle, ChevronRight, Copy, Clock, Edit } from 'lucide-react';

const StudentResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, pass, fail

    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
    const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('user');
    const [copied, setCopied] = useState(false);

    // Edit user modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editName, setEditName] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        fetchResults();
    }, [searchTerm]);

    const fetchResults = async () => {
        try {
            const response = await api.get(`/admin/results?search=${searchTerm}`);
            setResults(response.data);
        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    // Handle opening edit modal
    const handleEditClick = (result, e) => {
        e.stopPropagation(); // Prevent row click
        setEditingUser(result);
        setEditName(result.student_name);
        setShowEditModal(true);
    };

    // Handle saving user name
    const handleSaveEdit = async () => {
        if (!editingUser || !editName.trim()) return;

        setSavingEdit(true);
        try {
            await api.put(`/admin/users/${editingUser.user_id}`, { name: editName.trim() });
            // Update local state
            setResults(results.map(r =>
                r.user_id === editingUser.user_id
                    ? { ...r, student_name: editName.trim() }
                    : r
            ));
            setShowEditModal(false);
            setEditingUser(null);
            alert('User name updated successfully!');
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Failed to update user name');
        } finally {
            setSavingEdit(false);
        }
    };

    const filteredResults = results.filter(result => {
        if (filter === 'all') return true;
        return result.status.toLowerCase() === filter;
    });

    const getStatusColor = (status) => {
        return status === 'Pass'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    };

    const getScoreColor = (score) => {
        if (score >= 75) return 'text-green-600 dark:text-green-400 font-bold';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 font-semibold';
        return 'text-red-600 dark:text-red-400 font-semibold';
    };

    const handleExportCSV = () => {
        if (filteredResults.length === 0) {
            alert('No data to export.');
            return;
        }

        const headers = ['Student ID', 'Student Name', 'Date & Time', 'Course', 'Level', 'Test Type', 'Score (%)', 'Status'];
        const csvRows = filteredResults.map(result => [
            result.student_id || 'N/A',
            result.student_name,
            result.date_time ? new Date(result.date_time).toLocaleString() : 'N/A',
            result.course,
            result.level,
            result.test_type,
            result.score !== undefined ? result.score : 'N/A',
            result.status
        ]);

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `student_results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle clicking on status badge to open modal
    const handleStatusClick = async (result) => {
        setSelectedSession(result);
        setLoadingDetails(true);
        setSelectedQuestionIndex(0);
        setSelectedTestCaseIndex(0);
        setActiveTab('user');

        try {
            const response = await api.get(`/admin/results/${result.session_id}`);
            setSessionDetails(response.data);
        } catch (error) {
            console.error('Failed to fetch session details:', error);
            alert('Failed to load session details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeModal = () => {
        setSelectedSession(null);
        setSessionDetails(null);
    };

    const handleCopyCode = () => {
        if (!sessionDetails) return;
        const selectedQuestion = sessionDetails.questions[selectedQuestionIndex];
        const code = activeTab === 'user'
            ? selectedQuestion?.submission?.submitted_code
            : selectedQuestion?.reference_solution;
        if (code) {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Render the detail modal content
    const renderDetailModal = () => {
        if (!selectedSession) return null;

        const selectedQuestion = sessionDetails?.questions?.[selectedQuestionIndex];
        const testResults = selectedQuestion?.test_results || [];
        const passedCount = testResults.filter(tr => tr.passed).length;
        const selectedTestCase = testResults[selectedTestCaseIndex] || null;
        const currentCode = activeTab === 'user'
            ? selectedQuestion?.submission?.submitted_code || ''
            : selectedQuestion?.reference_solution || '';
        const codeLines = currentCode.split('\n');

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Session Results - {selectedSession.student_name}
                            </h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
                                {selectedSession.course} • {selectedSession.level} • {selectedSession.test_type}
                            </p>
                        </div>
                        <button
                            onClick={closeModal}
                            className="p-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X size={28} />
                        </button>
                    </div>

                    {loadingDetails ? (
                        <div className="flex-1 flex items-center justify-center p-12">
                            <div className="text-gray-500 dark:text-gray-400">Loading session details...</div>
                        </div>
                    ) : sessionDetails ? (
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Panel - Questions & Test Cases */}
                            <div className="w-2/5 border-r border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
                                {/* Question Tabs */}
                                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                                    <div className="flex gap-3 flex-wrap">
                                        {sessionDetails.questions.map((q, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setSelectedQuestionIndex(index);
                                                    setSelectedTestCaseIndex(0);
                                                }}
                                                className={`px-5 py-2.5 rounded-lg text-base font-semibold transition-colors ${index === selectedQuestionIndex
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : q.submission?.is_correct
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                                                    }`}
                                            >
                                                Q{index + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Conditional: Score Summary (MCQ/HTML/CSS) OR Test Cases List (Coding) */}
                                {(() => {
                                    const sessionType = sessionDetails?.session?.session_type;
                                    const courseTitle = sessionDetails?.session?.course_title?.toLowerCase() || '';
                                    const isHtmlCss = courseTitle.includes('html') || courseTitle.includes('css');
                                    const isMcq = sessionType === 'mcq';
                                    const showScoreSummary = isMcq || isHtmlCss;

                                    if (isMcq) {
                                        // MCQ Score Display - show correct/incorrect count
                                        const totalQuestions = sessionDetails?.questions?.length || 0;
                                        const correctAnswers = sessionDetails?.questions?.filter(q => q.submission?.is_correct).length || 0;
                                        const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
                                        const isPassing = percentage >= 60;

                                        return (
                                            <div className="flex-1 overflow-y-auto">
                                                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                                                    <span className="font-bold text-gray-900 dark:text-white text-base">MCQ Score</span>
                                                </div>
                                                <div className="p-6">
                                                    {/* Score Circle */}
                                                    <div className="flex flex-col items-center justify-center mb-6">
                                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${isPassing
                                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                            }`}>
                                                            <span className={`text-4xl font-bold ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {percentage}%
                                                            </span>
                                                        </div>
                                                        <p className={`text-lg font-semibold mt-3 ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {isPassing ? 'PASSED' : 'FAILED'}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            Passing threshold: 60%
                                                        </p>
                                                    </div>

                                                    {/* Score Details */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                                            <div className="flex items-center gap-3">
                                                                <CheckCircle className="text-green-500" size={20} />
                                                                <span className="font-medium text-green-700 dark:text-green-300">Correct</span>
                                                            </div>
                                                            <span className="text-lg font-bold text-green-700 dark:text-green-300">
                                                                {correctAnswers}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                            <div className="flex items-center gap-3">
                                                                <XCircle className="text-red-500" size={20} />
                                                                <span className="font-medium text-red-700 dark:text-red-300">Incorrect</span>
                                                            </div>
                                                            <span className="text-lg font-bold text-red-700 dark:text-red-300">
                                                                {totalQuestions - correctAnswers}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                                                            <div className="flex items-center gap-3">
                                                                <span className="w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                                                                <span className="font-medium text-gray-700 dark:text-gray-300">Total Questions</span>
                                                            </div>
                                                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                                                {totalQuestions}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (isHtmlCss) {
                                        // HTML/CSS Score Display - show DOM, Text, Pixel similarity for selected question
                                        const submission = selectedQuestion?.submission;
                                        const isQuestionPassed = submission?.is_correct === true || submission?.is_correct === 1;

                                        // The detailed scores (structure, content, style) are calculated client-side
                                        // and not stored in the database. Use fallback based on is_correct status:
                                        // - If passed: show 100% for all metrics (meets 80% threshold)
                                        // - If failed: show estimated lower scores
                                        const scores = submission?.scores || {};
                                        const domScore = scores.structure || scores.dom || (isQuestionPassed ? 100 : 0);
                                        const textScore = scores.content || scores.text || (isQuestionPassed ? 100 : 0);
                                        const pixelScore = scores.style || scores.pixel || (isQuestionPassed ? 100 : 0);

                                        // Calculate final score: if stored use it, otherwise derive from is_correct
                                        const storedFinalScore = scores.total || submission?.score;
                                        const finalScore = storedFinalScore !== undefined && storedFinalScore !== null
                                            ? storedFinalScore
                                            : (isQuestionPassed ? 100 : 0);
                                        const isPassing = isQuestionPassed || finalScore >= 80;

                                        const getScoreColor = (score) => {
                                            if (score >= 80) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' };
                                            if (score >= 50) return { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800' };
                                            return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' };
                                        };

                                        return (
                                            <div className="flex-1 overflow-y-auto">
                                                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                                                    <span className="font-bold text-gray-900 dark:text-white text-base">HTML/CSS Score</span>
                                                </div>
                                                <div className="p-6">
                                                    {/* Final Score Circle */}
                                                    <div className="flex flex-col items-center justify-center mb-6">
                                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${isPassing
                                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                            : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                            }`}>
                                                            <span className={`text-4xl font-bold ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {finalScore}%
                                                            </span>
                                                        </div>
                                                        <p className={`text-lg font-semibold mt-3 ${isPassing ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {isPassing ? 'PASSED' : 'FAILED'}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            Passing threshold: 80%
                                                        </p>
                                                    </div>

                                                    {/* Score Breakdown */}
                                                    <div className="space-y-3">
                                                        {/* DOM Correctness */}
                                                        <div className={`p-4 rounded-lg border ${getScoreColor(domScore).bg} ${getScoreColor(domScore).border}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-200">DOM Correctness</span>
                                                                <span className={`text-xl font-bold ${getScoreColor(domScore).text}`}>{domScore}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full ${domScore >= 80 ? 'bg-green-500' : domScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${domScore}%` }}
                                                                ></div>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">HTML structure & elements</p>
                                                        </div>

                                                        {/* Text Similarity */}
                                                        <div className={`p-4 rounded-lg border ${getScoreColor(textScore).bg} ${getScoreColor(textScore).border}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-200">Text Similarity</span>
                                                                <span className={`text-xl font-bold ${getScoreColor(textScore).text}`}>{textScore}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full ${textScore >= 80 ? 'bg-green-500' : textScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${textScore}%` }}
                                                                ></div>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Content & text matching</p>
                                                        </div>

                                                        {/* Pixel Similarity */}
                                                        <div className={`p-4 rounded-lg border ${getScoreColor(pixelScore).bg} ${getScoreColor(pixelScore).border}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-200">Pixel Similarity</span>
                                                                <span className={`text-xl font-bold ${getScoreColor(pixelScore).text}`}>{pixelScore}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full ${pixelScore >= 80 ? 'bg-green-500' : pixelScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${pixelScore}%` }}
                                                                ></div>
                                                            </div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">CSS styling & visual layout</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        // Coding - show test cases
                                        return (
                                            <div className="flex-1 overflow-y-auto">
                                                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                                                    <span className="font-bold text-gray-900 dark:text-white text-base">Test Cases</span>
                                                    <span className={`text-base font-bold px-3 py-1 rounded-full ${passedCount === testResults.length && testResults.length > 0 ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-red-600 bg-red-100 dark:bg-red-900/30'}`}>
                                                        {passedCount}/{testResults.length} Passed
                                                    </span>
                                                </div>
                                                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                                    {testResults.length > 0 ? testResults.map((testResult, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setSelectedTestCaseIndex(index)}
                                                            className={`w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${selectedTestCaseIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                                                                }`}
                                                        >
                                                            {testResult.passed ? (
                                                                <CheckCircle className="text-green-500 shrink-0" size={24} />
                                                            ) : (
                                                                <XCircle className="text-red-500 shrink-0" size={24} />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-900 dark:text-white text-base">
                                                                    Test Case {testResult.test_case_number}
                                                                    {testResult.is_hidden ? ' (Hidden)' : ''}
                                                                </p>
                                                            </div>
                                                            <ChevronRight className="text-gray-400 shrink-0" size={16} />
                                                        </button>
                                                    )) : (
                                                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                            No test results available
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>

                            {/* Right Panel - Question & Code */}
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Question Header */}
                                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedQuestion?.title}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                {selectedQuestion?.description}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shrink-0 shadow-sm ${selectedQuestion?.submission?.is_correct
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300 dark:border-green-700'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-300 dark:border-red-700'
                                            }`}>
                                            <span className={`w-3 h-3 rounded-full animate-pulse ${selectedQuestion?.submission?.is_correct ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            {selectedQuestion?.submission?.is_correct ? 'PASSED' : 'FAILED'}
                                        </span>
                                    </div>

                                    {/* Test Case Details */}
                                    {selectedTestCase && (
                                        <div className="grid grid-cols-3 gap-3 mt-3">
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Input</label>
                                                <div className="mt-1 p-2 bg-gray-50 dark:bg-slate-900 rounded-lg font-mono text-xs text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 max-h-20 overflow-y-auto">
                                                    {selectedTestCase.input_data || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Expected</label>
                                                <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg font-mono text-xs text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 max-h-20 overflow-y-auto">
                                                    {selectedTestCase.expected_output || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</label>
                                                <div className={`mt-1 p-2 rounded-lg font-mono text-xs border max-h-20 overflow-y-auto ${selectedTestCase.passed
                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                                                    }`}>
                                                    {selectedTestCase.actual_output || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* MCQ Options Display (for MCQ questions) */}
                                {selectedQuestion?.question_type === 'mcq' ? (
                                    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-900">
                                        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Answer Options</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {selectedQuestion?.submission?.is_correct
                                                    ? 'Student selected the correct answer'
                                                    : 'Student selected an incorrect answer'}
                                            </p>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            <div className="space-y-3">
                                                {selectedQuestion?.options?.map((option, index) => {
                                                    const isCorrect = option.is_correct;
                                                    const isSelected = selectedQuestion?.submission?.selected_option_id === option.id;

                                                    let bgClass = 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700';
                                                    let textClass = 'text-gray-800 dark:text-gray-200';
                                                    let iconElement = null;

                                                    if (isCorrect && isSelected) {
                                                        bgClass = 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600';
                                                        textClass = 'text-green-800 dark:text-green-200';
                                                        iconElement = <CheckCircle className="text-green-500 shrink-0" size={24} />;
                                                    } else if (isCorrect && !isSelected) {
                                                        bgClass = 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600';
                                                        textClass = 'text-green-800 dark:text-green-200';
                                                        iconElement = <CheckCircle className="text-green-500 shrink-0" size={24} />;
                                                    } else if (!isCorrect && isSelected) {
                                                        bgClass = 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600';
                                                        textClass = 'text-red-800 dark:text-red-200';
                                                        iconElement = <XCircle className="text-red-500 shrink-0" size={24} />;
                                                    }

                                                    return (
                                                        <div
                                                            key={option.id}
                                                            className={`flex items-start gap-4 p-4 rounded-xl border-2 ${bgClass} transition-all`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${isCorrect
                                                                ? 'bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300'
                                                                : isSelected
                                                                    ? 'bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300'
                                                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                                                                }`}>
                                                                {option.option_letter || String.fromCharCode(65 + index)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-base font-medium ${textClass}`}>
                                                                    {option.option_text}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    {isCorrect && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                                                                            <CheckCircle size={12} />
                                                                            Correct Answer
                                                                        </span>
                                                                    )}
                                                                    {isSelected && (
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${isCorrect
                                                                            ? 'bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300'
                                                                            : 'bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300'
                                                                            }`}>
                                                                            Student's Choice
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {iconElement && (
                                                                <div className="shrink-0">
                                                                    {iconElement}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* MCQ Footer */}
                                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} />
                                                <span>Submitted {selectedQuestion?.submission?.submitted_at ? new Date(selectedQuestion.submission.submitted_at).toLocaleString() : 'N/A'}</span>
                                            </div>
                                            <span className="text-purple-600 dark:text-purple-400 font-semibold uppercase">MCQ</span>
                                        </div>
                                    </div>
                                ) : (
                                    /* Code Viewer (for Coding questions) */
                                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
                                        {/* Tab Bar */}
                                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setActiveTab('user')}
                                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'user'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-gray-400 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    Student's Code
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('solution')}
                                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'solution'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'text-gray-400 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    Correct Solution
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleCopyCode}
                                                className="p-2 text-gray-400 hover:text-white transition-colors"
                                                title="Copy code"
                                            >
                                                {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                                            </button>
                                        </div>

                                        {/* Code Content */}
                                        <div className="flex-1 overflow-auto p-4">
                                            <table className="w-full">
                                                <tbody>
                                                    {codeLines.map((line, index) => (
                                                        <tr key={index}>
                                                            <td className="text-slate-500 text-right pr-4 select-none font-mono text-sm w-8 align-top">
                                                                {index + 1}
                                                            </td>
                                                            <td className="text-gray-200 font-mono text-sm whitespace-pre">
                                                                {line || ' '}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Code Footer */}
                                        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700 bg-slate-800/50 text-xs text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} />
                                                <span>Submitted {selectedQuestion?.submission?.submitted_at ? new Date(selectedQuestion.submission.submitted_at).toLocaleString() : 'N/A'}</span>
                                            </div>
                                            <span className="text-blue-400 uppercase">{selectedQuestion?.submission?.language || 'Unknown'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-12">
                            <div className="text-red-500">Failed to load session details</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Student Results</h1>
                        <p className="text-gray-600 dark:text-slate-400">Track and analyze student performance across all courses</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                        <div className="relative flex-1 w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or course..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                            />
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                            >
                                <option value="all">All Status</option>
                                <option value="pass">Passed</option>
                                <option value="fail">Failed</option>
                            </select>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                <Download size={18} />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                                    <th className="px-6 py-4">Student ID</th>
                                    <th className="px-6 py-4">Student Name</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Course</th>
                                    <th className="px-6 py-4">Level</th>
                                    <th className="px-6 py-4">Test Type</th>
                                    <th className="px-6 py-4">Score</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                            Loading results...
                                        </td>
                                    </tr>
                                ) : filteredResults.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                            No results found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResults.map((result, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-slate-400">
                                                {result.student_id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                                                        {result.student_name.substring(0, 2)}
                                                    </div>
                                                    <span className="font-medium text-gray-800 dark:text-white">{result.student_name}</span>
                                                    <button
                                                        onClick={(e) => handleEditClick(result, e)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                        title="Edit student name"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                                                {new Date(result.date_time).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-800 dark:text-white font-medium">
                                                {result.course}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                                                {result.level}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${result.test_type === 'MCQ'
                                                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                    }`}>
                                                    {result.test_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm ${getScoreColor(result.score)}`}>
                                                    {result.score !== undefined ? `${result.score}%` : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleStatusClick(result)}
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(result.status)}`}
                                                >
                                                    {result.status.toUpperCase()}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                        <span>Showing {filteredResults.length} results</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-700 dark:text-slate-300" disabled>Previous</button>
                            <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-700 dark:text-slate-300" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Render Modal */}
            {renderDetailModal()}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden border dark:border-slate-700">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Edit Student Name</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                Update the name for {editingUser.student_name}
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Student Name
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                                    placeholder="Enter student name"
                                    autoFocus
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingUser(null);
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                                    disabled={savingEdit}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={savingEdit || !editName.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default StudentResults;
