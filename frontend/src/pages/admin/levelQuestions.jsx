import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Edit, Trash2, Plus } from 'lucide-react';

const LevelQuestions = () => {
  const { courseId, levelId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [level, setLevel] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionType, setQuestionType] = useState(searchParams.get('type') || 'coding'); // 'coding' | 'mcq'
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Level title mapping removed in favor of dynamic titles from backend

  // Filter questions based on current question type (client-side filtering for instant tab switch)
  const questions = allQuestions.filter(q => q.question_type === questionType);

  useEffect(() => {
    const typeFromUrl = searchParams.get('type') || 'coding';
    setQuestionType(typeFromUrl);
    // Reset selection when switching tabs
    setSelectedIds(new Set());
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [courseId, levelId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch level details
      const levelRes = await api.get(`/courses/${courseId}/levels/${levelId}`);
      setLevel(levelRes.data);

      // Fetch questions for this level
      const questionsRes = await api.get(`/admin/levels/${levelId}/questions`);
      const fetchedQuestions = questionsRes.data.data || questionsRes.data || [];

      // Store all questions without filtering
      setAllQuestions(fetchedQuestions);
      setSelectedIds(new Set()); // Reset selection on data fetch

    } catch (err) {
      console.error('Failed to load level questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId, questionTitle) => {
    if (confirm(`Are you sure you want to delete "${questionTitle}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/admin/questions/${questionId}`);
        alert('Question deleted successfully');
        fetchData();
      } catch (err) {
        alert('Failed to delete question: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedIds.size} questions? This action cannot be undone.`)) {
      try {
        setLoading(true);
        // Execute bulk delete via improved API
        await api.post('/admin/questions/bulk-delete', { questionIds: Array.from(selectedIds) });

        alert('Questions deleted successfully');
        // Clear selection and refresh
        setSelectedIds(new Set());
        fetchData();
      } catch (err) {
        alert('Failed to delete questions: ' + (err.response?.data?.error || err.message));
        setLoading(false); // Only stop loading on error, otherwise fetchData will handle it
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-blue-600 bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Breadcrumb Navigation */}
        <AdminBreadcrumb items={[
          { label: 'Courses', path: '/admin/courses' },
          { label: level?.course_title || 'Course', path: `/admin/courses/${courseId}/levels` },
          { label: level?.title || `Level ${level?.level_number}`, path: null }
        ]} />

        {/* Header Section */}
        <div className="mb-8">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {level?.title ? `Level ${level?.level_number}: ${level?.title}` : 'Level Questions'}
              </h1>
              <p className="text-gray-500 dark:text-slate-400 mt-1">
                {level?.description ? `${level.description} • ` : ''}{questions.length} {questionType === 'coding' ? 'Coding' : 'MCQ'} Questions
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
                >
                  <Trash2 size={20} /> Delete Selected ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => navigate(`/admin/questions/create?levelId=${levelId}&courseId=${courseId}&type=${questionType}`)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 font-medium"
              >
                <Plus size={20} /> Add Question
              </button>
            </div>
          </div>
        </div>

        {/* Selection Header */}
        {questions.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={questions.length > 0 && selectedIds.size === questions.length}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700"
              />
              <span className="text-gray-700 dark:text-slate-300 font-medium">Select All</span>
            </label>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {selectedIds.size} of {questions.length} selected
            </span>
          </div>
        )}

        {/* Question Type Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                setQuestionType('coding');
                navigate(`/admin/courses/${courseId}/levels/${levelId}/questions?type=coding`, { replace: true });
              }}
              className={`pb-3 px-1 text-sm font-medium transition-all relative ${questionType === 'coding' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
            >
              Coding Questions
              {questionType === 'coding' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></div>}
            </button>
            <button
              onClick={() => {
                setQuestionType('mcq');
                navigate(`/admin/courses/${courseId}/levels/${levelId}/questions?type=mcq`, { replace: true });
              }}
              className={`pb-3 px-1 text-sm font-medium transition-all relative ${questionType === 'mcq' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}`}
            >
              Multiple Choice
              {questionType === 'mcq' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></div>}
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3">
          {questions.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
              <p className="text-gray-400 dark:text-slate-500 text-lg">
                No {questionType === 'coding' ? 'Coding' : 'MCQ'} questions in this level yet.
              </p>
              <button
                onClick={() => navigate(`/admin/questions/create?levelId=${levelId}&courseId=${courseId}&type=${questionType}`)}
                className="mt-4 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Add First Question
              </button>
            </div>
          ) : (
            questions.map(q => (
              <div
                key={q.id}
                className={`bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm dark:shadow-slate-900/50 flex items-center justify-between transition-all cursor-pointer group ${selectedIds.has(q.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' : 'border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md'}`}
                onClick={() => toggleSelect(q.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(q.id)}
                      onChange={() => toggleSelect(q.id)}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                    />
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded uppercase ${q.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : q.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'}`}>
                    {q.difficulty}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-gray-800 dark:text-white font-semibold text-lg group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {q.title}
                    </h3>
                    {q.description && (
                      <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 line-clamp-2">
                        {q.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/questions/edit/${q.id}?type=${q.question_type}&courseId=${courseId}&levelId=${levelId}`);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-600"
                    title="Edit Question"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(q.id, q.title);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900"
                    title="Delete Question"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LevelQuestions;
