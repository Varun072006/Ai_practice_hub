import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Plus, Edit, Trash2, Clock, Upload, Loader, Sparkles, X } from 'lucide-react';

const AdminCourseLevels = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingLevel, setEditingLevel] = useState(null); // Track which level title is being edited: levelId
  const [editingDescription, setEditingDescription] = useState(null); // Track which level description is being edited: levelId
  const mcqHeaders = [
    'title',
    'description',
    'option1',
    'option2',
    'option3',
    'option4',
    'correct_option',
    'difficulty',
  ];
  const codingHeaders = [
    'title',
    'description',
    'input_format',
    'output_format',
    'constraints',
    'reference_solution',
    'difficulty',
    'test_case_1_input (optional)',
    'test_case_1_output (optional)',
    'test_case_2_input (optional)',
    'test_case_2_output (optional)',
  ];
  const htmlCssHeaders = [
    'description',
    'instructions',
    'tags',
    'assets',
    'expectedHtml',
    'expectedCss',
    'expectedJs',
  ];

  // Check if this is an HTML/CSS course
  const isHtmlCssCourse = course?.title?.toLowerCase().includes('html') || course?.title?.toLowerCase().includes('css');

  // Level title mapping for Machine Learning course
  const levelTitleMap = {
    1: 'ML Basics',
    2: 'Regression Core',
    3: 'Model Metrics',
    4: 'Tree Models',
    5: 'Probabilistic Models',
    6: 'Advanced Classification',
    7: 'Clustering Basics',
    8: 'Advanced Clustering',
    9: 'Model Comparison',
    10: 'ML Mastery'
  };

  // Modals
  const [timeLimitModal, setTimeLimitModal] = useState({ show: false, levelId: null, timeLimit: null });
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
        api.get('/courses'), // Fetch all courses to find current one
        api.get(`/courses/${courseId}/levels`),
        api.get('/questions') // Fetch all questions to filter by level
      ]);

      const currentCourse = coursesRes.data.find(c => c.id === courseId);
      setCourse(currentCourse);
      setLevels(levelsRes.data);

      // Group questions by level
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

  const handleDeleteLevel = async (levelId) => {
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


  if (loading) return <div className="flex min-h-screen items-center justify-center text-blue-600 bg-gray-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">

        {/* Breadcrumb Navigation */}
        <AdminBreadcrumb items={[
          { label: 'Courses', path: '/admin/courses' },
          { label: course?.title || 'Course', path: null }
        ]} />

        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{course?.title}</h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1">{course?.levels?.length || 0} Levels • Last updated {new Date().toLocaleDateString()}</p>
          </div>
          <button
            onClick={handleAddLevel}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 font-medium"
          >
            <Plus size={20} /> Add New Level
          </button>
        </div>

        {/* Levels Grid */}
        <div className="space-y-8">
          {levels.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
              <div className="bg-blue-50 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500 dark:text-blue-400">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Levels Yet</h3>
              <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-2 mb-6">Start building your course structure by adding the first level.</p>
              <button onClick={handleAddLevel} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Create First Level</button>
            </div>
          )}

          {levels.map((level, idx) => (
            <div key={level.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">

              {/* Level Header */}
              <div className="p-6 border-b border-gray-50 dark:border-slate-700 flex items-start justify-between bg-gradient-to-r from-white dark:from-slate-800 to-gray-50/50 dark:to-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border border-blue-200 dark:border-blue-800">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {editingLevel === level.id ? (
                        <input
                          type="text"
                          defaultValue={level.title || levelTitleMap[level.level_number]}
                          onBlur={(e) => {
                            // Save the new title
                            const newTitle = e.target.value.trim();
                            const currentTitle = level.title || levelTitleMap[level.level_number];
                            if (newTitle && newTitle !== currentTitle) {
                              // Update level title via API
                              api.put(`/admin/levels/${level.id}/details`, {
                                title: newTitle
                              }).then(() => {
                                // Refresh data to get updated title
                                fetchData();
                                setEditingLevel(null);
                                alert('✅ Title updated successfully!');
                              }).catch(err => {
                                alert('Failed to update level title: ' + (err.response?.data?.error || err.message));
                                setEditingLevel(null);
                              });
                            } else {
                              setEditingLevel(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            } else if (e.key === 'Escape') {
                              setEditingLevel(null);
                            }
                          }}
                          className="text-xl font-bold text-gray-800 dark:text-white border-2 border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                            {level.title || levelTitleMap[level.level_number]}
                          </h3>
                          <button
                            onClick={() => setEditingLevel(level.id)}
                            className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
                            title="Edit title"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      )}
                      {editingLevel === level.id ? (
                        <button
                          onClick={() => setEditingLevel(null)}
                          className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                          title="Cancel editing"
                        >
                          <X size={18} />
                        </button>
                      ) : null}
                    </div>
                    {editingDescription === level.id ? (
                      <div className="mt-2">
                        <textarea
                          defaultValue={level.description || ''}
                          onBlur={(e) => {
                            // Save the new description
                            const newDescription = e.target.value.trim();
                            const currentDescription = level.description || '';
                            if (newDescription !== currentDescription) {
                              // Update level description via API
                              api.put(`/admin/levels/${level.id}/details`, {
                                description: newDescription
                              }).then(() => {
                                // Refresh data to get updated description
                                fetchData();
                                setEditingDescription(null);
                                alert('✅ Description updated successfully!');
                              }).catch(err => {
                                alert('Failed to update level description: ' + (err.response?.data?.error || err.message));
                                setEditingDescription(null);
                              });
                            } else {
                              setEditingDescription(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              e.target.blur();
                            } else if (e.key === 'Escape') {
                              setEditingDescription(null);
                            }
                          }}
                          className="w-full text-sm text-gray-700 dark:text-slate-300 border-2 border-blue-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-700"
                          rows={3}
                          autoFocus
                          placeholder="Enter level description..."
                        />
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Press Ctrl+Enter to save, Esc to cancel</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 mt-0.5">
                        <div className="flex items-start gap-2">
                          <p className="text-gray-500 dark:text-slate-400 text-sm flex-1">{level.description || 'No description'}</p>
                          <button
                            onClick={() => setEditingDescription(level.id)}
                            className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 flex-shrink-0"
                            title="Edit details"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                        {/* Image Preview if exists */}
                        {level.image_url && (
                          <div className="mt-2 text-xs text-gray-400 dark:text-slate-500 flex items-center gap-2">
                            <span className="font-semibold text-xs border border-gray-200 dark:border-slate-600 px-1 rounded bg-gray-50 dark:bg-slate-700">IMAGE</span>
                            <a href={level.image_url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[200px] hover:underline hover:text-blue-500 dark:hover:text-blue-400">{level.image_url}</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate(`/admin/courses/${courseId}/levels/${level.id}/preview`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800 font-medium text-sm"
                  >
                    <Edit size={16} /> View Overview
                  </button>
                  <button
                    onClick={() => setCsvUploadModal({ show: true, levelId: level.id, uploading: false, questionType: null })}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors border border-green-100 dark:border-green-800 font-medium text-sm"
                  >
                    <Upload size={16} /> Import CSV
                  </button>
                  <button
                    onClick={() => navigate(`/admin/questions/create?levelId=${level.id}&courseId=${courseId}`)}
                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    title="Add Manual Question"
                  >
                    <Plus size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteLevel(level.id)}
                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="Delete Level"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Questions Body - Navigate to questions page when buttons are clicked */}
              <div className="p-6 bg-gray-50/30 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate(`/admin/courses/${courseId}/levels/${level.id}/questions?type=coding`)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    Coding Questions
                  </button>
                  <button
                    onClick={() => navigate(`/admin/courses/${courseId}/levels/${level.id}/questions?type=mcq`)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    MCQ Questions
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>



        {/* COURSE EDIT MODAL */}
        {showCourseEditModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
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

        {/* CSV UPLOAD MODAL */}
        {csvUploadModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Upload className="text-green-600 dark:text-green-400" /> Upload CSV
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {!csvUploadModal.questionType ? (
                  <div className="grid gap-4 grid-cols-2">
                    {/* For HTML/CSS course: show HTML/CSS option instead of Coding */}
                    {isHtmlCssCourse ? (
                      <button onClick={() => setCsvUploadModal({ ...csvUploadModal, questionType: 'htmlcss' })} className="flex-1 py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all flex flex-col items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400">
                        <span className="font-bold">HTML/CSS</span>
                      </button>
                    ) : (
                      <button onClick={() => setCsvUploadModal({ ...csvUploadModal, questionType: 'coding' })} className="flex-1 py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all flex flex-col items-center gap-2 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                        <span className="font-bold">Coding</span>
                      </button>
                    )}
                    {/* MCQ option stays the same for all courses */}
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
                        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Required columns (exact):</p>
                        <ul className="text-sm text-gray-600 dark:text-slate-400 list-disc list-inside space-y-1">
                          {mcqHeaders.map(header => (
                            <li key={header}><code className="bg-white dark:bg-slate-600 px-1 py-0.5 rounded text-xs">{header}</code></li>
                          ))}
                        </ul>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                          <code>correct_option</code> must exactly match one of <code>option1</code>, <code>option2</code>, <code>option3</code>, or <code>option4</code> (case-insensitive).
                          <code>difficulty</code> must be one of: <code>easy</code>, <code>medium</code>, or <code>hard</code>.
                        </p>
                      </div>
                    )}
                    {csvUploadModal.questionType === 'coding' && (
                      <div className="mb-4 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Required columns (exact):</p>
                        <ul className="text-sm text-gray-600 dark:text-slate-400 list-disc list-inside space-y-1">
                          {codingHeaders.map(header => (
                            <li key={header}><code className="bg-white dark:bg-slate-600 px-1 py-0.5 rounded text-xs">{header}</code></li>
                          ))}
                        </ul>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                          Required: <code>title</code>, <code>description</code>, <code>reference_solution</code>, <code>difficulty</code>.
                          Optional: <code>input_format</code>, <code>output_format</code>, <code>constraints</code>, test case columns.
                          <code>difficulty</code> must be one of: <code>easy</code>, <code>medium</code>, or <code>hard</code>.
                        </p>
                      </div>
                    )}
                    {csvUploadModal.questionType === 'htmlcss' && (
                      <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-4 py-3">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2">Required columns (exact):</p>
                        <ul className="text-sm text-purple-600 dark:text-purple-400 list-disc list-inside space-y-1">
                          {htmlCssHeaders.map(header => (
                            <li key={header}><code className="bg-white dark:bg-slate-700 px-1 py-0.5 rounded text-xs">{header}</code></li>
                          ))}
                        </ul>
                        <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">
                          Required: <code>description</code>, <code>expectedHtml</code>.
                          Optional: <code>instructions</code>, <code>tags</code>, <code>assets</code>, <code>expectedCss</code>, <code>expectedJs</code>.
                        </p>
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
