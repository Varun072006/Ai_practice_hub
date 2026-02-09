import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Plus, Edit, Trash2, Upload, Loader, X, Search, Eye, Code, FileQuestion, ExternalLink } from 'lucide-react';

const AdminCourseLevels = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLevel, setEditingLevel] = useState(null);
  const [editingDescription, setEditingDescription] = useState(null);

  const mcqHeaders = ['title', 'description', 'option1', 'option2', 'option3', 'option4', 'correct_option', 'difficulty'];
  const codingHeaders = ['title', 'description', 'input_format', 'output_format', 'constraints', 'reference_solution', 'difficulty', 'test_case_1_input (optional)', 'test_case_1_output (optional)', 'test_case_2_input (optional)', 'test_case_2_output (optional)'];
  const htmlCssHeaders = ['description', 'instructions', 'tags', 'assets', 'expectedHtml', 'expectedCss', 'expectedJs'];

  const isHtmlCssCourse = course?.title?.toLowerCase().includes('html') || course?.title?.toLowerCase().includes('css');

  // Modals
  const [csvUploadModal, setCsvUploadModal] = useState({ show: false, levelId: null, uploading: false, questionType: null });
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);
  const [courseFormData, setCourseFormData] = useState({ title: '', description: '', total_levels: 1 });

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, levelsRes, questionsRes] = await Promise.all([
        api.get('/courses'),
        api.get(`/courses/${courseId}/levels`),
        api.get('/questions')
      ]);

      const currentCourse = coursesRes.data.find(c => c.id === courseId);
      setCourse(currentCourse);
      setLevels(levelsRes.data);

      const questionsByLevel = {};
      const allQuestions = questionsRes.data.data || [];
      allQuestions.forEach(q => {
        if (!questionsByLevel[q.level_id]) questionsByLevel[q.level_id] = [];
        questionsByLevel[q.level_id].push(q);
      });
      setQuestions(questionsByLevel);
    } catch (err) {
      console.error('Failed to load course data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvUploadModal(prev => ({ ...prev, uploading: true }));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('level_id', csvUploadModal.levelId);
    if (csvUploadModal.questionType) formData.append('question_type', csvUploadModal.questionType);

    try {
      const res = await api.post('/admin/questions/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.errors && res.data.errors.length > 0) {
        alert(`Uploaded ${res.data.count} questions!\nErrors: ${res.data.errors.length}\n\n${res.data.errors.slice(0, 5).join('\n')}${res.data.errors.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`Uploaded ${res.data.count} questions! Errors: ${res.data.errors?.length || 0}`);
      }
      setCsvUploadModal({ show: false, levelId: null, uploading: false, questionType: null });
      fetchData();
    } catch (err) {
      console.error('CSV upload error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Upload failed';
      const errorDetails = err.response?.data?.details || '';
      alert(`Upload failed: ${errorMessage}${errorDetails ? '\n\nDetails: ' + errorDetails.substring(0, 200) : ''}`);
      setCsvUploadModal(prev => ({ ...prev, uploading: false }));
    }
  };

  const handleAddLevel = async () => {
    const title = prompt('Enter new level title:');
    if (!title || !title.trim()) return;

    try {
      const nextLevelNumber = levels.length + 1;
      await api.post('/admin/levels', {
        course_id: courseId,
        level_number: nextLevelNumber,
        title: title.trim(),
        description: ''
      });
      fetchData();
    } catch (err) {
      console.error('Failed to add level:', err);
      alert('Failed to add level');
    }
  };

  const handleDeleteLevel = async (levelId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this level? This action cannot be undone.')) return;

    try {
      await api.delete(`/admin/levels/${levelId}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete level:', err);
      const errorMessage = err.response?.data?.error || 'Failed to delete level';
      alert(errorMessage);
    }
  };

  const handleLevelTitleUpdate = async (levelId, newTitle) => {
    if (!newTitle.trim()) {
      setEditingLevel(null);
      return;
    }
    try {
      await api.put(`/admin/levels/${levelId}/details`, { title: newTitle.trim() });
      fetchData();
      setEditingLevel(null);
    } catch (err) {
      alert('Failed to update level title: ' + (err.response?.data?.error || err.message));
      setEditingLevel(null);
    }
  };

  const handleLevelDescriptionUpdate = async (levelId, newDescription) => {
    try {
      await api.put(`/admin/levels/${levelId}/details`, { description: newDescription.trim() });
      fetchData();
      setEditingDescription(null);
    } catch (err) {
      alert('Failed to update level description: ' + (err.response?.data?.error || err.message));
      setEditingDescription(null);
    }
  };

  const openCourseEditModal = () => {
    if (course) {
      setCourseFormData({
        title: course.title,
        description: course.description || '',
        total_levels: course.total_levels
      });
      setShowCourseEditModal(true);
    }
  };

  const handleCourseUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/courses/${courseId}`, courseFormData);
      alert('Course updated successfully');
      setShowCourseEditModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to update course:', err);
      alert('Failed to update course');
    }
  };

  const getQuestionCounts = (levelId) => {
    const levelQuestions = questions[levelId] || [];
    const mcqCount = levelQuestions.filter(q => q.question_type === 'mcq').length;
    const codingCount = levelQuestions.filter(q => q.question_type === 'coding').length;
    return { mcqCount, codingCount, total: levelQuestions.length };
  };

  const filteredLevels = levels.filter(level =>
    (level.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (level.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          { label: course?.title || 'Course', path: null }
        ]} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{course?.title}</h1>
            <p className="text-gray-600 dark:text-slate-400">{levels.length} Levels • Manage course structure and questions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCourseEditModal}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Edit size={16} />
              Edit Course
            </button>
            <button
              onClick={handleAddLevel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus size={18} />
              Add New Level
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
                placeholder="Search levels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">MCQ</th>
                  <th className="px-6 py-4">Coding</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredLevels.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                      {searchTerm ? 'No levels found matching your search.' : 'No levels yet. Click "Add New Level" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredLevels.map((level, idx) => {
                    const counts = getQuestionCounts(level.id);
                    return (
                      <tr
                        key={level.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editingLevel === level.id ? (
                            <input
                              type="text"
                              defaultValue={level.title}
                              onBlur={(e) => handleLevelTitleUpdate(level.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur();
                                if (e.key === 'Escape') setEditingLevel(null);
                              }}
                              className="px-2 py-1 border-2 border-blue-500 rounded focus:outline-none bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 dark:text-white">{level.title || `Level ${level.level_number}`}</span>
                              <button
                                onClick={() => setEditingLevel(level.id)}
                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1"
                                title="Edit title"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 max-w-xs">
                          {editingDescription === level.id ? (
                            <textarea
                              defaultValue={level.description || ''}
                              onBlur={(e) => handleLevelDescriptionUpdate(level.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) e.target.blur();
                                if (e.key === 'Escape') setEditingDescription(null);
                              }}
                              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none resize-none bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                              rows={2}
                              autoFocus
                              placeholder="Enter description..."
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="truncate">{level.description || 'No description'}</span>
                              <button
                                onClick={() => setEditingDescription(level.id)}
                                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 flex-shrink-0"
                                title="Edit description"
                              >
                                <Edit size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/admin/courses/${courseId}/levels/${level.id}/questions?type=mcq`)}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                          >
                            <FileQuestion size={12} className="mr-1" />
                            {counts.mcqCount}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => navigate(`/admin/courses/${courseId}/levels/${level.id}/questions?type=coding`)}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                          >
                            <Code size={12} className="mr-1" />
                            {counts.codingCount}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`/admin/courses/${courseId}/levels/${level.id}/preview`)}
                              className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="View Overview"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => setCsvUploadModal({ show: true, levelId: level.id, uploading: false, questionType: null })}
                              className="p-2 text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Import CSV"
                            >
                              <Upload size={16} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/questions/create?levelId=${level.id}&courseId=${courseId}`)}
                              className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Add Question"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteLevel(level.id, e)}
                              className="p-2 text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Delete Level"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
            <span>Showing {filteredLevels.length} of {levels.length} levels</span>
          </div>
        </div>

        {/* Course Edit Modal */}
        {showCourseEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden border dark:border-slate-700">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Edit className="text-blue-600 dark:text-blue-400" /> Edit Course
                </h3>
              </div>
              <form onSubmit={handleCourseUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    value={courseFormData.title}
                    onChange={(e) => setCourseFormData({ ...courseFormData, title: e.target.value })}
                    placeholder="e.g., Introduction to C"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={courseFormData.description}
                    onChange={(e) => setCourseFormData({ ...courseFormData, description: e.target.value })}
                    placeholder="Course description..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Number of Levels
                  </label>
                  <input
                    type="number"
                    value={courseFormData.total_levels}
                    onChange={(e) => setCourseFormData({ ...courseFormData, total_levels: parseInt(e.target.value) })}
                    placeholder="e.g., 10"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                    required
                    min="1"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCourseEditModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSV Upload Modal */}
        {csvUploadModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden border dark:border-slate-700">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Upload className="text-green-600 dark:text-green-400" /> Upload CSV
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {!csvUploadModal.questionType ? (
                  <div className="grid gap-4 grid-cols-2">
                    {isHtmlCssCourse ? (
                      <button onClick={() => setCsvUploadModal({ ...csvUploadModal, questionType: 'htmlcss' })} className="flex-1 py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all flex flex-col items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400">
                        <span className="font-bold">HTML/CSS</span>
                      </button>
                    ) : (
                      <button onClick={() => setCsvUploadModal({ ...csvUploadModal, questionType: 'coding' })} className="flex-1 py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all flex flex-col items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                        <span className="font-bold">Coding</span>
                      </button>
                    )}
                    <button onClick={() => setCsvUploadModal({ ...csvUploadModal, questionType: 'mcq' })} className="flex-1 py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all flex flex-col items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
                      <span className="font-bold">MCQ</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                      Upload <b>{csvUploadModal.questionType}</b> questions CSV.
                    </p>
                    {csvUploadModal.questionType === 'mcq' && (
                      <div className="mb-4 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Required columns:</p>
                        <ul className="text-sm text-gray-600 dark:text-slate-400 list-disc list-inside space-y-1">
                          {mcqHeaders.map(header => (
                            <li key={header}><code className="bg-white dark:bg-slate-600 px-1 py-0.5 rounded text-xs">{header}</code></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {csvUploadModal.questionType === 'coding' && (
                      <div className="mb-4 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Required columns:</p>
                        <ul className="text-sm text-gray-600 dark:text-slate-400 list-disc list-inside space-y-1">
                          {codingHeaders.slice(0, 7).map(header => (
                            <li key={header}><code className="bg-white dark:bg-slate-600 px-1 py-0.5 rounded text-xs">{header}</code></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {csvUploadModal.questionType === 'htmlcss' && (
                      <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-3">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">Required columns:</p>
                        <ul className="text-sm text-purple-600 dark:text-purple-400 list-disc list-inside space-y-1">
                          {htmlCssHeaders.map(header => (
                            <li key={header}><code className="bg-white dark:bg-slate-700 px-1 py-0.5 rounded text-xs">{header}</code></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileSelect}
                      disabled={csvUploadModal.uploading}
                      className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 cursor-pointer"
                    />
                    {csvUploadModal.uploading && <div className="mt-4 text-center text-blue-600 dark:text-blue-400 text-sm font-medium animate-pulse">Uploading and processing...</div>}
                  </div>
                )}
                <button onClick={() => setCsvUploadModal({ show: false, levelId: null, uploading: false, questionType: null })} className="w-full py-2.5 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCourseLevels;
