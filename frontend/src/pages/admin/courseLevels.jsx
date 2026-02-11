import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Plus, Edit, Trash2, Upload, Loader, X, Search, Eye, Code, FileQuestion, ExternalLink, ArrowLeft, Image as ImageIcon, AlertTriangle, Check } from 'lucide-react';

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

  // Fix Assets Modal State
  const [fixAssetsModal, setFixAssetsModal] = useState({ show: false, loading: false, issues: [], fixedCount: 0 });

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

  // Fix Assets Logic moved to top


  const isJsCourse = course?.title?.toLowerCase().includes('javascript') || course?.title?.toLowerCase().includes('js');
  const showFixAssets = isHtmlCssCourse || isJsCourse;

  const handleScanAssets = async () => {
    setFixAssetsModal({ show: true, loading: true, issues: [], fixedCount: 0 });
    try {
      // 1. Fetch available assets
      const assetsRes = await api.get('/assets');
      const availableAssets = assetsRes.data.map(a => a.name);

      // 2. Fetch all questions for this course
      const allQuestions = Object.values(questions).flat();
      const foundIssues = [];

      allQuestions.forEach(q => {
        // Only check HTML/CSS or Coding questions
        if (q.question_type !== 'htmlcss' && q.question_type !== 'coding' && q.question_type !== 'web') return;

        // Helper regex generator for an asset
        // Matches asset name NOT preceded by /assets/ or assets/
        // We use a simplified check: if we find the filename, check provided context

        let needsFix = false;
        let details = [];

        const checkText = (text, fieldName) => {
          if (!text) return null;
          let newText = text;
          let changed = false;

          availableAssets.forEach(assetName => {
            // Regex to find filename.ext NOT preceded by /assets/ or assets/
            // Negative lookbehind is supported in modern JS (V8/Chrome/Node)
            // Match: (not /assets/)(not assets/) assetName
            // We'll use a safer approach for broader compatibility if needed, but modern browsers support lookbehind.
            // Let's use a capture group approach or simple lookbehind if we target modern env.
            // Given this is a specific user env, likely modern.

            if (newText.includes(assetName)) {
              // Check if it is poorly linked
              // We want to replace "foo.png" with "/assets/foo.png"
              // But ignore "/assets/foo.png" or "assets/foo.png"

              // Regex: Match assetName that is NOT preceded by /?assets/
              // We also want to avoid http://.../foo.png

              // Simple scan: split by assetName? No, use Regex.
              const regex = new RegExp(`(?<!\\/?assets\\/)(?<!http:\\/\\/)(?<!https:\\/\\/)\\b${assetName.replace('.', '\\.')}\\b`, 'g');

              if (regex.test(newText)) {
                changed = true;
                details.push(`Found unlinked '${assetName}' in ${fieldName}`);
              }
            }
          });
          return changed;
        };

        // 1. Check Description
        if (checkText(q.description, 'Description')) {
          needsFix = true;
        }

        // 2. Check Reference Solution (Code)
        if (q.reference_solution) {
          let isJson = false;
          try {
            const parsed = JSON.parse(q.reference_solution);
            // If it's an object with html/css/js, check each
            if (parsed && typeof parsed === 'object') {
              isJson = true;
              if (checkText(parsed.html, 'Solution HTML')) needsFix = true;
              if (checkText(parsed.css, 'Solution CSS')) needsFix = true;
              if (checkText(parsed.js, 'Solution JS')) needsFix = true;
            }
          } catch (e) {
            // Not JSON, treat as raw string
          }

          if (!isJson) {
            if (checkText(q.reference_solution, 'Reference Solution')) needsFix = true;
          }
        }

        // 3. Check HTML/CSS output format assets config (legacy check)
        if (q.output_format) {
          try {
            const config = typeof q.output_format === 'string' ? JSON.parse(q.output_format) : q.output_format;
            if (Array.isArray(config)) {
              config.forEach(a => {
                if (availableAssets.includes(a.name) && a.path !== `/assets/${a.name}` && a.path !== `assets/${a.name}`) {
                  needsFix = true;
                  details.push(`Fix asset config for '${a.name}'`);
                }
              });
            }
          } catch (e) { }
        }


        if (needsFix) {
          foundIssues.push({
            questionId: q.id,
            title: q.title,
            type: 'Asset Link',
            detail: [...new Set(details)].join(', '),
            fixAction: 'auto_link'
          });
        }
      });

      setFixAssetsModal({ show: true, loading: false, issues: foundIssues, fixedCount: 0 });

    } catch (err) {
      console.error("Failed to scan assets:", err);
      alert("Failed to scan assets");
      setFixAssetsModal({ show: false, loading: false, issues: [], fixedCount: 0 });
    }
  };

  const handleFixAssets = async () => {
    setFixAssetsModal(prev => ({ ...prev, loading: true }));
    let fixed = 0;

    const assetsRes = await api.get('/assets');
    const availableAssets = assetsRes.data.map(a => a.name);

    // Group issues by question (though our scan already produced one issue object per question, 
    // but defensive coding if we change scan logic later)
    const issuesToFix = fixAssetsModal.issues;

    for (const issue of issuesToFix) {
      // Find latest question data
      const q = Object.values(questions).flat().find(quest => quest.id === issue.questionId);
      if (!q) continue;

      let updatedFields = {};
      let modified = false;

      // Helper to replace text
      const applyReplacement = (text) => {
        if (!text) return text;
        let newText = text;
        availableAssets.forEach(asset => {
          // Replace standalone filename with /assets/filename
          // Regex: Lookbehind to ensure not already assets/
          const regex = new RegExp(`(?<!\\/?assets\\/)(?<!http:\\/\\/)(?<!https:\\/\\/)\\b${asset.replace('.', '\\.')}\\b`, 'g');
          newText = newText.replace(regex, `/assets/${asset}`);
        });
        return newText;
      };

      // 1. Fix Description
      if (q.description) {
        const newDesc = applyReplacement(q.description);
        if (newDesc !== q.description) {
          updatedFields.description = newDesc;
          modified = true;
        }
      }

      // 2. Fix Reference Solution
      if (q.reference_solution) {
        try {
          const parsed = JSON.parse(q.reference_solution);
          if (parsed && typeof parsed === 'object' && (parsed.html || parsed.css || parsed.js)) {
            // It is our Web Question JSON format
            const newHtml = applyReplacement(parsed.html);
            const newCss = applyReplacement(parsed.css);
            const newJs = applyReplacement(parsed.js);

            if (newHtml !== parsed.html || newCss !== parsed.css || newJs !== parsed.js) {
              updatedFields.reference_solution = JSON.stringify({
                ...parsed,
                html: newHtml,
                css: newCss,
                js: newJs
              });
              modified = true;
            }
          } else {
            throw new Error("Not Web JSON");
          }
        } catch (e) {
          // Treat as raw string
          const newSol = applyReplacement(q.reference_solution);
          if (newSol !== q.reference_solution) {
            updatedFields.reference_solution = newSol;
            modified = true;
          }
        }
      }

      // 3. Fix Output Format (Assets Config)
      if (q.output_format) {
        try {
          let config = typeof q.output_format === 'string' ? JSON.parse(q.output_format) : q.output_format;
          if (Array.isArray(config)) {
            let configChanged = false;
            const newConfig = config.map(a => {
              if (availableAssets.includes(a.name) && a.path !== `/assets/${a.name}`) {
                configChanged = true;
                return { ...a, path: `/assets/${a.name}` };
              }
              return a;
            });
            if (configChanged) {
              updatedFields.output_format = JSON.stringify(newConfig);
              modified = true;
            }
          }
        } catch (e) { }
      }

      if (modified) {
        try {
          // Determine endpoint based on type
          const type = q.question_type === 'mcq' ? 'mcq' : 'coding';
          await api.put(`/admin/questions/${type}/${q.id}`, updatedFields);
          fixed++;
        } catch (e) {
          console.error(`Failed to update question ${q.id}`, e);
        }
      }
    }

    setFixAssetsModal(prev => ({ ...prev, loading: false, fixedCount: fixed, issues: [] }));
    fetchData(); // Refresh
  };


  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Breadcrumb + Back Button */}
        <div className="flex items-center justify-between">
          <AdminBreadcrumb items={[
            { label: 'Courses', path: '/admin/courses' },
            { label: course?.title || 'Course', path: null }
          ]} />
          <button
            onClick={() => navigate('/admin/courses')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm"
            title="Back to Courses"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{course?.title}</h1>
            <p className="text-gray-600 dark:text-slate-400">{levels.length} Levels • Manage course structure and questions</p>
          </div>
          <div className="flex items-center gap-3">
            {showFixAssets && (
              <button
                onClick={handleScanAssets}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                <ImageIcon size={18} />
                Fix Assets
              </button>
            )}
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

        {/* ... (Rest of UI) ... */}

        {/* Fix Assets Modal */}
        {fixAssetsModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-2xl overflow-hidden border dark:border-slate-700 flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <ImageIcon className="text-purple-600 dark:text-purple-400" /> Asset Health Check
                </h3>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {fixAssetsModal.loading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 dark:text-slate-400">Scanning content...</p>
                  </div>
                ) : fixAssetsModal.issues.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl flex items-center gap-3 text-orange-800 dark:text-orange-200">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <p className="font-bold">Found {fixAssetsModal.issues.length} potential issues</p>
                        <p className="text-xs opacity-80">Assets referenced in descriptions or config that don't match standard paths.</p>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-slate-700 border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
                      {fixAssetsModal.issues.map((issue, idx) => (
                        <div key={idx} className="p-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{issue.type} issue</span>
                            <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-600 dark:text-slate-300">QID: {issue.questionId}</span>
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">{issue.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-slate-400 font-mono bg-gray-50 dark:bg-slate-900/50 p-2 rounded border border-gray-100 dark:border-slate-700">
                            {issue.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : fixAssetsModal.fixedCount > 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">All Fixed!</h3>
                    <p className="text-gray-500 dark:text-slate-400">Successfully updated {fixAssetsModal.fixedCount} questions.</p>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">All Good!</h3>
                    <p className="text-gray-500 dark:text-slate-400">No element path issues found in scanned questions.</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
                <button
                  onClick={() => setFixAssetsModal({ ...fixAssetsModal, show: false })}
                  className="px-5 py-2.5 text-gray-600 dark:text-slate-300 font-medium hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 rounded-xl transition-all"
                >
                  Close
                </button>
                {fixAssetsModal.issues.length > 0 && (
                  <button
                    onClick={handleFixAssets}
                    disabled={fixAssetsModal.loading}
                    className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 dark:shadow-none hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                  >
                    {fixAssetsModal.loading ? 'Fixing...' : `Fix ${fixAssetsModal.issues.length} Issues`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Card Container */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* ... */}          {/* Toolbar */}
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
