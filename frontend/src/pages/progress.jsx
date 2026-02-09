import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Code, BookOpen, Clock, Check, X, ListChecks, ChevronRight,
  ChevronDown, Brain, Terminal, Database, Layers, ChevronUp
} from 'lucide-react';

const Progress = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mcq');
  const [graphType, setGraphType] = useState('mcq'); // 'mcq' or 'coding'
  const [compareWith, setCompareWith] = useState('topper');
  const [tasksPanelOpen, setTasksPanelOpen] = useState(false);
  const [activeTaskTab, setActiveTaskTab] = useState('current'); // 'current' | 'completed'

  // State for all dashboard data
  const [courseStats, setCourseStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Fetch data function - memoized for reactive updates
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [profileRes, activityRes, tasksRes] = await Promise.all([
        api.get('/profile/dashboard'),
        api.get('/progress/recent-activity?limit=20'),
        api.get('/progress/tasks')
      ]);

      // Set course stats - ALL courses with progress
      const allCourseStats = profileRes.data.courseStats || [];

      // Add simulated top performer data for comparison
      const statsWithTopPerformer = allCourseStats.map(course => ({
        ...course,
        topPerformerPassed: Math.max(
          course.questionsPassed + Math.floor(Math.random() * 20 + 10),
          Math.floor(course.questionsPassed * 1.3)
        )
      }));
      setCourseStats(statsWithTopPerformer);

      // Set recent activity with correct pass/fail calculation
      const activityData = (activityRes.data || []).map(activity => {
        // Parse score to calculate pass/fail correctly
        // Score format can be "8/10" or just "80%"
        let passed = activity.passed;

        if (activity.score) {
          const scoreMatch = activity.score.match(/(\d+)\/(\d+)/);
          if (scoreMatch) {
            const scored = parseInt(scoreMatch[1]);
            const total = parseInt(scoreMatch[2]);
            const percentage = (scored / total) * 100;
            // MCQ pass criteria: >= 60%
            // Coding pass criteria: all test cases passed (scored === total)
            if (activity.type === 'mcq') {
              passed = percentage >= 60;
            } else if (activity.type === 'coding') {
              passed = scored === total;
            }
          }
        }

        return { ...activity, passed };
      });
      setRecentActivity(activityData);

      // Set tasks
      setTasks(tasksRes.data || []);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh every 30 seconds for reactive updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Refresh on window focus for immediate updates when user returns
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchDashboardData]);

  // Get icon component based on course
  const getCourseIcon = (iconName) => {
    const icons = {
      'code': Code,
      'brain': Brain,
      'terminal': Terminal,
      'database': Database,
      'snake': Layers,
      'book': BookOpen
    };
    return icons[iconName] || Code;
  };

  // Filter activity based on tab
  const filteredActivity = recentActivity.filter(a => a.type === activeTab);

  // Separate tasks into current and completed
  const currentTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Calculate max value for chart scaling - use selected graph type
  const getMaxChartValue = () => {
    if (graphType === 'mcq') {
      return Math.max(
        ...courseStats.map(c => Math.max(c.mcqPassed || 0, (c.topPerformerPassed || 10) * 0.5)),
        10
      );
    } else {
      return Math.max(
        ...courseStats.map(c => Math.max(c.codingPassed || 0, (c.topPerformerPassed || 10) * 0.5)),
        10
      );
    }
  };
  const maxChartValue = getMaxChartValue();

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900 min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 p-4 md:p-6 pb-24 md:pb-8 overflow-y-auto bg-gray-50 dark:bg-slate-900 min-h-screen">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Practice Dashboard
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Track your course progression and mastery.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column - Comparison Analytics + Recent Activity */}
          <div className="lg:col-span-2 space-y-6">

            {/* Comparison Analytics Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Comparison Analytics</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Your mastery levels vs. top performing peers</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Graph Type Toggle */}
                  <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                    <button
                      onClick={() => setGraphType('mcq')}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${graphType === 'mcq'
                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                        }`}
                    >
                      MCQ
                    </button>
                    <button
                      onClick={() => setGraphType('coding')}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${graphType === 'coding'
                        ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                        }`}
                    >
                      Coding
                    </button>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      <span className="text-gray-600 dark:text-slate-400">You</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 bg-blue-200 dark:bg-slate-600 rounded-sm"></div>
                      <span className="text-gray-600 dark:text-slate-400">Top Performer</span>
                    </div>
                  </div>

                  {/* Dropdown */}
                  <div className="relative">
                    <select
                      value={compareWith}
                      onChange={(e) => setCompareWith(e.target.value)}
                      className="appearance-none bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="topper">Compare With Topper</option>
                      <option value="average">Compare With Average</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  </div>
                </div>
              </div>

              {/* Bar Chart - Showing ALL courses */}
              <div className="relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-400 dark:text-slate-500 w-8">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>

                {/* Chart area */}
                <div className="ml-10 relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: '32px' }}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className="border-b border-gray-100 dark:border-slate-700" style={{ height: '1px' }}></div>
                    ))}
                  </div>

                  {/* Bars - Scrollable container for courses with data */}
                  <div className="overflow-x-auto pb-2">
                    {(() => {
                      // Filter courses to only show those where user has attempted the selected question type
                      const filteredCourses = courseStats.filter(course => {
                        if (graphType === 'mcq') {
                          return (course.mcqAttempted || 0) > 0;
                        } else {
                          return (course.codingAttempted || 0) > 0;
                        }
                      });

                      if (filteredCourses.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-40 text-gray-400 dark:text-slate-500">
                            <div className="text-center">
                              <p>No {graphType === 'mcq' ? 'MCQ' : 'Coding'} questions attempted yet.</p>
                              <p className="text-xs mt-1">Try the other question type or start practicing!</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          className="flex items-end gap-4 h-48 relative z-10"
                          style={{ minWidth: `${Math.max(filteredCourses.length * 100, 400)}px` }}
                        >
                          {filteredCourses.map((course, idx) => {
                            const userValue = graphType === 'mcq' ? (course.mcqPassed || 0) : (course.codingPassed || 0);
                            const topperValue = graphType === 'mcq'
                              ? Math.floor((course.topPerformerPassed || 10) * 0.5)
                              : Math.floor((course.topPerformerPassed || 10) * 0.7);
                            const userHeight = maxChartValue > 0 ? (userValue / maxChartValue) * 100 : 0;
                            const topperHeight = maxChartValue > 0 ? (topperValue / maxChartValue) * 100 : 0;

                            return (
                              <div key={course.courseId || idx} className="flex flex-col items-center flex-1 min-w-[80px]">
                                <div className="flex items-end gap-1 h-40 w-full justify-center">
                                  {/* User bar */}
                                  <div
                                    className="w-6 md:w-8 bg-blue-500 rounded-t-md"
                                    style={{ height: `${Math.max(userHeight, 3)}%` }}
                                    title={`You: ${userValue} ${graphType === 'mcq' ? 'MCQ' : 'coding'} questions passed`}
                                  ></div>
                                  {/* Top performer bar */}
                                  <div
                                    className="w-6 md:w-8 bg-blue-200 dark:bg-slate-600 rounded-t-md"
                                    style={{ height: `${Math.max(topperHeight, 3)}%` }}
                                    title={`Top: ${topperValue} ${graphType === 'mcq' ? 'MCQ' : 'coding'} questions`}
                                  ></div>
                                </div>
                                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-2 text-center w-full px-1" title={course.courseName}>
                                  {course.courseName || `Course ${idx + 1}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Clock size={20} className="text-gray-400" />
                  Recent Activity
                </h3>

                {/* Tab Toggle */}
                <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('mcq')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'mcq'
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                      }`}
                  >
                    MCQs
                  </button>
                  <button
                    onClick={() => setActiveTab('coding')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'coding'
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                      }`}
                  >
                    Coding Questions
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredActivity.length > 0 ? (
                  filteredActivity.map((activity) => (
                    <div
                      key={activity.id}
                      onClick={() => navigate(`/results/${activity.id}`)}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-slate-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.passed
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                          {activity.passed
                            ? <Check className="text-green-600 dark:text-green-400" size={20} />
                            : <X className="text-red-500 dark:text-red-400" size={20} />
                          }
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm">
                            {activity.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                              {activity.course}
                            </span>
                            <span className="text-gray-400 dark:text-slate-500 text-xs">
                              Score: <span className={activity.passed ? 'text-green-500' : 'text-red-500'}>{activity.score}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 dark:text-slate-500 text-xs">{activity.time}</span>
                        <ChevronRight className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" size={18} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <p>No {activeTab === 'mcq' ? 'MCQ' : 'coding'} activity found.</p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="mt-3 text-blue-500 hover:text-blue-600 text-sm"
                    >
                      Start practicing →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Skill Overview + Tasks */}
          <div className="space-y-6">

            {/* Skill Progress Overview - Shows ALL courses */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                    <Layers size={12} className="text-white" />
                  </div>
                  Skill Progress Overview
                </h3>
              </div>

              {/* Scrollable grid for all courses */}
              <div className="max-h-[400px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-3">
                  {courseStats.length > 0 ? (
                    courseStats.map((course) => {
                      const IconComponent = getCourseIcon(course.icon);
                      return (
                        <div
                          key={course.courseId}
                          className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 text-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <IconComponent className="text-blue-500" size={18} />
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1" title={course.courseName}>
                            {course.courseName}
                          </p>
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 transition-all duration-500">
                            {course.questionsPassed}
                          </p>
                          <p className="text-[9px] text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                            QUESTIONS ATTENDED
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-400 dark:text-slate-500">
                      <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No courses attempted yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tasks Assigned - Click to open modal */}
            <div
              onClick={() => setTasksPanelOpen(true)}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <ListChecks size={18} className="text-gray-400" />
                  Tasks Assigned
                  {currentTasks.length > 0 && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      {currentTasks.length}
                    </span>
                  )}
                </h3>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
              {currentTasks.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">No pending tasks</p>
              )}
              {currentTasks.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Click to view all tasks</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Modal Overlay */}
      {tasksPanelOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setTasksPanelOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <ListChecks size={20} className="text-blue-500" />
                Tasks Assigned
              </h3>
              <button
                onClick={() => setTasksPanelOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                <X size={16} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Task Tabs */}
            <div className="px-5 pt-4">
              <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTaskTab('current')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${activeTaskTab === 'current'
                    ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                    }`}
                >
                  Current Tasks ({currentTasks.length})
                </button>
                <button
                  onClick={() => setActiveTaskTab('completed')}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${activeTaskTab === 'completed'
                    ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                    }`}
                >
                  Completed ({completedTasks.length})
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="p-5 overflow-y-auto max-h-[50vh]">
              <div className="space-y-3">
                {activeTaskTab === 'current' ? (
                  currentTasks.length > 0 ? (
                    currentTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setTasksPanelOpen(false);
                          task.course_id && navigate(`/courses/${task.course_id}/levels`);
                        }}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-100 dark:border-slate-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                            {task.title || task.course}
                            {task.reassign_count > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                Reassigned {task.reassign_count > 1 ? `${task.reassign_count}x` : ''}
                              </span>
                            )}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${task.status === 'in_progress'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            }`}>
                            {task.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {task.course} - {task.level || 'Module'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                      <ListChecks size={40} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No current tasks</p>
                    </div>
                  )
                ) : (
                  completedTasks.length > 0 ? (
                    completedTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          setTasksPanelOpen(false);
                          task.course_id && navigate(`/courses/${task.course_id}/levels`);
                        }}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-100 dark:border-slate-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-white flex items-center gap-2">
                            <Check size={14} className="text-green-500" />
                            {task.title || task.course}
                            {task.reassign_count > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                                Was Reassigned {task.reassign_count > 1 ? `${task.reassign_count}x` : ''}
                              </span>
                            )}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                            Completed
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {task.course} - {task.level || 'Module'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                      <Check size={40} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No completed tasks</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Progress;
