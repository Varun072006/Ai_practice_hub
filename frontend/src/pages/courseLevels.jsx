import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { Check, Lock, BookOpen, ExternalLink, ChevronDown, ChevronUp, GraduationCap, X, CheckCircle, Code } from 'lucide-react';

const CourseLevels = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeSelection, setModeSelection] = useState({
    open: false,
    level: null,
  });
  const [showOverview, setShowOverview] = useState(false);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);


  const fetchCourseData = async () => {
    try {
      setLoading(true);
      console.log(`[CourseLevels] Fetching data for courseId: ${courseId}`);

      const [courseResponse, levelsResponse] = await Promise.all([
        api.get('/courses').catch(err => {
          console.error('[CourseLevels] Error fetching courses:', err);
          return { data: [] };
        }),
        api.get(`/courses/${courseId}/levels`).catch(err => {
          console.error(`[CourseLevels] Error fetching levels for course ${courseId}:`, err);
          return { data: [] };
        }),
      ]);

      const courseData = courseResponse.data?.find((c) => c.id === courseId);
      console.log(`[CourseLevels] Course data:`, courseData);
      console.log(`[CourseLevels] Levels data:`, levelsResponse.data);

      setCourse(courseData || null);
      setLevels(levelsResponse.data || []);
    } catch (error) {
      console.error('[CourseLevels] Failed to fetch course data:', error);
      setCourse(null);
      setLevels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLevelClick = (level) => {
    setModeSelection({ open: true, level });
  };

  const getCourseImage = () => {
    const title = course?.title?.toLowerCase() || '';

    // 1. Check if course has a custom image uploaded/set in DB
    if (course?.image_url) return course.image_url;

    // 2. Fallback to hardcoded images based on title
    if (title.includes('c programming') || title === 'c') {
      return 'https://miro.medium.com/v2/resize:fit:1100/format:webp/1*2p6xGs1MCtjM7Giw5gmkpQ.jpeg';
    }
    if (title.includes('machine learning')) {
      return 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB9ktsMFQBpwgQEp6lzgBkqNoBzZJ5UK5WoQ&s';
    }
    if (title.includes('python')) {
      return 'https://webandcrafts.com/_next/image?url=https%3A%2F%2Fadmin.wac.co%2Fuploads%2FFeatures_Of_Python_1_f4ccd6d9f7.jpg&w=4500&q=90';
    }
    if (title.includes('cloud computing')) {
      return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop';
    }
    if (title.includes('deep learning')) {
      return 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&auto=format&fit=crop';
    }
    if (title.includes('data science')) {
      return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop';
    }

    // Fallback gradient
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-8">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 pb-24 md:pb-8">
        <div className="mb-6">
          <nav className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Courses / {course?.title}
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
            {course?.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{course?.description}</p>

          {/* Course Overview Section */}
          {course?.overview && (
            <div className="mb-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <button
                onClick={() => setShowOverview(!showOverview)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
                  <BookOpen size={18} className="text-blue-600 dark:text-blue-400" />
                  Course Overview
                </span>
                {showOverview ? (
                  <ChevronUp size={20} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
              {showOverview && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-slate-700">
                  <div className="p-4 bg-blue-50 dark:bg-slate-700/50 rounded-lg border border-blue-200 dark:border-slate-600">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {course.overview}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {levels.map((level) => (
            <div
              key={level.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-slate-900/20 dark:hover:shadow-slate-900/50 overflow-hidden border border-transparent dark:border-slate-700/50 transition-all duration-300 transform hover:scale-[1.01]"
            >
              <div className="h-48 w-full overflow-hidden bg-gray-200 relative">
                {level.image_url ? (
                  <img
                    src={level.image_url}
                    alt={level.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/400x200?text=No+Image";
                    }}
                  />
                ) : getCourseImage() ? (
                  <img
                    src={getCourseImage()}
                    alt={course?.title || 'Course banner'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentElement.style.background = 'linear-gradient(to bottom right, #667eea, #764ba2)';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    Level {level.level_number}
                  </span>
                  {level.status === 'completed' && (
                    <Check className="text-green-600 dark:text-green-400" size={20} />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">{level.title}</h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">{level.description}</p>

                {/* Topic Description & Materials */}
                {(level.topic_description || level.learning_materials) && (
                  <div className="mb-4 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-3">
                    {level.topic_description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-slate-700/50 p-2 rounded">
                        {level.topic_description}
                      </p>
                    )}

                    {level.learning_materials && (() => {
                      const materials = typeof level.learning_materials === 'string'
                        ? JSON.parse(level.learning_materials)
                        : level.learning_materials;
                      const resources = materials.resources || [];

                      return resources.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            <BookOpen size={12} /> Materials
                          </div>
                          <div className="space-y-1 pl-1">
                            {resources.map((mat, idx) => (
                              <a
                                key={idx}
                                href={mat.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-1 truncate block"
                              >
                                <ExternalLink size={10} className="flex-shrink-0" />
                                {mat.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/courses/${courseId}/level/${level.id}/learn`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    <GraduationCap size={18} />
                    Learn
                  </button>
                  <button
                    onClick={() => handleLevelClick(level)}
                    className="flex-1 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    TEST
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mode selection dialog */}
        {modeSelection.open && modeSelection.level && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-[320px] w-full transform animate-in zoom-in-95 duration-200">
              <div className="space-y-3">
                <button
                  onClick={() => {
                    navigate(`/mcq-practice/${courseId}/${modeSelection.level.id}`, {
                      state: { sessionType: 'mcq' },
                    });
                    setModeSelection({ open: false, level: null });
                  }}
                  className="w-full py-4 rounded-xl bg-[#2563EB] text-white font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
                >
                  MCQ Test
                </button>

                <button
                  onClick={() => {
                    const courseTitle = (course?.title || '').toLowerCase();
                    const isHtmlCssCourse = courseTitle.includes('html') || courseTitle.includes('css');

                    if (isHtmlCssCourse) {
                      navigate(`/html-css-practice/${courseId}/${modeSelection.level.id}`, {
                        state: { sessionType: 'coding' },
                      });
                    } else {
                      navigate(`/practice/${courseId}/${modeSelection.level.id}`, {
                        state: { sessionType: 'coding' },
                      });
                    }
                    setModeSelection({ open: false, level: null });
                  }}
                  className="w-full py-4 rounded-xl bg-[#2563EB] text-white font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
                >
                  Coding Test
                </button>

                <button
                  onClick={() => setModeSelection({ open: false, level: null })}
                  className="w-full mt-4 py-2 text-slate-400 dark:text-slate-500 text-sm font-medium hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default CourseLevels;

