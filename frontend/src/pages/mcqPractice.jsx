import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { ArrowRight, ArrowLeft, CheckCircle, X, Lightbulb, Clock, LayoutGrid, AlertCircle, HelpCircle } from 'lucide-react';

const MCQPractice = () => {
  const { courseId, levelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [hint, setHint] = useState(null);
  const [previousHints, setPreviousHints] = useState([]); // Track hints to prevent repetition
  const [loadingHint, setLoadingHint] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    startSession();
  }, [courseId, levelId]);

  useEffect(() => {
    if (!session) return;
    if (timeLeft <= 0 && !autoSubmitted) {
      handleFinish(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, session, autoSubmitted]);

  const startSession = async () => {
    try {
      const sessionTypeFromState = location.state?.sessionType || 'mcq';
      const response = await api.post('/sessions/start', {
        courseId,
        levelId,
        sessionType: sessionTypeFromState,
      });
      setSession(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please try again.');
      setLoading(false);
    }
  };

  const handleOptionSelect = (optionId) => {
    if (submitted) return;
    setSelectedOptions({ ...selectedOptions, [currentQuestionIndex]: optionId });
  };

  const handleClearSelection = () => {
    if (submitted) return;
    const newSelectedOptions = { ...selectedOptions };
    delete newSelectedOptions[currentQuestionIndex];
    setSelectedOptions(newSelectedOptions);
  };

  const handleGetHint = async () => {
    if (hint && !loadingHint) {
      setShowHint(true);
      return;
    }
    setLoadingHint(true);
    setShowHint(true);
    try {
      const currentQuestion = session.questions[currentQuestionIndex];
      const attemptCount = previousHints.length + 1;

      const response = await api.post('/ai-tutor/mcq-hint', {
        questionId: currentQuestion.question_id,
        attemptCount: attemptCount,
        previousHints: previousHints, // Send previous hints to avoid repetition
      });

      const newHint = response.data.hint;
      setHint(newHint);
      setPreviousHints(prev => [...prev, newHint]); // Track this hint
    } catch (error) {
      console.error('Failed to get hint:', error);
      setHint("Review the question's key terms. Try to eliminate obviously incorrect options first.");
    } finally {
      setLoadingHint(false);
    }
  };

  const handleNext = async () => {
    const selectedOptionId = selectedOptions[currentQuestionIndex];
    if (!selectedOptionId) {
      // Allow skipping? For now, enforcing selection as per previous logic
      alert('Please select an option');
      return;
    }

    try {
      await api.post(`/sessions/${session.id}/submit`, {
        questionId: session.questions[currentQuestionIndex].question_id,
        selected_option_id: selectedOptionId,
      });

      if (currentQuestionIndex < session.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setHint(null);
        setPreviousHints([]); // Reset hints for new question
        setShowHint(false);
      } else {
        handleFinish(false);
      }
    } catch (error) {
      console.error('Submit answer error:', error);
    }
  };

  const handleFinish = async (auto = false) => {
    if (!session) return;
    // Batch submit remaining
    const submitPromises = [];
    Object.entries(selectedOptions).forEach(([idx, optId]) => {
      const q = session.questions[idx];
      if (q) {
        submitPromises.push(
          api.post(`/sessions/${session.id}/submit`, {
            questionId: q.question_id,
            selected_option_id: optId
          }).catch(e => console.warn(e))
        );
      }
    });

    await Promise.all(submitPromises);
    if (auto) setAutoSubmitted(true);

    try {
      await api.post(`/sessions/${session.id}/complete`);
      navigate(`/results/${session.id}`, { replace: true });
    } catch (err) {
      console.error('Complete session error:', err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading || !session) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">Loading your session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50 dark:bg-slate-900 overflow-hidden max-w-full">

        {/* Sidebar - Question Navigator */}
        <div className="hidden lg:flex flex-col w-80 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 shadow-sm z-10">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Question {currentQuestionIndex + 1} of {session.questions.length}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-4 gap-3">
              {session.questions.map((_, index) => {
                const isCurrent = index === currentQuestionIndex;
                const isAnswered = selectedOptions[index] !== undefined;
                return (
                  <button
                    key={index}
                    onClick={() => { setCurrentQuestionIndex(index); setHint(null); setPreviousHints([]); setShowHint(false); }}
                    className={`
                      relative flex items-center justify-center w-12 h-12 rounded-xl text-sm font-bold transition-all duration-200
                      ${isCurrent
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 ring-2 ring-blue-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-800'
                        : isAnswered
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }
                    `}
                  >
                    {index + 1}
                    {isAnswered && !isCurrent && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div> Current
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-green-500 opacity-20 border border-green-500"></div> Answered
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-slate-600"></div> Unanswered
              </div>
            </div>
          </div>



        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full relative">
          {/* Top Bar for Mobile/Tablet */}
          <div className="lg:hidden bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <span className="font-bold text-gray-700 dark:text-white">Q {currentQuestionIndex + 1}/{session.questions.length}</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-mono font-medium">
              <Clock size={14} />
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-gray-200 dark:bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-smooth">
            <div className="max-w-4xl mx-auto w-full">

              {/* Header Section */}
              <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                    {currentQuestion.title}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    Multiple Choice
                  </span>
                </div>

                <div className="hidden lg:flex items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm">
                    <Clock size={18} className="text-blue-600" />
                    <span className="font-mono text-lg font-bold text-gray-700 dark:text-gray-200">{formatTime(timeLeft)}</span>
                  </div>
                  <button
                    onClick={() => handleFinish(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                  >
                    Finish Test
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-slate-300 mb-10 leading-relaxed">
                {currentQuestion.description}
              </div>

              {/* Hint Section */}
              <div className="mb-8">
                {!showHint ? (
                  <button
                    onClick={handleGetHint}
                    className="group flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-500 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all font-medium text-sm"
                  >
                    <Lightbulb size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Stuck? Get a Hint</span>
                  </button>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500 font-semibold">
                        <Lightbulb size={18} />
                        <h3>AI Coach Hint</h3>
                      </div>
                      <button onClick={() => setShowHint(false)} className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-400">
                        <X size={18} />
                      </button>
                    </div>

                    {loadingHint ? (
                      <div className="flex items-center gap-2 py-2 text-amber-600/70">
                        <div className="w-4 h-4 border-2 border-amber-500/50 border-t-amber-600 rounded-full animate-spin"></div>
                        <span className="text-sm">Consulting AI tutor...</span>
                      </div>
                    ) : (
                      <div className="text-amber-800 dark:text-amber-200/90 text-sm leading-relaxed">
                        {hint}
                      </div>
                    )}

                    {!loadingHint && (
                      <button
                        onClick={() => { setHint(null); handleGetHint(); }}
                        className="mt-3 text-xs font-semibold text-amber-600 dark:text-amber-500 hover:underline"
                      >
                        Need more help? Ask again
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-4 mb-12">
                {currentQuestion.options?.map((option) => {
                  const isSelected = selectedOptions[currentQuestionIndex] === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      className={`
                        group relative flex items-center p-4 md:p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
                        ${isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 shadow-md ring-1 ring-blue-500/20'
                          : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-slate-600 hover:shadow-sm'
                        }
                      `}
                    >
                      <div className={`
                        flex items-center justify-center w-6 h-6 rounded-full border-2 mr-4 transition-colors
                        ${isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 dark:border-slate-500 group-hover:border-blue-400'
                        }
                      `}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>

                      <span className={`text-lg transition-colors ${isSelected ? 'text-blue-900 dark:text-blue-100 font-medium' : 'text-gray-700 dark:text-slate-300'}`}>
                        {option.option_text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer / Controls */}
              <div className="flex items-center justify-between pt-8 border-t border-gray-100 dark:border-slate-800">
                <button
                  disabled={!selectedOptions[currentQuestionIndex]}
                  onClick={handleClearSelection}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-0"
                >
                  Clear Selection
                </button>

                <div className="flex gap-4">
                  {currentQuestionIndex > 0 && (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <ArrowLeft size={18} /> Back
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all flex items-center gap-2 transform active:scale-95"
                  >
                    {currentQuestionIndex === session.questions.length - 1 ? 'Complete Test' : 'Next Question'}
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MCQPractice;
