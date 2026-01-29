import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import HtmlCssResult from '../components/HtmlCssResult';
import McqResult from '../components/McqResult';
import api from '../services/api';
import { CheckCircle, XCircle, MessageSquare, Send, X } from 'lucide-react';

const Results = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  // State for Coding Result View (Legacy/Standard)
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('user');
  const [showTutor, setShowTutor] = useState(false);
  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);

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
        <div className="p-8">Loading...</div>
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

  return (
    <Layout>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Practice Session Results</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {results.session.course_title} - {results.session.level_title}
            </p>
          </div>
          <button
            onClick={handleBackToCourse}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Back to Course
          </button>
        </div>

        <div className="mb-4 flex gap-2 flex-wrap">
          {results.questions.map((q, index) => (
            <button
              key={index}
              onClick={() => setSelectedQuestionIndex(index)}
              className={`px-4 py-2 rounded-lg font-medium ${index === selectedQuestionIndex
                ? 'bg-blue-600 text-white'
                : q.submission?.is_correct
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
            >
              Q{index + 1}
              {q.submission?.is_correct ? (
                <CheckCircle className="inline ml-2" size={16} />
              ) : (
                <XCircle className="inline ml-2" size={16} />
              )}
            </button>
          ))}
        </div>

        {/* Right Sidebar Content - Moved below question numbers */}
        <div className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-6 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Analysis & Help</h3>

            {/* Score Summary */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Session Score</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round((results.questions.filter(q => q.submission?.is_correct).length / results.questions.length) * 100)}%
              </div>
            </div>

            {/* Question Title and Description */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{selectedQuestion.title}</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedQuestion.description}</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Detailed Results</h3>
            {selectedQuestion.test_results && (
              <div className="space-y-3 mb-6">
                {selectedQuestion.test_results.map((testResult, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg ${testResult.passed
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        Test Case {index + 1}
                        {testResult.is_hidden && ' (Hidden)'}
                      </span>
                      {testResult.passed ? (
                        <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                      ) : (
                        <XCircle className="text-red-600 dark:text-red-400" size={20} />
                      )}
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Input:</span>
                        <pre className="mt-1 text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-black/20 p-1 rounded">{testResult.input_data}</pre>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">Expected:</span>
                        <pre className="mt-1 text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-black/20 p-1 rounded">{testResult.expected_output}</pre>
                      </div>
                      {!testResult.passed && (
                        <div>
                          <span className="font-medium text-gray-600 dark:text-gray-400">Actual:</span>
                          <pre className="mt-1 text-red-700 dark:text-red-400 bg-white/50 dark:bg-black/20 p-1 rounded">{testResult.actual_output}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setShowTutor(true);
                fetchInitialHint();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MessageSquare size={18} />
              Chat with Agent
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-4 border border-transparent dark:border-slate-700">
          {/* Explanation Section */}
          {selectedQuestion.explanation && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Explanation</h3>
              <p className="text-blue-700 dark:text-blue-200">{selectedQuestion.explanation}</p>
            </div>
          )}

          {/* Concepts Section */}
          {selectedQuestion.concepts && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Recommended Topics</h3>
              <div className="flex flex-wrap gap-2">
                {(typeof selectedQuestion.concepts === 'string'
                  ? JSON.parse(selectedQuestion.concepts)
                  : selectedQuestion.concepts
                ).map((concept, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 mb-4">
              <button
                onClick={() => setActiveTab('user')}
                className={`px-4 py-2 font-medium transition-colors ${activeTab === 'user'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                Your Code
              </button>
              <button
                onClick={() => setActiveTab('solution')}
                className={`px-4 py-2 font-medium transition-colors ${activeTab === 'solution'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
              >
                Correct Solution
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg overflow-x-auto border border-gray-200 dark:border-slate-700">
              <pre className="text-sm font-mono text-gray-800 dark:text-gray-300 whitespace-pre">
                {activeTab === 'user'
                  ? selectedQuestion.submission?.submitted_code || 'No code submitted'
                  : selectedQuestion.reference_solution || 'No solution available'}
              </pre>
            </div>
          </div>
        </div>

        {/* AI Tutor Chat Modal */}
        {showTutor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-blue-600" size={24} />
                  <h3 className="text-lg font-bold text-gray-800">AI Tutor</h3>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Online</span>
                </div>
                <button
                  onClick={() => setShowTutor(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {tutorMessages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
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
                        : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {tutorLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <p className="text-gray-600">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200">
                <form
                  onSubmit={handleTutorSubmit}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={tutorInput}
                    onChange={(e) => setTutorInput(e.target.value)}
                    placeholder="Ask a question about your code or the test results..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <p className="text-xs text-gray-500 mt-2">
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


