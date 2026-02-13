import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Clock, CheckCircle, ChevronLeft, Trophy, Lightbulb, X, Sun, Moon, Terminal, Play, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import CodeEditor from "../components/CodeEditor";
import PreviewFrame from "../components/PreviewFrame";
import api from "../services/api";

export default function HtmlCssChallenge() {
    const { courseId, levelId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const [session, setSession] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState({ html: "", css: "", js: "" });
    const [userCodeByQuestion, setUserCodeByQuestion] = useState({});
    const [expectedCode, setExpectedCode] = useState({ html: "", css: "", js: "" });
    const [expectedCodeByQuestion, setExpectedCodeByQuestion] = useState({});
    const [assetsByQuestion, setAssetsByQuestion] = useState({});
    const [previewTab, setPreviewTab] = useState("live");
    const [showInstructions, setShowInstructions] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState(null);
    const [timeLeft, setTimeLeft] = useState(3600);
    const [autoSubmitted, setAutoSubmitted] = useState(false);

    const previewRef = useRef();
    const expectedPreviewRef = useRef();
    const [fullScreenView, setFullScreenView] = useState(null);

    // AI Hint state
    const [hint, setHint] = useState(null);
    const [loadingHint, setLoadingHint] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [hintAttemptCount, setHintAttemptCount] = useState(1);

    // JS/Terminal State
    const [isNodeJS, setIsNodeJS] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [runError, setRunError] = useState(null);

    // Start session on mount
    useEffect(() => {
        startSession();
    }, [courseId, levelId]);

    // Timer countdown
    useEffect(() => {
        if (!session) return;

        if (timeLeft <= 0 && !autoSubmitted) {
            handleFinish(true);
            return;
        }

        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, session, autoSubmitted]);

    // Auto-save every 30 seconds
    useEffect(() => {
        if (!session?.questions?.length) return;

        const autoSaveInterval = setInterval(() => {
            autoSaveProgress();
        }, 30000);

        return () => clearInterval(autoSaveInterval);
    }, [session, code, userCodeByQuestion]);

    const startSession = async () => {
        try {
            // Determine type from state or assume based on ID/context if not present
            // But we default to 'html-css-challenge' in most cases unless specified
            let sessionType = location.state?.sessionType || 'html-css-challenge';

            // Check if it's a JS/Node course - this logic might need refinement based on exact course titles
            // For now relying on sessionType passed from StartPractice or checking course title later
            const response = await api.post('/sessions/start', {
                courseId,
                levelId,
                sessionType: sessionType,
            });
            const sessionData = response.data;

            // If no questions, show message and go back
            if (!sessionData.questions || sessionData.questions.length === 0) {
                alert('No questions available for this level. Please add questions before starting a session.');
                navigate(`/courses/${courseId}/levels`);
                return;
            }

            setSession(sessionData);

            // Determine if this is a JS/NodeJS challenge based on course title or question type
            const isJs = sessionData.course_title?.toLowerCase().includes('javascript') ||
                sessionData.course_title?.toLowerCase().includes('js') ||
                sessionData.questions[0]?.challengeType === 'nodejs'; // Assuming challengeType exists

            setIsNodeJS(isJs);
            if (isJs) {
                setPreviewTab("terminal");
            }

            // Attempt to recover from localStorage
            const storageKey = `htmlcss_${courseId}_${levelId}`;
            const stored = localStorage.getItem(storageKey);
            let recoveredData = null;
            if (stored) {
                try {
                    recoveredData = JSON.parse(stored);
                } catch (e) {
                    console.error("Failed to parse stored code", e);
                }
            }

            // Initialize code and expected code for the first question
            const initialQuestionIndex = recoveredData?.currentQuestionIndex || 0;
            setCurrentQuestionIndex(initialQuestionIndex);

            // Parse User Initial Code
            const initialUserCodeMap = recoveredData?.userCodeByQuestion || {};
            setUserCodeByQuestion(initialUserCodeMap);

            const currentCode = recoveredData?.code || initialUserCodeMap[initialQuestionIndex] || { html: '', css: '', js: '' };
            setCode(currentCode);

            // Parse expected code and assets
            const expectedCodeMap = {};
            const assetsMap = {};
            sessionData.questions.forEach((q, idx) => {
                let expected = { html: '', css: '', js: '' };
                if (q.reference_solution) {
                    try {
                        const parsed = JSON.parse(q.reference_solution);
                        expected = {
                            html: parsed.html || '',
                            css: parsed.css || '',
                            js: parsed.js || ''
                        };
                    } catch (e) {
                        // If plain string, assign to relevant field based on type
                        if (isJs) expected = { html: '', css: '', js: q.reference_solution };
                        else expected = { html: q.reference_solution, css: '', js: '' };
                    }
                }
                expectedCodeMap[idx] = expected;

                // Parse Assets
                let assets = [];
                if (q.output_format) {
                    try {
                        const parsedAssets = JSON.parse(q.output_format);
                        if (Array.isArray(parsedAssets)) assets = parsedAssets;
                    } catch (e) {
                        // Fallback parsing...
                    }
                }
                assetsMap[idx] = assets;
            });

            setExpectedCodeByQuestion(expectedCodeMap);
            setAssetsByQuestion(assetsMap);
            setExpectedCode(expectedCodeMap[initialQuestionIndex] || { html: '', css: '', js: '' });

            setLoading(false);
        } catch (error) {
            console.error('Failed to start session:', error);
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to start practice session';
            alert(`Failed to start practice session: ${errorMessage}`);
            setLoading(false);
            navigate(`/courses/${courseId}/levels`);
        }
    };

    const autoSaveProgress = async () => {
        if (isSaving) return;
        setIsSaving(true);

        // Save current code to localStorage
        const storageKey = `htmlcss_${courseId}_${levelId}`;
        localStorage.setItem(storageKey, JSON.stringify({
            code,
            userCodeByQuestion,
            currentQuestionIndex
        }));

        setLastSaveTime(new Date());
        setIsSaving(false);
    };

    const handleQuestionChange = (index) => {
        // Save current code to the map before switching
        const updatedUserCode = {
            ...userCodeByQuestion,
            [currentQuestionIndex]: code
        };
        setUserCodeByQuestion(updatedUserCode);

        setCurrentQuestionIndex(index);

        // Load saved code for the NEW index from the updated map
        const savedCode = updatedUserCode[index];
        if (savedCode) {
            setCode(savedCode);
        } else {
            // Start with empty code for user to write
            const emptyCode = {
                html: '',
                css: '',
                js: ''
            };
            setCode(emptyCode);
        }

        // Load expected code for this question
        setExpectedCode(expectedCodeByQuestion[index] || { html: '', css: '', js: '' });

        // Clear hints and terminal for new question
        setHint(null);
        setShowHint(false);
        setHintAttemptCount(1);
        setConsoleOutput([]);
        setRunError(null);

        if (isNodeJS) {
            setPreviewTab("terminal");
        } else {
            setPreviewTab("live");
        }
    };

    const handleRunCode = async () => {
        if (isNodeJS) {
            // Run JS code in backend
            if (!code.js?.trim()) {
                alert("Please write some JavaScript code first.");
                return;
            }

            setIsRunning(true);
            setConsoleOutput([]);
            setRunError(null);

            // Switch to terminal tab if not active
            setPreviewTab("terminal");

            try {
                // Use the run endpoint
                const response = await api.post(`/sessions/${session.id}/run`, {
                    code: code.js,
                    language: 'javascript', // or 'nodejs' depending on backend
                    customInput: '' // Use empty input for now, or add input field if needed
                    // questionId: session.questions[currentQuestionIndex].question_id // Optional depending on backend
                });

                const { output, error } = response.data;
                // Format output for terminal
                const lines = (output || '').split('\n').map(line => ({ type: 'log', content: line }));
                if (error) {
                    lines.push({ type: 'error', content: error });
                }
                if (lines.length === 0 && !error) {
                    lines.push({ type: 'log', content: 'Code executed successfully with no output.' });
                }
                setConsoleOutput(lines);
            } catch (err) {
                console.error("Execution failed:", err);
                const msg = err.response?.data?.error || err.message || "Execution failed";
                setRunError(msg);
                setConsoleOutput([{ type: 'error', content: msg }]);
            } finally {
                setIsRunning(false);
            }

        } else {
            // Web Preview
            if (previewRef.current) {
                previewRef.current.updatePreview(code);
            }
        }
    };

    const handleSubmit = async () => {
        if (!session) return;

        const currentQuestion = session.questions[currentQuestionIndex];
        const isEmpty = isNodeJS ? !code.js?.trim() : (!code.html?.trim() && !code.js?.trim());

        if (isEmpty) {
            alert('Please write some code before submitting');
            return;
        }

        try {
            setIsSaving(true);
            let isPassed = false;

            if (isNodeJS) {
                // For JS, run against tests
                const response = await api.post(`/sessions/${session.id}/run-tests`, {
                    code: code.js,
                    language: 'javascript',
                    questionId: currentQuestion.question_id
                });

                // Check if all tests passed
                const testResults = response.data.test_results || [];
                const passedCount = testResults.filter(r => r.passed).length;
                const totalCount = testResults.length;

                isPassed = totalCount > 0 && passedCount === totalCount;

                // Show results in terminal
                const outputLines = testResults.map(r => ({
                    type: r.passed ? 'success' : 'error',
                    content: `${r.passed ? '✓' : '✗'} Test Case ${r.test_case_id || ''}: ${r.passed ? 'Passed' : 'Failed'} ${r.error_message ? `(${r.error_message})` : ''}`
                }));
                outputLines.unshift({ type: 'log', content: '--- Test Results ---' });
                setConsoleOutput(outputLines);
                setPreviewTab("terminal");

            } else {
                // HTML/CSS basic pass check (length > 20 as placeholder)
                // Real scoring happens on result page usually, or we can trust user for practice
                isPassed = (code.html?.length > 20) || (code.css?.length > 20);
            }

            // Submit logic
            const payload = {
                questionId: currentQuestion.question_id,
                code: isNodeJS ? code.js : JSON.stringify(code),
                language: isNodeJS ? 'javascript' : 'html',
                isPassed: isPassed
            };

            await api.post(`/sessions/${session.id}/submit`, payload);

            // Save to user code state
            setUserCodeByQuestion(prev => ({
                ...prev,
                [currentQuestionIndex]: { ...code, submitted: true }
            }));

            setLastSaveTime(new Date());

            if (isPassed && isNodeJS) {
                alert('All test cases passed! Great job!');
            } else if (isNodeJS) {
                alert('Some test cases failed. Check the terminal for details.');
            } else {
                alert('Code saved successfully!');
            }

        } catch (error) {
            console.error('Failed to submit:', error);
            const msg = error.response?.data?.error || 'Failed to save code. Please try again.';
            alert(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinish = async (auto = false) => {
        if (!session) return;

        if (!auto) {
            const shouldFinish = window.confirm('Are you sure you want to finish the test? Current changes will be submitted.');
            if (!shouldFinish) return;
        } else {
            setAutoSubmitted(true);
        }

        try {
            setIsSaving(true);
            await api.post(`/sessions/${session.id}/complete`);
            if (auto) alert('Test submitted successfully');

            // Clear localStorage
            const storageKey = `htmlcss_${courseId}_${levelId}`;
            localStorage.removeItem(storageKey);

            navigate(`/results/${session.id}`, { replace: true });
        } catch (error) {
            console.error('Failed to complete session:', error);
            navigate(`/results/${session.id}`, { replace: true });
        } finally {
            setIsSaving(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleGetHint = async () => {
        if (hint) {
            setShowHint(true);
            return;
        }

        setLoadingHint(true);
        setShowHint(true);
        try {
            const currentQ = session.questions[currentQuestionIndex];
            const response = await api.post('/ai-tutor/coding-hint', {
                questionId: currentQ.question_id,
                userCode: isNodeJS ? code.js : (code.html + code.css + code.js),
                attemptCount: hintAttemptCount,
                questionType: isNodeJS ? 'coding' : 'html-css-challenge'
            });
            setHint(response.data.hint);
            setHintAttemptCount(prev => prev + 1);
        } catch (error) {
            console.error('Failed to get hint:', error);
            setHint(isNodeJS
                ? "Check your logic. Ensure you are handling edge cases."
                : "Think about the HTML structure first. What elements do you need?");
        } finally {
            setLoadingHint(false);
        }
    };

    const handleClearTerminal = () => {
        setConsoleOutput([]);
        setRunError(null);
    };

    if (loading || !session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading Challenge...</p>
            </div>
        );
    }

    const currentQuestion = session.questions[currentQuestionIndex];
    const currentAssets = assetsByQuestion[currentQuestionIndex] || [];
    const visibleTabs = isNodeJS ? ['js'] : ['html', 'css', 'js'];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm h-16 flex items-center">
                <div className="w-full px-4 md:px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(`/courses/${courseId}/levels`)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-md">
                                    {currentQuestion.title || 'Challenge'}
                                </h1>
                                <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${isNodeJS
                                        ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    }`}>
                                    {isNodeJS ? 'JavaScript' : 'HTML/CSS'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                <span>Level {levelId}</span>
                                <span>•</span>
                                <span>Question {currentQuestionIndex + 1} of {session.questions.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Timer */}
                        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold ${timeLeft <= 300
                                ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                                : "bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"
                            }`}>
                            <Clock size={14} />
                            {formatTime(timeLeft)}
                        </div>

                        {/* Question Nav */}
                        {session.questions.length > 1 && (
                            <div className="hidden md:flex gap-1">
                                {session.questions.map((q, index) => {
                                    const isSubmitted = userCodeByQuestion[index]?.submitted;
                                    return (
                                        <button
                                            key={q.question_id}
                                            onClick={() => handleQuestionChange(index)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs transition-colors ${index === currentQuestionIndex
                                                    ? "bg-blue-600 text-white shadow-sm"
                                                    : isSubmitted
                                                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                        : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
                                                }`}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block" />

                        <button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-colors ${isRunning
                                    ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                                }`}
                            title={isNodeJS ? "Run Code (Ctrl+Enter)" : "Update Preview"}
                        >
                            {isRunning ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Play size={16} fill="currentColor" />}
                            <span className="hidden sm:inline">{isNodeJS ? "Run" : "Run"}</span>
                        </button>

                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                        >
                            <CheckCircle size={16} />
                            <span className="hidden sm:inline">Submit</span>
                        </button>

                        <button
                            onClick={() => handleFinish(false)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg font-medium shadow-sm transition-colors"
                        >
                            <Trophy size={16} />
                            <span className="hidden sm:inline">Finish</span>
                        </button>

                        <div className="h-6 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block" />

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
                {/* Left Panel: Instructions & Editor */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-slate-700">

                    {/* Instructions Toggle */}
                    {showInstructions && (
                        <div className="h-1/3 min-h-[200px] border-b border-gray-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-800 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {currentQuestion.title || "Instructions"}
                                </h2>
                                <button
                                    onClick={() => setShowInstructions(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <Minimize2 size={16} />
                                </button>
                            </div>

                            <div className="prose dark:prose-invert max-w-none text-sm">
                                <p className="whitespace-pre-wrap">{currentQuestion.description}</p>

                                {currentQuestion.constraints && (
                                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 rounded-lg">
                                        <h4 className="text-orange-900 dark:text-orange-300 font-semibold mb-1">Constraints</h4>
                                        <p className="text-orange-800 dark:text-orange-200">{currentQuestion.constraints}</p>
                                    </div>
                                )}

                                {isNodeJS && currentQuestion.input_format && (
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Input Format</h4>
                                            <pre className="bg-gray-100 dark:bg-slate-900 p-2 rounded text-xs">{currentQuestion.input_format}</pre>
                                        </div>
                                        {currentQuestion.output_format && (
                                            <div>
                                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Output Format</h4>
                                                <pre className="bg-gray-100 dark:bg-slate-900 p-2 rounded text-xs">{currentQuestion.output_format}</pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleGetHint}
                                disabled={loadingHint}
                                className="mt-4 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                            >
                                <Lightbulb size={14} />
                                {loadingHint ? "Generating Hint..." : "Need a hint?"}
                            </button>

                            {showHint && hint && (
                                <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg text-sm text-amber-900 dark:text-amber-100">
                                    {hint}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Editor Area */}
                    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 relative">
                        {!showInstructions && (
                            <button
                                onClick={() => setShowInstructions(true)}
                                className="absolute top-2 right-2 z-10 p-1.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
                                title="Show Instructions"
                            >
                                <Maximize2 size={14} />
                            </button>
                        )}
                        <CodeEditor
                            code={code}
                            onChange={setCode}
                            visibleTabs={visibleTabs}
                        />
                    </div>
                </div>

                {/* Right Panel: Preview or Terminal */}
                <div className="lg:w-[45%] flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex gap-2">
                            {/* Tabs for Preview Side */}
                            {isNodeJS ? (
                                <button
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 ${previewTab === "terminal"
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                            : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    <Terminal size={14} />
                                    Terminal
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setPreviewTab("live")}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg ${previewTab === "live"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
                                            }`}
                                    >
                                        Live Preview
                                    </button>
                                    <button
                                        onClick={() => setPreviewTab("expected")}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg ${previewTab === "expected"
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
                                            }`}
                                    >
                                        Expected
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {previewTab === 'terminal' && (
                                <button
                                    onClick={handleClearTerminal}
                                    className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                                    title="Clear Terminal"
                                >
                                    <RotateCcw size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => setFullScreenView(previewTab)}
                                className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                                title="Full Screen"
                            >
                                <Maximize2 size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {isNodeJS ? (
                            /* Terminal View */
                            <div className="absolute inset-0 bg-[#0f172a] p-4 font-mono text-sm overflow-y-auto">
                                {consoleOutput.length === 0 ? (
                                    <div className="text-slate-500 mt-4 text-center select-none">
                                        <Terminal size={48} className="mx-auto mb-2 opacity-20" />
                                        <p>Ready to execute</p>
                                        <p className="text-xs mt-1 opacity-70">Click Run to see output</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {consoleOutput.map((line, i) => (
                                            <div key={i} className={`${line.type === 'error' ? 'text-red-400' :
                                                    line.type === 'success' ? 'text-green-400' :
                                                        'text-slate-300'
                                                } whitespace-pre-wrap break-words`}>
                                                <span className="opacity-50 mr-2 select-none">$</span>
                                                {line.content}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isRunning && (
                                    <div className="mt-2 text-blue-400 animate-pulse">Running...</div>
                                )}
                            </div>
                        ) : (
                            /* Web Preview View */
                            previewTab === "live" ? (
                                <PreviewFrame ref={previewRef} code={code} assets={currentAssets} />
                            ) : (
                                expectedCode.html || expectedCode.css || expectedCode.js ? (
                                    <PreviewFrame ref={expectedPreviewRef} code={expectedCode} assets={currentAssets} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <p>No expected reference available.</p>
                                    </div>
                                )
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Full Screen Overlay */}
            {fullScreenView && (
                <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col animate-in fade-in duration-200">
                    <div className="px-4 py-3 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                        <h2 className="font-bold flex items-center gap-2">
                            {fullScreenView === 'terminal' ? 'Terminal Output' : 'Preview'}
                            <span className="text-xs font-normal opacity-50 px-2 py-0.5 border rounded">Full Screen</span>
                        </h2>
                        <button
                            onClick={() => setFullScreenView(null)}
                            className="p-2 bg-gray-200 dark:bg-slate-700 rounded-full hover:bg-gray-300 dark:hover:bg-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        {fullScreenView === 'terminal' ? (
                            <div className="absolute inset-0 bg-[#0f172a] p-6 font-mono text-lg overflow-y-auto">
                                {consoleOutput.map((line, i) => (
                                    <div key={i} className={`${line.type === 'error' ? 'text-red-400' :
                                            line.type === 'success' ? 'text-green-400' :
                                                'text-slate-300'
                                        } mb-2`}>
                                        <span className="opacity-50 mr-4">$</span>
                                        {line.content}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <PreviewFrame
                                ref={fullScreenView === "expected" ? expectedPreviewRef : previewRef}
                                code={fullScreenView === "expected" ? expectedCode : code}
                                assets={currentAssets}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
