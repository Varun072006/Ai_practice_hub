import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Edit, Trash2, Plus, Search } from 'lucide-react';

const LevelQuestions = () => {
  const { courseId, levelId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [level, setLevel] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionType, setQuestionType] = useState(searchParams.get('type') || 'coding');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Filter questions based on current question type
  const questions = allQuestions.filter(q => q.question_type === questionType);

  // Further filter by search term
  const filteredQuestions = questions.filter(q =>
    (q.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const typeFromUrl = searchParams.get('type') || 'coding';
    setQuestionType(typeFromUrl);
    setSelectedIds(new Set());
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [courseId, levelId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const levelRes = await api.get(`/courses/${courseId}/levels/${levelId}`);
      setLevel(levelRes.data);

      const questionsRes = await api.get(`/admin/levels/${levelId}/questions`);
      const fetchedQuestions = questionsRes.data.data || questionsRes.data || [];
      setAllQuestions(fetchedQuestions);
      setSelectedIds(new Set());
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
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedIds.size} questions? This action cannot be undone.`)) {
      try {
        setLoading(true);
        await api.post('/admin/questions/bulk-delete', { questionIds: Array.from(selectedIds) });
        alert('Questions deleted successfully');
        setSelectedIds(new Set());
        fetchData();
      } catch (err) {
        alert('Failed to delete questions: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    }
  };

  const getDifficultyStyles = (difficulty) => {
    switch (difficulty) {
      case 'hard':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
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
        {/* Breadcrumb */}
        <AdminBreadcrumb items={[
          { label: 'Courses', path: '/admin/courses' },
          { label: level?.course_title || 'Course', path: `/admin/courses/${courseId}/levels` },
          { label: level?.title || `Level ${level?.level_number}`, path: null }
        ]} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              {level?.title ? `Level ${level?.level_number}: ${level?.title}` : 'Level Questions'}
            </h1>
            <p className="text-gray-600 dark:text-slate-400">
              {level?.description ? `${level.description} • ` : ''}{questions.length} {questionType === 'coding' ? 'Coding' : 'MCQ'} Questions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-medium"
              >
                <Trash2 size={18} />
                Delete Selected ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => navigate(`/admin/questions/create?levelId=${levelId}&courseId=${courseId}&type=${questionType}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={18} />
              Add Question
            </button>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Question Type Tabs */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
              <button
                onClick={() => {
                  setQuestionType('coding');
                  setSearchTerm('');
                  navigate(`/admin/courses/${courseId}/levels/${levelId}/questions?type=coding`, { replace: true });
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${questionType === 'coding'
                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
              >
                Coding ({allQuestions.filter(q => q.question_type === 'coding').length})
              </button>
              <button
                onClick={() => {
                  setQuestionType('mcq');
                  setSearchTerm('');
                  navigate(`/admin/courses/${courseId}/levels/${levelId}/questions?type=mcq`, { replace: true });
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${questionType === 'mcq'
                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
              >
                MCQ ({allQuestions.filter(q => q.question_type === 'mcq').length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                  <th className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={filteredQuestions.length > 0 && selectedIds.size === filteredQuestions.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700"
                    />
                  </th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4">Question Title</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredQuestions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                      {searchTerm
                        ? 'No questions found matching your search.'
                        : `No ${questionType === 'coding' ? 'Coding' : 'MCQ'} questions in this level yet.`}
                      {!searchTerm && (
                        <button
                          onClick={() => navigate(`/admin/questions/create?levelId=${levelId}&courseId=${courseId}&type=${questionType}`)}
                          className="block mx-auto mt-3 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          Add First Question
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredQuestions.map(q => (
                    <tr
                      key={q.id}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${selectedIds.has(q.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      onClick={() => toggleSelect(q.id)}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelect(q.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getDifficultyStyles(q.difficulty)}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-800 dark:text-white">{q.title}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 max-w-md truncate">
                        {q.description || '-'}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/questions/edit/${q.id}?type=${q.question_type}&courseId=${courseId}&levelId=${levelId}`)}
                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit Question"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id, q.title)}
                            className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Delete Question"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${filteredQuestions.length} selected`
                : `Showing ${filteredQuestions.length} of ${questions.length} questions`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelQuestions;
