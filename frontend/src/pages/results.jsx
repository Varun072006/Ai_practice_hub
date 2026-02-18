import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import HtmlCssResult from '../components/HtmlCssResult';
import McqResult from '../components/McqResult';
import api from '../services/api';
import { CheckCircle, XCircle, MessageSquare, Send, X, Trophy, Sparkles, ChevronRight, AlertCircle, Clock, Maximize2, Copy, Info } from 'lucide-react';
import AIAnalysisCard from '../components/AIAnalysisCard';
import Confetti from 'react-confetti';

const Results = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for Coding Result View
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('user');
  const [showTutor, setShowTutor] = useState(false);
  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [sessionId]);

  const fetchResults = async () => {
    try {
      const response = await api.get(`/results/${sessionId}`);
      setResults(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      alert('Failed to load results');
    }
  };

  const resultsRef = useRef(results);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    const handlePopState = (event) => {
      event.preventDefault();
      const res = resultsRef.current;
      if (res?.session?.course_id) {
        navigate(`/courses/${res.session.course_id}/levels`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    };

    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // AI Tutor logic for Coding View
  const fetchInitialHint = async () => {
    try {
      const response = await api.get(`/ai-tutor/hint/${sessionId}`);
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
        sessionId,
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

  if (loading || !results) {
    return (
      <Layout>
        <div className="p-8 text-gray-900 dark:text-white">Loading...</div>
      </Layout>
    );
  }

  const handleBackToCourse = () => {
    const courseId = results.session.course_id;
    if (courseId) {
      navigate(`/courses/${courseId}/levels`, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  // --- DISPATCHER LOGIC ---

  // 1. HTML/CSS
  // Check strict session type first, then fallbacks
  const isHtmlCss =
    results.session.session_type === 'html-css' ||
    results.session.session_type === 'html-css-challenge' ||
    (results.questions[0]?.submission?.language === 'html');

  if (isHtmlCss) {
    return <HtmlCssResult results={results} onBack={handleBackToCourse} />;
  }

  // 2. MCQ
  const isMcq = results.session.session_type === 'mcq';
  if (isMcq) {
    return <McqResult results={results} onBack={handleBackToCourse} />;
  }

  // 3. Default: Coding (Judge0)
  const selectedQuestion = results.questions[selectedQuestionIndex];
  const testResults = selectedQuestion.test_results || [];
  const passedCount = testResults.filter(tr => tr.passed).length;
  const selectedTestCase = testResults[selectedTestCaseIndex] || null;
  const sessionScore = Math.round((results.questions.filter(q => q.submission?.is_correct).length / results.questions.length) * 100);
  const isPass = sessionScore >= 70;

  // Helper to get error type label
  const getErrorType = (testResult) => {
    if (testResult.passed) return null;
    if (testResult.error_message?.toLowerCase().includes('time')) return 'Time Limit Exceeded';
    if (testResult.error_message?.toLowerCase().includes('memory')) return 'Memory Limit Exceeded';
    if (testResult.error_message?.toLowerCase().includes('assertion')) return 'Assertion Error';
    return 'Incorrect Output';
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    const code = activeTab === 'user'
      ? selectedQuestion.submission?.submitted_code
      : selectedQuestion.reference_solution;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get code lines for line numbers
  const currentCode = activeTab === 'user'
    ? selectedQuestion.submission?.submitted_code || ''
    : selectedQuestion.reference_solution || '';
  const codeLines = currentCode.split('\n');

  return (
    <Layout>
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-slate-900 max-w-full">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MessageSquare className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Practice Session Results</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {results.session.course_title} - {results.session.level_title}
                </p>
              </div>
            </div>
            <button
              onClick={handleBackToCourse}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ← Back to Course
            </button>
          </div>
        </div>

        {/* Question Selector */}
        {results.questions.length > 1 && (
          <div className="mx-4 md:mx-6 mt-4 p-3 md:p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl flex items-center gap-3 md:gap-4 overflow-x-auto">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Question:</span>
            <div className="flex items-center gap-2">
              {results.questions.map((question, index) => (
                <button
                  key={question.question_id || index}
                  onClick={() => {
                    setSelectedQuestionIndex(index);
                    setSelectedTestCaseIndex(0);
                  }}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-lg font-bold text-base md:text-lg transition-all shrink-0 ${selectedQuestionIndex === index
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : question.submission?.is_correct
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 border-2 border-green-300 dark:border-green-700'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border-2 border-red-300 dark:border-red-700'
                    }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="ml-4 text-sm text-gray-500 dark:text-gray-400 shrink-0">
              {results.questions.filter(q => q.submission?.is_correct).length}/{results.questions.length} Passed
            </div>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 min-h-0 max-w-full overflow-hidden">
          {/* Left Column - AI Review & Test Cases */}
          <div className="w-full lg:w-1/3 space-y-4">
            {/* AI Performance Review Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-blue-500" size={20} />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">AI Performance Review</h3>
                    <p className="text-xs text-blue-500">Personalized Feedback</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${isPass ? 'text-green-500' : 'text-red-500'}`}>
                    {sessionScore}%
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Session Score</p>
                </div>
              </div>

              {/* Areas for Improvement */}
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-red-500" size={16} />
                  <span className="font-medium text-red-700 dark:text-red-400 text-sm">Areas for Improvement</span>
                </div>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 ml-6 list-disc">
                  <li>Review conditional logic specifically for edge cases</li>
                  <li>Practice 'while' loop exit conditions to avoid infinite loops</li>
                  <li>Focus on variable scope within loop blocks</li>
                </ul>
              </div>

              {/* Recommended Focus */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="text-blue-500" size={16} />
                  <span className="font-medium text-blue-700 dark:text-blue-400 text-sm">Recommended Focus</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Review the tutorial on "<span className="font-semibold">Logical Operators</span>" before attempting these problems again.
                </p>
              </div>
            </div>

            {/* Test Cases Sidebar */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-gray-500" size={18} />
                  <span className="font-semibold text-gray-900 dark:text-white">Test Cases</span>
                </div>
                <span className={`text-sm font-medium ${passedCount === testResults.length ? 'text-green-500' : 'text-red-500'}`}>
                  {passedCount}/{testResults.length} Passed
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {testResults.map((testResult, index) => (
                  <button
                    key={testResult.test_case_number}
                    onClick={() => setSelectedTestCaseIndex(index)}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${selectedTestCaseIndex === index ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                  >
                    {testResult.passed ? (
                      <CheckCircle className="text-green-500 shrink-0" size={18} />
                    ) : (
                      <XCircle className="text-red-500 shrink-0" size={18} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        Test Case {testResult.test_case_number}
                        {(testResult.is_hidden === true || testResult.is_hidden === 1) && ' (Hidden)'}
                      </p>
                      {!testResult.passed && (
                        <p className="text-xs text-red-500 truncate">{getErrorType(testResult)}</p>
                      )}
                    </div>
                    <ChevronRight className="text-gray-400 shrink-0" size={16} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Question Details & Code */}
          <div className="flex-1 flex flex-col space-y-4">
            {/* Question Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedQuestion.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Test Case {selectedTestCase?.test_case_number || 1} Details
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${selectedQuestion.submission?.is_correct
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${selectedQuestion.submission?.is_correct ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {selectedQuestion.submission?.is_correct ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              {/* Test Case Details Grid */}
              {selectedTestCase && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Input</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-900 rounded-lg font-mono text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700">
                      {selectedTestCase.input_data || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expected Output</label>
                    <div className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg font-mono text-sm text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                      {selectedTestCase.expected_output || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actual Output</label>
                    <div className={`mt-1 p-3 rounded-lg font-mono text-sm border ${selectedTestCase.passed
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                      }`}>
                      {selectedTestCase.actual_output || 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Hint */}
              {!selectedQuestion.submission?.is_correct && selectedTestCase && !selectedTestCase.passed && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                  <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {selectedTestCase.error_message || "Check your logic and compare the expected vs actual output. Review edge cases and boundary conditions."}
                  </p>
                </div>
              )}
            </div>

            {/* Code Viewer */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col flex-1">
              {/* Tab Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('user')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'user'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    Your Code
                  </button>
                  <button
                    onClick={() => setActiveTab('solution')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'solution'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    Correct Solution
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <Maximize2 size={16} />
                  </button>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    title="Copy code"
                  >
                    {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Code Editor */}
              <div className="bg-slate-900 p-4 overflow-x-auto flex-1 min-h-[300px] overflow-y-auto">
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
                  <span>Submitted {selectedQuestion.submission?.submitted_at ? new Date(selectedQuestion.submission.submitted_at).toLocaleString() : 'recently'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>UTF-8</span>
                  <span className="text-red-400 uppercase">{selectedQuestion.submission?.language || 'PYTHON'} 3.10</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Chat Button */}
        <button
          onClick={() => {
            setShowTutor(true);
            fetchInitialHint();
          }}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full shadow-lg transition-all hover:shadow-xl"
        >
          <MessageSquare size={20} />
          Chat with Tutor
        </button>

        {/* AI Tutor Chat Modal */}
        {showTutor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col border dark:border-slate-700">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-blue-600 dark:text-blue-400" size={24} />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">AI Tutor</h3>
                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">Online</span>
                </div>
                <button
                  onClick={() => setShowTutor(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {tutorMessages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>Ask me anything about this question!</p>
                  </div>
                )}
                {tutorMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                        }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {tutorLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-3">
                      <p className="text-gray-600 dark:text-gray-300">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-slate-700">
                <form onSubmit={handleTutorSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder="Ask a question about your code..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    disabled={tutorLoading}
                  />
                  <button
                    type="submit"
                    disabled={!tutorInput.trim() || tutorLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  AI can make mistakes. Review generated code carefully.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Results;


