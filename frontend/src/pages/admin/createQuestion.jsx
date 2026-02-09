import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { Plus, Trash2, Save, CheckCircle } from 'lucide-react';

const CreateQuestion = () => {
  const [searchParams] = useSearchParams();
  const { questionId } = useParams();
  const levelId = searchParams.get('levelId') || searchParams.get('level_id');
  const courseId = searchParams.get('courseId') || searchParams.get('course_id');
  const questionTypeParam = searchParams.get('type');
  const navigate = useNavigate();

  const isEditMode = !!questionId;
  const [questionType, setQuestionType] = useState(questionTypeParam || 'coding');
  // Track if type has been selected (for two-step creation flow)
  // If there's a type in URL params (from clicking MCQ/Coding count in levels page), skip selection
  const [typeSelected, setTypeSelected] = useState(isEditMode || !!questionTypeParam);
  const [course, setCourse] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    input_format: '',
    output_format: '',
    constraints: '',
    reference_solution: '',
    difficulty: 'medium',
    test_cases: [{ input_data: '', expected_output: '', is_hidden: false }],
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
    ],
    // For MCQ: correct answer as full text (should match one of the option texts)
    correct_answer: '',
  });

  // HTML/CSS code state for web development questions
  const [htmlCssCode, setHtmlCssCode] = useState({
    html: '',
    css: '',
    js: ''
  });

  // Image assets for HTML/CSS questions
  const [assets, setAssets] = useState([]);

  // Handler to select question type (first step of creation flow)
  const handleSelectQuestionType = (type) => {
    setQuestionType(type);
    setTypeSelected(true);
  };

  // Check if this is an HTML/CSS course
  const isHtmlCssCourse = course?.title?.toLowerCase().includes('html') || course?.title?.toLowerCase().includes('css');

  useEffect(() => {
    // Get course info to determine language
    // Try to get courseId from search params or from URL path
    const effectiveCourseId = courseId || window.location.pathname.match(/\/admin\/courses\/([^\/]+)/)?.[1];

    if (effectiveCourseId) {
      api.get('/admin/courses/with-levels')
        .then((response) => {
          const courseData = response.data.find((c) => c.id === effectiveCourseId);
          console.log('[CreateQuestion] Found course:', courseData?.title, 'isHtmlCss:', courseData?.title?.toLowerCase().includes('html') || courseData?.title?.toLowerCase().includes('css'));
          setCourse(courseData);
        })
        .catch((error) => console.error('Failed to fetch course:', error));
    }

    // Load question data if editing
    if (isEditMode && questionId) {
      api.get(`/admin/questions/${questionId}`)
        .then(async (response) => {
          const question = response.data;
          setQuestionType(question.question_type);
          setFormData({
            title: question.title || '',
            description: question.description || '',
            input_format: question.input_format || '',
            output_format: question.output_format || '',
            constraints: question.constraints || '',
            reference_solution: question.reference_solution || '',
            difficulty: question.difficulty || 'medium',
            test_cases: question.test_cases && question.test_cases.length > 0
              ? question.test_cases.map((tc) => ({
                input_data: tc.input_data || '',
                expected_output: tc.expected_output || '',
                is_hidden: tc.is_hidden || false,
              }))
              : [{ input_data: '', expected_output: '', is_hidden: false }],
            options:
              question.options && question.options.length > 0
                ? question.options.map((opt) => ({
                  option_text: opt.option_text || '',
                  is_correct: opt.is_correct || false,
                }))
                : [
                  { option_text: '', is_correct: false },
                  { option_text: '', is_correct: false },
                  { option_text: '', is_correct: false },
                  { option_text: '', is_correct: false },
                ],
            // Pre-fill correct_answer with the text of the correct option (if any)
            // Handle both boolean true and numeric 1 (MySQL returns 1 for true)
            correct_answer:
              question.options && question.options.length > 0
                ? (() => {
                  // Check for correct option - handle MySQL boolean (0/1) and JavaScript boolean
                  // Backend already converts MySQL boolean to JavaScript boolean
                  const correctOpt = question.options.find((opt) => {
                    const isCorrect = opt.is_correct;
                    // Handle various formats: true, 1, '1', 'true'
                    return isCorrect === true || isCorrect === 1 || isCorrect === '1' || isCorrect === 'true';
                  });
                  return correctOpt?.option_text || '';
                })()
                : '',
          });

          // Try to parse reference_solution as JSON for HTML/CSS questions
          if (question.reference_solution) {
            try {
              const parsed = JSON.parse(question.reference_solution);
              if (parsed.html !== undefined || parsed.css !== undefined || parsed.js !== undefined) {
                setHtmlCssCode({
                  html: parsed.html || '',
                  css: parsed.css || '',
                  js: parsed.js || ''
                });
              }
            } catch (e) {
              // Not JSON, treat as regular reference solution
              console.log('Reference solution is not JSON, treating as regular code');
            }
          }

          // Try to parse assets from output_format field (for HTML/CSS questions)
          if (question.output_format) {
            try {
              // Try JSON format first
              const parsedAssets = JSON.parse(question.output_format);
              if (Array.isArray(parsedAssets)) {
                setAssets(parsedAssets);
              }
            } catch (e) {
              // If not JSON, try pipe-separated format: "name|path,name|path"
              const assetsList = question.output_format.split(',').map(item => {
                const parts = item.trim().split('|');
                return {
                  name: parts[0] || '',
                  path: parts[1] || parts[0] || ''
                };
              }).filter(a => a.name);
              setAssets(assetsList);
            }
          }

          // If we don't have course info yet and question has level_id, fetch course from levels
          if (!course && question.level_id) {
            try {
              const coursesRes = await api.get('/admin/courses/with-levels');
              const courses = coursesRes.data;
              // Find which course contains this level
              const foundCourse = courses.find(c =>
                c.levels?.some(l => l.id === question.level_id)
              );
              if (foundCourse) {
                console.log('[CreateQuestion] Found course from question level:', foundCourse.title);
                setCourse(foundCourse);
              }
            } catch (err) {
              console.error('Failed to get course from level:', err);
            }
          }
        })
        .catch((error) => {
          console.error('Failed to load question:', error);
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to load question';
          console.error('Error details:', error?.response?.data);
          alert(`Failed to load question: ${errorMessage}`);
        });
    }
  }, [questionId, isEditMode, courseId]);

  const getEditorLanguage = () => {
    if (!course) return 'python';
    const courseTitle = course.title?.toLowerCase() || '';
    if (courseTitle.includes('c programming') || courseTitle.includes('c ')) {
      return 'c';
    }
    return 'python';
  };

  const getLanguageLabel = () => {
    const lang = getEditorLanguage();
    return lang === 'c' ? 'C' : 'Python 3';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title || !formData.title.trim()) {
      alert('Please enter a question title');
      return;
    }

    if (!formData.description || !formData.description.trim()) {
      alert('Please enter a question description');
      return;
    }

    try {
      if (questionType === 'mcq') {
        // Basic validation for MCQ: ensure correct answer matches one of the options
        if (!formData.correct_answer || !formData.correct_answer.trim()) {
          alert('Please enter the correct answer text that matches one of the options');
          return;
        }

        const trimmedCorrect = formData.correct_answer.trim().toLowerCase();
        const optionsWithText = formData.options.map((opt) => ({
          ...opt,
          option_text: (opt.option_text || '').trim(),
        }));

        // Check if all options have text
        const emptyOptions = optionsWithText.filter((opt) => !opt.option_text);
        if (emptyOptions.length > 0) {
          alert('Please fill in all option fields');
          return;
        }

        const matchingOptionIndex = optionsWithText.findIndex(
          (opt) => opt.option_text.toLowerCase() === trimmedCorrect
        );

        if (matchingOptionIndex === -1) {
          alert(
            'The Correct Answer must exactly match one of the option texts (case-insensitive).\n\n' +
            'Current options:\n' +
            optionsWithText.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt.option_text}`).join('\n')
          );
          return;
        }

        // Mark only the matching option as correct
        const optionsWithCorrect = optionsWithText.map((opt, index) => ({
          ...opt,
          is_correct: index === matchingOptionIndex,
        }));

        if (isEditMode) {
          await api.put(`/admin/questions/mcq/${questionId}`, {
            title: formData.title.trim(),
            description: formData.description.trim(),
            options: optionsWithCorrect,
            difficulty: formData.difficulty,
          });
        } else {
          await api.post('/admin/questions/mcq', {
            level_id: levelId,
            title: formData.title.trim(),
            description: formData.description.trim(),
            options: optionsWithCorrect,
            difficulty: formData.difficulty,
          });
        }
      } else {
        // Coding question handling - different validation for HTML/CSS vs regular coding
        if (isHtmlCssCourse) {
          // HTML/CSS question - validate that at least HTML is provided
          if (!htmlCssCode.html || !htmlCssCode.html.trim()) {
            alert('Please enter expected HTML code');
            return;
          }

          // Build the reference_solution as JSON from htmlCssCode
          const referenceSolution = JSON.stringify({
            html: htmlCssCode.html,
            css: htmlCssCode.css,
            js: htmlCssCode.js
          });

          // Store assets as JSON in output_format field
          const assetsJson = assets.length > 0 ? JSON.stringify(assets) : '';

          // For HTML/CSS, we use empty test cases since visual testing is different
          const submitData = {
            ...formData,
            reference_solution: referenceSolution,
            output_format: assetsJson,
            test_cases: [{ input_data: '', expected_output: '', is_hidden: false }],
          };

          if (isEditMode) {
            await api.put(`/admin/questions/coding/${questionId}`, submitData);
          } else {
            await api.post('/admin/questions/coding', {
              level_id: levelId,
              ...submitData,
            });
          }
        } else {
          // Regular coding question validation
          if (!formData.reference_solution || !formData.reference_solution.trim()) {
            alert('Please enter a reference solution');
            return;
          }

          if (!formData.test_cases || formData.test_cases.length === 0) {
            alert('Please add at least one test case');
            return;
          }

          // Regular coding question
          if (isEditMode) {
            await api.put(`/admin/questions/coding/${questionId}`, formData);
          } else {
            await api.post('/admin/questions/coding', {
              level_id: levelId,
              ...formData,
            });
          }
        }
      }

      // Show success popup
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Navigate back to level questions if we have courseId and levelId, otherwise to courses list
        if (courseId && levelId) {
          navigate(`/admin/courses/${courseId}/levels/${levelId}/questions?type=${questionType}`);
        } else if (courseId) {
          navigate(`/admin/courses/${courseId}/levels`);
        } else {
          navigate('/admin/courses');
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to save question:', error);
      alert('Failed to save question');
    }
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      test_cases: [...formData.test_cases, { input_data: '', expected_output: '', is_hidden: false }],
    });
  };

  const removeTestCase = (index) => {
    setFormData({
      ...formData,
      test_cases: formData.test_cases.filter((_, i) => i !== index),
    });
  };

  const updateTestCase = (index, field, value) => {
    const newTestCases = [...formData.test_cases];
    newTestCases[index][field] = value;
    setFormData({ ...formData, test_cases: newTestCases });
  };



  return (
    <Layout>
      <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Breadcrumb Navigation */}
        <AdminBreadcrumb items={[
          { label: 'Courses', path: '/admin/courses' },
          { label: course?.title || 'Course', path: `/admin/courses/${courseId}/levels` },
          { label: isEditMode ? 'Edit Question' : 'Create Question', path: null }
        ]} />

        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              {isEditMode ? 'Edit Question' : 'Create New Question'}
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (courseId && levelId) {
                    navigate(`/admin/courses/${courseId}/levels/${levelId}/questions?type=${questionType}`);
                  } else if (courseId) {
                    navigate(`/admin/courses/${courseId}/levels`);
                  } else {
                    navigate('/admin/courses');
                  }
                }}
                className="flex-1 md:flex-none px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save size={18} />
                Save Question
              </button>
            </div>
          </div>

        </div>

        {/* Success Popup */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8 max-w-md text-center border dark:border-slate-700">
              <CheckCircle size={48} className="mx-auto text-green-600 dark:text-green-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Question Saved Successfully!</h3>
              <p className="text-gray-600 dark:text-slate-400">The question has been {isEditMode ? 'updated' : 'created'} successfully.</p>
            </div>
          </div>
        )}

        {/* Question Type Selection Screen - Only show when creating and type not yet selected */}
        {!isEditMode && !typeSelected && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 p-8 border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 text-center">Select Question Type</h2>
            <p className="text-gray-500 dark:text-slate-400 text-center mb-8">Choose the type of question you want to create</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {isHtmlCssCourse ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSelectQuestionType('coding')}
                    className="p-8 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:border-purple-400 dark:hover:border-purple-600 transition-all group"
                  >
                    <div className="text-5xl mb-4">🎨</div>
                    <h3 className="text-xl font-bold text-purple-700 dark:text-purple-400 mb-2">HTML/CSS Challenge</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-500">Create a web development challenge with HTML, CSS, and JavaScript</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuestionType('mcq')}
                    className="p-8 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
                  >
                    <div className="text-5xl mb-4">📝</div>
                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">MCQ Question</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-500">Create a multiple choice question with 4 options</p>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSelectQuestionType('coding')}
                    className="p-8 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
                  >
                    <div className="text-5xl mb-4">💻</div>
                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">Coding Question</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-500">Create a programming challenge with test cases</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectQuestionType('mcq')}
                    className="p-8 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 hover:border-green-400 dark:hover:border-green-600 transition-all group"
                  >
                    <div className="text-5xl mb-4">📝</div>
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">MCQ Question</h3>
                    <p className="text-sm text-green-600 dark:text-green-500">Create a multiple choice question with 4 options</p>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Question Form - Only show after type is selected or in edit mode */}
        {(isEditMode || typeSelected) && (

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Problem Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Binary Search Implementation"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                required
              />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Question Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter the problem description, constraints, and examples..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                rows={6}
                required
              />
            </div>

            {questionType === 'coding' && (
              <>
                {isHtmlCssCourse ? (
                  /* HTML/CSS Course - Show HTML, CSS, JS editors */
                  <>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Expected HTML Code *
                        </label>
                      </div>
                      <Editor
                        height="300px"
                        language="html"
                        value={htmlCssCode.html}
                        onChange={(value) => setHtmlCssCode({ ...htmlCssCode, html: value || '' })}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: 'on',
                        }}
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Expected CSS Code
                        </label>
                      </div>
                      <Editor
                        height="250px"
                        language="css"
                        value={htmlCssCode.css}
                        onChange={(value) => setHtmlCssCode({ ...htmlCssCode, css: value || '' })}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: 'on',
                        }}
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                          Expected JavaScript Code
                        </label>
                      </div>
                      <Editor
                        height="200px"
                        language="javascript"
                        value={htmlCssCode.js}
                        onChange={(value) => setHtmlCssCode({ ...htmlCssCode, js: value || '' })}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          wordWrap: 'on',
                        }}
                      />
                    </div>

                    {/* Image Assets Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                            Image Assets
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssets([...assets, { name: '', path: '' }])}
                          className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                        >
                          <Plus size={16} />
                          Add Asset
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-500 mb-4">
                        Define image assets that students can use in their HTML code (e.g., dog1.jpg → /assets/images/dog1.jpg)
                      </p>
                      {assets.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 dark:text-slate-500 text-sm border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg">
                          No assets defined. Click "Add Asset" to add image references.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {assets.map((asset, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                              <input
                                type="text"
                                value={asset.name}
                                onChange={(e) => {
                                  const newAssets = [...assets];
                                  newAssets[index].name = e.target.value;
                                  setAssets(newAssets);
                                }}
                                placeholder="Asset name (e.g., dog1.jpg)"
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                              />
                              <span className="text-gray-400 dark:text-slate-500">→</span>
                              <input
                                type="text"
                                value={asset.path}
                                onChange={(e) => {
                                  const newAssets = [...assets];
                                  newAssets[index].path = e.target.value;
                                  setAssets(newAssets);
                                }}
                                placeholder="Path (e.g., /assets/images/dog1.jpg)"
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newAssets = assets.filter((_, i) => i !== index);
                                  setAssets(newAssets);
                                }}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                      <p className="text-sm text-purple-700 dark:text-purple-400">
                        <strong>HTML/CSS Challenge Mode:</strong> Students will write HTML, CSS, and JS code to match the expected output. The expected code above serves as the reference solution.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Regular Coding Course */
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Input Format
                        </label>
                        <textarea
                          value={formData.input_format}
                          onChange={(e) => setFormData({ ...formData, input_format: e.target.value })}
                          placeholder="Describe the expected input structure..."
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                          rows={4}
                        />
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Output Format
                        </label>
                        <textarea
                          value={formData.output_format}
                          onChange={(e) => setFormData({ ...formData, output_format: e.target.value })}
                          placeholder="Describe the expected output structure..."
                          className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Correct Solution ({getLanguageLabel()})
                      </label>
                      <Editor
                        height="300px"
                        language={getEditorLanguage()}
                        value={formData.reference_solution}
                        onChange={(value) => setFormData({ ...formData, reference_solution: value || '' })}
                        theme="vs-dark"
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Test Cases</h3>
                        <button
                          type="button"
                          onClick={addTestCase}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus size={18} />
                          Add Test Case
                        </button>
                      </div>
                      <div className="space-y-4">
                        {formData.test_cases.map((testCase, index) => (
                          <div key={index} className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 bg-gray-50 dark:bg-slate-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium text-gray-800 dark:text-white">Test Case {index + 1}</span>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={testCase.is_hidden}
                                    onChange={(e) =>
                                      updateTestCase(index, 'is_hidden', e.target.checked)
                                    }
                                    className="mr-2"
                                  />
                                  <span className="text-sm text-gray-600 dark:text-slate-400">Hidden</span>
                                </label>
                                {formData.test_cases.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeTestCase(index)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                  Input
                                </label>
                                <textarea
                                  value={testCase.input_data}
                                  onChange={(e) =>
                                    updateTestCase(index, 'input_data', e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                                  rows={3}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                  Expected Output
                                </label>
                                <textarea
                                  value={testCase.expected_output}
                                  onChange={(e) =>
                                    updateTestCase(index, 'expected_output', e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-600 text-gray-800 dark:text-white"
                                  rows={3}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {questionType === 'mcq' && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Answer Options</h3>
                <div className="space-y-3 mb-6">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                      <span className="font-medium text-gray-800 dark:text-white">{String.fromCharCode(65 + index)}.</span>
                      <input
                        type="text"
                        value={option.option_text}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index].option_text = e.target.value;
                          setFormData({ ...formData, options: newOptions });
                        }}
                        placeholder="Enter option text..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                        required
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Correct Answer (Text) *
                  </label>
                  <input
                    type="text"
                    value={formData.correct_answer}
                    onChange={(e) => {
                      setFormData({ ...formData, correct_answer: e.target.value });
                    }}
                    placeholder="Enter the correct answer text (must match one of the options)"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                    This should exactly match the text of the correct option (for example: "
                    <span className="italic">0</span>" or "
                    <span className="italic">Depends on language</span>").
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default CreateQuestion;
