import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Trophy,
  Lightbulb,
  X,
  Sun,
  Moon,
  Terminal,
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  Tag,
  FileText,
  BookOpen,
  Code2,
  Monitor,
  Info,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import CodeEditor from '../components/CodeEditor';
import PreviewFrame from '../components/PreviewFrame';
import api from '../services/api';

export default function HtmlCssChallenge() {
  const { courseId, levelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [session, setSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState({ html: '', css: '', js: '' });
  const [userCodeByQuestion, setUserCodeByQuestion] = useState({});
  const [expectedCode, setExpectedCode] = useState({ html: '', css: '', js: '' });
  const [expectedCodeByQuestion, setExpectedCodeByQuestion] = useState({});
  const [assetsByQuestion, setAssetsByQuestion] = useState({});
  const [previewTab, setPreviewTab] = useState('live');
  const [showInstructions, setShowInstructions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const previewRef = useRef();
  const expectedPreviewRef = useRef();
  const [fullScreenView, setFullScreenView] = useState(null);


  // JS/Terminal State
  const [isNodeJS, setIsNodeJS] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [files, setFiles] = useState([]); // Array of { name, language, content }

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
        alert(
          'No questions available for this level. Please add questions before starting a session.'
        );
        navigate(`/courses/${courseId}/levels`);
        return;
      }

      setSession(sessionData);

      // Determine if this is a JS/NodeJS challenge based on course title or question type
      const isJs =
        sessionData.course_title?.toLowerCase().includes('javascript') ||
        sessionData.course_title?.toLowerCase().includes('js') ||
        sessionData.questions[0]?.challengeType === 'nodejs'; // Assuming challengeType exists

      setIsNodeJS(isJs);
      if (isJs) {
        setPreviewTab('terminal');
      }

      // Attempt to recover from localStorage
      const storageKey = `htmlcss_${courseId}_${levelId}`;
      const stored = localStorage.getItem(storageKey);
      let recoveredData = null;
      if (stored) {
        try {
          recoveredData = JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse stored code', e);
        }
      }

      // Initialize code and expected code for the first question
      const initialQuestionIndex = recoveredData?.currentQuestionIndex || 0;
      setCurrentQuestionIndex(initialQuestionIndex);

      // Parse User Initial Code
      const initialUserCodeMap = recoveredData?.userCodeByQuestion || {};
      setUserCodeByQuestion(initialUserCodeMap);

      const currentCode = recoveredData?.code ||
        initialUserCodeMap[initialQuestionIndex] || { html: '', css: '', js: '' };
      setCode(currentCode);
      setFiles(initFilesFromCode(currentCode));

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
              js: parsed.js || '',
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
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to start practice session';
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
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        code,
        userCodeByQuestion,
        currentQuestionIndex,
      })
    );

    setLastSaveTime(new Date());
    setIsSaving(false);
  };

  const handleQuestionChange = (index) => {
    // Save current code to the map before switching
    const updatedUserCode = {
      ...userCodeByQuestion,
      [currentQuestionIndex]: code,
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
        js: '',
      };
      setCode(emptyCode);
    }

    // Initialize files from code for the new question
    const initialFiles = [];
    const codeSource = savedCode || { html: '', css: '', js: '' };

    if (codeSource.html !== undefined)
      initialFiles.push({ name: 'index.html', language: 'html', content: codeSource.html });
    if (codeSource.css !== undefined)
      initialFiles.push({ name: 'style.css', language: 'css', content: codeSource.css });
    if (codeSource.js !== undefined)
      initialFiles.push({ name: 'script.js', language: 'javascript', content: codeSource.js });

    setFiles(initialFiles);

    // Load expected code for this question
    setExpectedCode(expectedCodeByQuestion[index] || { html: '', css: '', js: '' });

    // Clear terminal for new question
    setTestResults([]);
    setConsoleOutput([]);
    setRunError(null);

    if (isNodeJS) {
      setPreviewTab('terminal');
    } else {
      setPreviewTab('live');
    }
  };

  const initFilesFromCode = (codeSource) => {
    const files = [];
    // Always add index.html, style.css, script.js to ensure tabs exist
    files.push({ name: 'index.html', language: 'html', content: codeSource.html || '' });
    files.push({ name: 'style.css', language: 'css', content: codeSource.css || '' });
    files.push({ name: 'script.js', language: 'javascript', content: codeSource.js || '' });
    return files;
  };

  // File Management Handlers
  const handleFileChange = (newFiles) => {
    setFiles(newFiles);
    // Sync back to code object for backward compatibility (Preview, Submit, etc.)
    const newCode = { ...code };
    const htmlFile = newFiles.find((f) => f.name === 'index.html' || f.language === 'html');
    const cssFile = newFiles.find((f) => f.name === 'style.css' || f.language === 'css');
    const jsFile = newFiles.find((f) => f.name === 'script.js' || f.language === 'javascript');

    if (htmlFile) newCode.html = htmlFile.content;
    if (cssFile) newCode.css = cssFile.content;
    if (jsFile) newCode.js = jsFile.content;

    setCode(newCode);
  };

  const handleFileCreate = (name, language) => {
    setFiles((prev) => [...prev, { name, language, content: '' }]);
  };

  const handleFileRename = (oldName, newName) => {
    setFiles((prev) => prev.map((f) => (f.name === oldName ? { ...f, name: newName } : f)));
  };

  const handleFileDelete = (name) => {
    if (files.length <= 1) {
      alert('You must have at least one file.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      setFiles((prev) => prev.filter((f) => f.name !== name));
    }
  };

  const handleRunCode = async () => {
    if (isNodeJS) {
      // Run JS code in backend
      if (!code.js?.trim()) {
        alert('Please write some JavaScript code first.');
        return;
      }

      setIsRunning(true);
      setConsoleOutput([]);
      setRunError(null);

      // Switch to terminal tab if not active
      setPreviewTab('terminal');

      try {
        // Use the run endpoint
        const response = await api.post(`/sessions/${session.id}/run`, {
          code: code.js,
          language: 'javascript', // or 'nodejs' depending on backend
          customInput: customInput,
          files: files.map((f) => ({ name: f.name, content: f.content })), // Send all files
        });

        const { output, error } = response.data;
        // Format output for terminal
        const lines = (output || '').split('\n').map((line) => ({ type: 'log', content: line }));
        if (error) {
          lines.push({ type: 'error', content: error });
        }
        if (lines.length === 0 && !error) {
          lines.push({ type: 'log', content: 'Code executed successfully with no output.' });
        }
        setConsoleOutput(lines);
      } catch (err) {
        console.error('Execution failed:', err);
        const msg = err.response?.data?.error || err.message || 'Execution failed';
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
    const isEmpty = isNodeJS ? !code.js?.trim() : !code.html?.trim() && !code.js?.trim();

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
          questionId: currentQuestion.question_id,
          includeHidden: true,
        });

        // Check if all tests passed
        const testResults = response.data.test_results || [];
        setTestResults(testResults);
        const passedCount = testResults.filter((r) => r.passed).length;
        const totalCount = testResults.length;

        isPassed = totalCount > 0 && passedCount === totalCount;

        // Show results in terminal
        const outputLines = testResults.map((r) => ({
          type: r.passed ? 'success' : 'error',
          content: `${r.passed ? '✓' : '✗'} Test Case ${r.test_case_id || ''}: ${r.passed ? 'Passed' : 'Failed'} ${r.error_message ? `(${r.error_message})` : ''}`,
        }));
        outputLines.unshift({ type: 'log', content: '--- Test Results ---' });
        setConsoleOutput(outputLines);
        setPreviewTab('terminal');
      } else {
        // HTML/CSS basic pass check (length > 20 as placeholder)
        // Real scoring happens on result page usually, or we can trust user for practice
        isPassed = code.html?.length > 20 || code.css?.length > 20;
      }

      // Submit logic
      const payload = {
        questionId: currentQuestion.question_id,
        code: isNodeJS ? code.js : JSON.stringify(code),
        language: isNodeJS ? 'javascript' : 'html',
        isPassed: isPassed,
      };

      await api.post(`/sessions/${session.id}/submit`, payload);

      // Save to user code state
      setUserCodeByQuestion((prev) => ({
        ...prev,
        [currentQuestionIndex]: { ...code, submitted: true },
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
      const shouldFinish = window.confirm(
        'Are you sure you want to finish the test? Current changes will be submitted.'
      );
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


  const handleClearTerminal = () => {
    setConsoleOutput([]);
    setRunError(null);
  };

  if (loading || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
          Loading Challenge...
        </p>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const currentAssets = assetsByQuestion[currentQuestionIndex] || [];
  const visibleTabs = ['html', 'css', 'js'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 max-w-full overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm h-14 flex items-center">
        <div className="w-full px-3 md:px-5 flex items-center justify-between">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/courses/${courseId}/levels`)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 shrink-0"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[180px] md:max-w-lg">
                  {currentQuestion.title || 'Challenge'}
                </h1>
                <span
                  className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full ${isNodeJS
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                      : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                    }`}
                >
                  {isNodeJS ? 'JS' : 'HTML/CSS'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Timer */}
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${timeLeft <= 300
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                }`}
            >
              <Clock size={12} />
              {formatTime(timeLeft)}
            </div>

            {/* Question Nav Dots */}
            {session.questions.length > 1 && (
              <div className="hidden md:flex gap-1 mx-1">
                {session.questions.map((q, index) => {
                  const isSubmitted = userCodeByQuestion[index]?.submitted;
                  return (
                    <button
                      key={q.question_id}
                      onClick={() => handleQuestionChange(index)}
                      title={`Question ${index + 1}`}
                      className={`w-7 h-7 rounded-md flex items-center justify-center font-semibold text-[11px] transition-all ${index === currentQuestionIndex
                          ? 'bg-blue-600 text-white shadow-sm'
                          : isSubmitted
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isRunning
                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
              title={isNodeJS ? 'Run Code' : 'Update Preview'}
            >
              {isRunning ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              <span className="hidden sm:inline">Run</span>
            </button>

            <button
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
            >
              <CheckCircle size={14} />
              <span className="hidden sm:inline">Submit</span>
            </button>

            <button
              onClick={() => handleFinish(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-lg text-sm font-medium shadow-sm transition-all"
            >
              <Trophy size={14} />
              <span className="hidden sm:inline">Finish</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-56px)] overflow-hidden">
        {/* Left Panel: Instructions & Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-slate-700">
          {/* Collapsible Problem Statement Toggle Bar */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="group flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 transition-all duration-200 cursor-pointer w-full text-left shrink-0"
          >
            <BookOpen size={14} className="text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
              Problem Statement
            </span>
            <div className="ml-auto flex items-center gap-2">
              {!showInstructions && (
                <span className="text-[11px] text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Click to expand
                </span>
              )}
              <ChevronDown
                size={14}
                className={`text-gray-400 dark:text-slate-500 transition-transform duration-200 ${showInstructions ? 'rotate-0' : '-rotate-90'}`}
              />
            </div>
          </button>

          {/* Instructions Panel (collapsible) */}
          {showInstructions && (
            <div className="h-1/3 min-h-[200px] border-b border-gray-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-800">
              <div className="p-5 space-y-4">
                {/* Description */}
                <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.description}
                </p>

                {/* Constraints */}
                {currentQuestion.constraints && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border-l-3 border-amber-400 dark:border-amber-500 rounded-r-lg">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      Constraints
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {currentQuestion.constraints}
                    </p>
                  </div>
                )}

                {/* Input/Output Format (NodeJS only) */}
                {isNodeJS && currentQuestion.input_format && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                        Input Format
                      </p>
                      <pre className="bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200 p-2.5 rounded-lg text-xs font-mono border border-gray-100 dark:border-slate-700">
                        {currentQuestion.input_format}
                      </pre>
                    </div>
                    {currentQuestion.output_format && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">
                          Output Format
                        </p>
                        <pre className="bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200 p-2.5 rounded-lg text-xs font-mono border border-gray-100 dark:border-slate-700">
                          {currentQuestion.output_format}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 relative">
            <CodeEditor
              code={code}
              onChange={setCode}
              visibleTabs={visibleTabs}
              files={files}
              onFileChange={handleFileChange}
              onFileCreate={handleFileCreate}
              onFileRename={handleFileRename}
              onFileDelete={handleFileDelete}
            />
          </div>
        </div>

        {/* Right Panel: Preview or Terminal */}
        <div className="lg:w-[45%] flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 overflow-hidden min-h-[300px] lg:min-h-0">
          <div className="flex flex-col min-h-0 h-full">
            <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div className="flex gap-1">
                {/* Tabs for Preview Side */}
                <>
                  <button
                    onClick={() => setPreviewTab('live')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${previewTab === 'live'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-300'
                      }`}
                    title="Live Preview"
                  >
                    <Monitor size={13} />
                    Live Preview
                  </button>
                  <button
                    onClick={() => setPreviewTab('expected')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${previewTab === 'expected'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-300'
                      }`}
                    title="Expected Output"
                  >
                    <Eye size={13} />
                    Expected
                  </button>
                  {isNodeJS && (
                    <button
                      onClick={() => setPreviewTab('terminal')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${previewTab === 'terminal'
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                          : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-300'
                        }`}
                      title="Terminal Output"
                    >
                      <Terminal size={13} />
                      Terminal
                    </button>
                  )}
                  {isNodeJS &&
                    currentQuestion.test_cases &&
                    currentQuestion.test_cases.length > 0 && (
                      <button
                        onClick={() => setPreviewTab('testcases')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${previewTab === 'testcases'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-300'
                          }`}
                        title="Test Cases"
                      >
                        <CheckCircle size={13} />
                        Tests
                      </button>
                    )}
                </>
              </div>

              <div className="flex items-center gap-1">
                {previewTab === 'terminal' && (
                  <button
                    onClick={handleClearTerminal}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                    title="Clear Output"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
                <button
                  onClick={() => setFullScreenView(previewTab)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                  title="Full Screen"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
              {previewTab === 'terminal' ? (
                /* Execution Output View (STDIN + Output) */
                <div className="absolute inset-0 bg-white dark:bg-slate-900 flex flex-col font-mono text-sm">
                  {/* STDIN Section */}
                  <div className="h-1/3 border-b border-gray-200 dark:border-slate-700 flex flex-col">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-800 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      <Code2 size={12} />
                      Input (Optional)
                    </div>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Enter input values here..."
                      className="flex-1 w-full p-4 resize-none bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:outline-none placeholder:text-gray-300 dark:placeholder:text-slate-600 text-sm"
                    />
                  </div>

                  {/* OUTPUT Section */}
                  <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-800 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
                      <Terminal size={12} />
                      Output
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto text-gray-800 dark:text-slate-200 whitespace-pre-wrap">
                      {consoleOutput.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center select-none">
                          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                            <Play size={20} className="text-gray-300 dark:text-slate-600 ml-0.5" />
                          </div>
                          <p className="text-sm text-gray-400 dark:text-slate-500">
                            Run your code to see output
                          </p>
                          <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">
                            Press Ctrl+Enter or click Run
                          </p>
                        </div>
                      ) : (
                        consoleOutput.map((line, i) => (
                          <div
                            key={i}
                            className={`flex gap-3 ${line.type === 'error'
                                ? 'text-red-600 dark:text-red-400'
                                : line.type === 'success'
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-800 dark:text-slate-300'
                              } mb-1 text-[13px] leading-relaxed`}
                          >
                            <span className="text-gray-300 dark:text-slate-600 select-none shrink-0 w-4 text-right text-[11px]">
                              {i + 1}
                            </span>
                            <span>{line.content}</span>
                          </div>
                        ))
                      )}
                      {isRunning && (
                        <div className="mt-3 flex items-center gap-2 text-blue-500">
                          <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          <span className="text-sm">Running...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : previewTab === 'testcases' ? (
                /* Test Cases View */
                <div className="absolute inset-0 bg-gray-50 dark:bg-slate-900 overflow-y-auto p-4 space-y-4">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg shadow-sm mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle size={16} className="text-blue-600 dark:text-blue-400" />
                      Test Case Results
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {testResults.length > 0
                        ? `${testResults.filter((t) => t.passed).length} / ${testResults.length} Passed`
                        : 'Run your code to see results'}
                    </p>
                  </div>

                  {currentQuestion.test_cases?.map((testCase, index) => {
                    const result = testResults[index];
                    let status = result ? (result.passed ? 'passed' : 'failed') : 'pending';
                    const isSystemError =
                      result?.error_message?.includes('Execution Service Error');

                    if (isSystemError) status = 'system_error';

                    if (testCase.is_hidden && status === 'pending') {
                      return (
                        <div
                          key={index}
                          className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 opacity-70"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm text-gray-700 dark:text-slate-300">
                              Test Case {index + 1}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded uppercase bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-400">
                              Hidden
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className={`border rounded-lg p-3 ${status === 'passed'
                            ? 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10'
                            : status === 'system_error'
                              ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10'
                              : status === 'failed'
                                ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm text-gray-700 dark:text-slate-300">
                            Test Case {index + 1}
                          </span>
                          {result && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${status === 'passed'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : status === 'system_error'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                            >
                              {status === 'system_error' ? 'System Error' : status}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                          {!testCase.is_hidden && (
                            <>
                              <div>
                                <span className="text-gray-500 dark:text-slate-400 block mb-1">
                                  Input:
                                </span>
                                <div className="bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-2 rounded border border-gray-100 dark:border-slate-700 overflow-x-auto whitespace-pre-wrap">
                                  {testCase.input_data}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-slate-400 block mb-1">
                                  Expected Output:
                                </span>
                                <div className="bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-2 rounded border border-gray-100 dark:border-slate-700 overflow-x-auto whitespace-pre-wrap">
                                  {testCase.expected_output}
                                </div>
                              </div>
                            </>
                          )}

                          {status === 'failed' && result?.actual_output && (
                            <div>
                              <span className="text-red-500 dark:text-red-400 block mb-1">
                                Your Output:
                              </span>
                              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800/30 overflow-x-auto text-red-700 dark:text-red-300 whitespace-pre-wrap">
                                {result.actual_output}
                              </div>
                            </div>
                          )}

                          {status === 'failed' && result?.error_message && (
                            <div className="mt-1 text-red-600 dark:text-red-400 font-semibold">
                              {result.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : /* Web Preview View */
                previewTab === 'live' ? (
                  <PreviewFrame ref={previewRef} code={code} assets={currentAssets} />
                ) : expectedCode.html || expectedCode.css || expectedCode.js ? (
                  <PreviewFrame ref={expectedPreviewRef} code={expectedCode} assets={currentAssets} />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full select-none">
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <Eye size={24} className="text-gray-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-400 dark:text-slate-500">
                      No expected reference available
                    </p>
                    <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">
                      Check back when expected output is provided
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Overlay */}
      {fullScreenView && (
        <div
          className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                {fullScreenView === 'terminal' ? (
                  <Terminal size={16} className="text-blue-600 dark:text-blue-400" />
                ) : (
                  <Monitor size={16} className="text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  {fullScreenView === 'terminal'
                    ? 'Terminal Output'
                    : fullScreenView === 'expected'
                      ? 'Expected Preview'
                      : 'Live Preview'}
                </h2>
                <span className="text-[11px] text-gray-400 dark:text-slate-500">
                  Full screen mode
                </span>
              </div>
            </div>
            <button
              onClick={() => setFullScreenView(null)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200"
              title="Exit full screen (Esc)"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {fullScreenView === 'terminal' ? (
              <div className="absolute inset-0 bg-white dark:bg-slate-900 p-6 font-mono overflow-y-auto">
                {consoleOutput.map((line, i) => (
                  <div
                    key={i}
                    className={`flex gap-4 ${line.type === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : line.type === 'success'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-800 dark:text-slate-300'
                      } mb-1 text-sm leading-relaxed`}
                  >
                    <span className="text-gray-300 dark:text-slate-600 select-none w-6 text-right text-xs">
                      {i + 1}
                    </span>
                    <span>{line.content}</span>
                  </div>
                ))}
              </div>
            ) : (
              <PreviewFrame
                ref={fullScreenView === 'expected' ? expectedPreviewRef : previewRef}
                code={fullScreenView === 'expected' ? expectedCode : code}
                assets={currentAssets}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
