import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import { Play, Send, CheckCircle, Lock, Check, X, Lightbulb, X as CloseIcon, ArrowLeft, AlertTriangle } from 'lucide-react';

// Course-to-language mapping (must match backend validation)
const COURSE_LANGUAGE_MAP = {
  Python: [{ value: 'python', label: 'Python 3.10' }],
  'Machine Learning': [{ value: 'python', label: 'Python 3.10' }],
  'Data Science': [{ value: 'python', label: 'Python 3.10' }],
  'Deep Learning': [{ value: 'python', label: 'Python 3.10' }],
  'Cloud Computing': [{ value: 'python', label: 'Python 3.10' }],
  'C Programming': [{ value: 'c', label: 'C (GCC)' }],
};

// Get available languages for a course
const getLanguagesForCourse = (courseTitle) => {
  return COURSE_LANGUAGE_MAP[courseTitle] || [{ value: 'python', label: 'Python 3.10' }];
};

const Practice = () => {
  const { courseId, levelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [loading, setLoading] = useState(true);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [testResultsByQuestion, setTestResultsByQuestion] = useState({});
  const [output, setOutput] = useState('');
  const [lastRunError, setLastRunError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState([
    { value: 'python', label: 'Python 3.10' },
  ]);
  // Store user code for each question: { [questionIndex]: codeString }
  const [userCodeByQuestion, setUserCodeByQuestion] = useState({});
  // LeetCode-style result state
  const [submitResult, setSubmitResult] = useState(null); // { status: 'Accepted'|'Wrong Answer'|'Runtime Error'|'Time Limit Exceeded', passed: number, total: number, runtime?: number }

  useEffect(() => {
    startSession();
  }, [courseId, levelId]);

  useEffect(() => {
    if (!session) return;

    if (timeLeft <= 0 && !autoSubmitted) {
      // Auto-submit when time limit is reached
      handleFinish(true);
      return;
    }

    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, session, autoSubmitted]);

  const startSession = async () => {
    try {
      const sessionTypeFromState = location.state?.sessionType || 'coding';
      const response = await api.post('/sessions/start', {
        courseId,
        levelId,
        sessionType: sessionTypeFromState,
      });
      const sessionData = response.data;

      // Redirect defensively if backend returns MCQ session
      if (sessionData.session_type === 'mcq') {
        navigate(`/mcq-practice/${courseId}/${levelId}`, {
          state: { sessionType: 'mcq' },
          replace: true,
        });
        return;
      }

      // Set available languages based on course
      const courseLanguages = getLanguagesForCourse(sessionData.course_title);
      setAvailableLanguages(courseLanguages);

      // Auto-select the first (and usually only) language for this course
      if (courseLanguages.length > 0) {
        setLanguage(courseLanguages[0].value);
      }

      setSession(sessionData);

      // Initialize code for the first question - start with empty code
      setCode('');
      setUserCodeByQuestion({ 0: '' });

      setLoading(false);
    } catch (error) {
      console.error('Failed to start session:', error);
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to start practice session';
      console.error('Error details:', error?.response?.data);
      alert(`Failed to start practice session: ${errorMessage}`);
      setLoading(false);
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      alert('Please write some code before running');
      return;
    }

    const input = useCustomInput ? customInput : '';
    setIsRunning(true);
    setOutput('');
    setLastRunError(null);

    try {
      let response;

      if (useCustomInput) {
        // Run with custom input (Execution only)
        response = await api.post(`/sessions/${session.id}/run`, {
          code,
          language,
          customInput: input,
        });
        const { output, error } = response.data;
        setOutput(output || '');
        setLastRunError(error || null);
      } else {
        // Run against Visible Test Cases (Validation)
        // Find current question ID
        const activeQuestions = getActiveQuestions();
        const currentQ = activeQuestions[currentQuestionIndex];

        response = await api.post(`/sessions/${session.id}/run-tests`, {
          code,
          language,
          questionId: currentQ.question_id,
        });

        // Update Test Results
        if (response.data.test_results) {
          setTestResultsByQuestion((prev) => ({
            ...prev,
            [currentQuestionIndex]: response.data.test_results,
          }));

          // Also show a summary in console output area?
          const passed = response.data.test_results.filter((r) => r.passed).length;
          const total = response.data.test_results.length;
          setOutput(
            `Run Results: ${passed}/${total} visible test cases passed.\nSee detailed status above.`
          );
          setLastRunError(null);
        } else {
          setOutput('No visible test cases to run.');
        }
      }
    } catch (error) {
      console.error('Failed to run code:', error);
      const msg = error.response?.data?.error || 'Failed to execute code.';
      setLastRunError(msg);
      // Also show specific alert if it's language issue
      if (msg.includes('Invalid language')) {
        alert('Please use the correct programming language for this course!');
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!session) return;

    const questionsForTest = getActiveQuestions();
    const currentQuestion = questionsForTest[currentQuestionIndex];
    if (!code.trim()) {
      alert('Please write some code before submitting');
      return;
    }

    try {
      const response = await api.post(`/sessions/${session.id}/submit`, {
        questionId: currentQuestion.question_id,
        code,
        language,
      });

      // Store per-question test results so we can colour individual test cases
      if (response.data.test_results) {
        setTestResultsByQuestion((prev) => ({
          ...prev,
          [currentQuestionIndex]: response.data.test_results,
        }));
      }

      // LeetCode-style result display
      const passed = response.data.test_cases_passed || 0;
      const total = response.data.total_test_cases || 0;

      if (response.data.is_correct) {
        setSubmitResult({
          status: 'Accepted',
          passed,
          total,
          runtime: response.data.execution_time,
        });
      } else {
        // Categorize the error type
        const hasRuntimeError = response.data.test_results?.some(
          (r) => r.error_message && !r.error_message.includes('Time')
        );
        const hasTimeLimit = response.data.test_results?.some((r) =>
          r.error_message?.includes('Time')
        );

        setSubmitResult({
          status: hasTimeLimit
            ? 'Time Limit Exceeded'
            : hasRuntimeError
              ? 'Runtime Error'
              : 'Wrong Answer',
          passed,
          total,
        });
      }

      // Don't auto-advance to next question - let user see their result first
      // User can manually navigate when ready
    } catch (error) {
      console.error('Failed to submit:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to submit solution';
      alert(errorMessage);

      // If language error, show specific message
      if (errorMessage.includes('Invalid language')) {
        alert('Please use the correct programming language for this course!');
      }
    }
  };

  const handleFinish = async (auto = false) => {
    if (!session) return;

    if (!auto) {
      // Use a simple confirm. If it fails or is blocked, we might want a custom modal,
      // but for now let's ensure the logic flow is correct.
      // Using a distinct variable name to avoid confusion
      const shouldFinish = window.confirm('Are you sure you want to finish the test?');
      if (!shouldFinish) {
        return;
      }
    } else {
      setAutoSubmitted(true);
    }

    try {
      await api.post(`/sessions/${session.id}/complete`);
      // Only show alert if it's auto-submit, otherwise just navigate for smoother UX
      if (auto) alert('Test submitted successfully');

      // Force navigation and replace history to prevent going back
      navigate(`/results/${session.id}`, { replace: true });
    } catch (error) {
      console.error('Failed to complete session:', error);
      // Even if backend fails (e.g. already completed), try to navigate to results
      navigate(`/results/${session.id}`, { replace: true });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getActiveQuestions = () => {
    return session?.questions || [];
  };


  if (loading || !session) {
    return (
      <Layout>
        <div className="p-8 text-gray-900 dark:text-white">Loading...</div>
      </Layout>
    );
  }

  const questionsForTest = getActiveQuestions();
  const currentQuestion = questionsForTest[currentQuestionIndex];
  const visibleTestCases = currentQuestion.test_cases?.filter((tc) => !tc.is_hidden) || [];
  const hiddenTestCases = currentQuestion.test_cases?.filter((tc) => tc.is_hidden) || [];
  const currentTestResults = testResultsByQuestion[currentQuestionIndex] || [];

  const getTestCaseStatus = (testCaseId) => {
    const result = currentTestResults.find((r) => r.test_case_id === testCaseId);
    if (!result) return 'pending';
    return result.passed ? 'passed' : 'failed';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-6 shrink-0 z-10 shadow-sm">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-inner">
          <span className="text-xs text-gray-500 font-semibold tracking-wide uppercase">Time:</span>
          <span className="text-sm font-bold text-gray-800 dark:text-white font-mono">{formatTime(timeLeft)}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={handleRun} disabled={isRunning} className="flex items-center border border-gray-300 dark:border-slate-600 justify-center px-4 py-2 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 font-medium text-sm shadow-sm">
            {isRunning ? <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div> : <Play size={16} className="mr-1" />}
            Run
          </button>
          <button onClick={handleSubmit} disabled={isRunning} className="flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50">
            <Send size={15} /> <span className="hidden sm:inline">Submit</span>
          </button>
          <button onClick={() => handleFinish(false)} className="flex items-center justify-center gap-1.5 px-5 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors font-medium shadow-sm">
            <CheckCircle size={15} /> <span className="hidden sm:inline">Finish</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row h-full max-w-full overflow-hidden p-4 md:p-6 gap-6">
        {/* Left Side: Question content */}
        <div className="w-full md:w-5/12 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 px-6 py-6 custom-scrollbar">
          {/* Question selection tabs */}
          <div className="mb-6 flex gap-2 flex-wrap pb-4 border-b border-gray-100 dark:border-slate-700">
            {session.questions.map((q, index) => {
              return (
                <button
                  key={index}
                  onClick={() => {
                    setUserCodeByQuestion((prev) => ({ ...prev, [currentQuestionIndex]: code }));
                    setCurrentQuestionIndex(index);
                    const savedCode = userCodeByQuestion[index];
                    setCode(savedCode !== undefined ? savedCode : '');
                    setSubmitResult(null); setOutput(''); setLastRunError(null);
                  }}
                  className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-all duration-200 ${index === currentQuestionIndex
                      ? 'bg-blue-600 text-white shadow transform scale-105'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                >
                  Q{index + 1}
                </button>
              );
            })}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {currentQuestion.title}
            </h2>
            <div className="prose dark:prose-invert max-w-none mb-4">
              <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                {currentQuestion.description}
              </p>
            </div>

            {currentQuestion.constraints && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Constraints:</h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm whitespace-pre-wrap">
                  {currentQuestion.constraints}
                </p>
              </div>
            )}

            <div className="mt-6">
              {/* Sample Input / Output */}
              {(currentQuestion.input_format || currentQuestion.output_format) && (
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.input_format && (
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                        Sample Input
                      </h3>
                      <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap border dark:border-slate-700">
                        {currentQuestion.input_format}
                      </pre>
                    </div>
                  )}
                  {currentQuestion.output_format && (
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                        Sample Output
                      </h3>
                      <pre className="bg-gray-50 dark:bg-slate-900 p-3 rounded text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap border dark:border-slate-700">
                        {currentQuestion.output_format}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Test Cases:</h3>
              <div className="space-y-4">
                {visibleTestCases.map((tc, index) => {
                  const status = getTestCaseStatus(tc.id);
                  const result = currentTestResults.find((r) => r.test_case_id === tc.id);

                  let borderClass = 'border-l-4 border-gray-200 dark:border-slate-700';
                  if (status === 'passed') borderClass = 'border-l-4 border-green-500';
                  if (status === 'failed') borderClass = 'border-l-4 border-red-500';

                  return (
                    <div key={tc.id} className={`p-5 rounded-r-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all duration-200 hover:shadow-md ${borderClass}`}>
                      <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm tracking-wide">Test Case {index + 1}</h4>

                      {status === 'passed' && (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-500 mb-4 font-bold text-xs tracking-wider uppercase">
                          <CheckCircle size={16} /> PASSED
                        </div>
                      )}
                      {status === 'failed' && (
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-500 mb-4 font-bold text-xs tracking-wider uppercase">
                          <AlertTriangle size={16} /> FAILED
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div>
                          <div className="text-gray-400 dark:text-slate-500 font-bold mb-1.5 uppercase tracking-widest text-[10px]">Input:</div>
                          <div className="font-mono text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{tc.input_data}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 dark:text-slate-500 font-bold mb-1.5 uppercase tracking-widest text-[10px]">Expected Output:</div>
                          <div className="font-mono text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{tc.expected_output}</div>
                        </div>
                        {result && !result.passed && (
                          <div className="md:col-span-2 mt-2 pt-4 border-t border-gray-100 dark:border-slate-700/50">
                            <div className="text-red-400 dark:text-red-500 font-bold mb-1.5 uppercase tracking-widest text-[10px]">Actual Output:</div>
                            <div className="font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap bg-red-50 dark:bg-red-900/10 p-3 rounded-md border border-red-100 dark:border-red-900/30">
                              {result.actual_output || 'No output'}
                            </div>
                            {result.error_message && (
                              <div className="mt-2 text-red-500 font-mono text-xs p-3 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-900/30">
                                {result.error_message}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {hiddenTestCases.map((tc, index) => {
                  const status = getTestCaseStatus(tc.id);
                  let borderClass = 'border-gray-200 dark:border-slate-700';
                  if (status === 'passed') borderClass = 'border-l-4 border-green-500';
                  if (status === 'failed') borderClass = 'border-l-4 border-red-500';

                  return (
                    <div key={tc.id} className={`p-4 rounded-xl border bg-white dark:bg-slate-800 shadow-sm flex items-center justify-between transition-all duration-200 hover:shadow-md ${borderClass} ${status !== 'pending' ? 'rounded-l-none' : ''}`}>
                      <span className="font-medium text-sm text-gray-700 dark:text-slate-300">
                        Hidden Test Case {visibleTestCases.length + index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {status === 'passed' && <span className="text-green-600 dark:text-green-500 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5"><CheckCircle size={15} /> PASSED</span>}
                        {status === 'failed' && <span className="text-red-600 dark:text-red-500 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5"><AlertTriangle size={15} /> FAILED</span>}
                        {status === 'pending' && <span className="text-gray-400 dark:text-slate-500 font-bold text-xs tracking-wider flex items-center gap-1.5 uppercase"><Lock size={15} /> Locked</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-7/12 bg-[#0f172a] rounded-xl overflow-hidden flex flex-col border border-slate-700 shadow-lg h-[600px] md:h-auto">
          {/* Code Editor */}
          <div className="flex-1 min-h-[40vh] border-b border-slate-800">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(value) => {
                setCode(value || '');
                setUserCodeByQuestion((prev) => ({
                  ...prev,
                  [currentQuestionIndex]: value || '',
                }));
              }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                cursorBlinking: 'smooth',
                padding: { top: 16 },
                scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
              }}
            />
          </div>

          {/* Combined Console Area */}
          <div className="bg-[#1e293b] flex flex-col shrink-0" style={{ maxHeight: '45vh', minHeight: '30vh' }}>
            {/* Console Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-[#0f172a] shadow-sm z-10">
              <div className="flex items-center gap-6">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Console Output</span>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={useCustomInput} onChange={(e) => setUseCustomInput(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                  <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-400 transition-colors uppercase tracking-wider">Enable Custom Input</span>
                </label>
              </div>
              {lastRunError && (
                <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Execution Error</span>
              )}
            </div>

            {/* Console Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#111827]">
              {useCustomInput ? (
                <div className="h-full flex flex-col gap-3">
                  <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">Custom Input:</span>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter your custom input here..."
                    className="w-full min-h-[120px] p-4 bg-[#0f172a] text-emerald-400 font-mono text-sm rounded-lg border border-slate-700/50 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 focus:outline-none resize-y placeholder-slate-600 shadow-inner"
                  />
                  {(output || lastRunError) && (
                    <div className="mt-2">
                      <span className="text-xs text-slate-400 font-bold tracking-widest uppercase block mb-2">Output:</span>
                      <pre className="font-mono text-sm whitespace-pre-wrap text-slate-300 p-4 bg-[#0f172a] rounded-lg border border-slate-700/50 shadow-inner overflow-x-auto">
                        {lastRunError && <span className="text-red-400">{lastRunError}{'\n'}</span>}
                        {output}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full">
                  {!output && !lastRunError && !submitResult ? (
                    <div className="flex items-center justify-center h-full min-h-[100px]">
                      <span className="text-slate-500 font-mono text-sm">Run code to see output...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {/* Submit Result */}
                      {submitResult && (
                        <div className={`p-4 rounded-lg border ${submitResult.status === 'Accepted' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-lg font-bold ${submitResult.status === 'Accepted' ? 'text-green-500' : 'text-red-500'}`}>{submitResult.status}</span>
                            {submitResult.runtime && <span className="text-sm text-slate-400 font-mono bg-[#0f172a] px-2 py-1 rounded border border-slate-700">{submitResult.runtime}ms</span>}
                          </div>
                          <div className="text-sm text-slate-400 font-mono">Passed <span className="text-slate-200">{submitResult.passed}</span> / <span className="text-slate-200">{submitResult.total}</span> test cases.</div>
                        </div>
                      )}

                      {/* Last Run Error / Console Output */}
                      {(output || lastRunError) && (
                        <div className="flex flex-col gap-2">
                          <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">Output Log:</span>
                          <pre className="font-mono text-sm whitespace-pre-wrap text-slate-300 p-4 bg-[#0f172a] rounded-lg border border-slate-700/50 shadow-inner overflow-x-auto">
                            {lastRunError && (
                              <div className="mb-4 text-red-400 bg-red-950/40 p-3 rounded-md border border-red-900/50">
                                <strong className="flex items-center gap-2 mb-2 text-red-500"><AlertTriangle size={16} /> Runtime Error</strong>
                                {lastRunError}
                              </div>
                            )}
                            {output}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice;
