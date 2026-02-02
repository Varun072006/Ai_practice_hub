import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Search, Code, BookOpen, CheckCircle, TrendingUp, Flame,
  ChevronRight, Clock, X, Check, ListChecks, ArrowRight
} from 'lucide-react';

const Progress = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('mcq'); // 'mcq' | 'coding'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [progressRes, activityRes, tasksRes] = await Promise.all([
        api.get('/progress/me'),
        api.get('/progress/recent-activity?limit=20'),
        api.get('/progress/tasks')
      ]);
      setProgress(progressRes.data);
      setRecentActivity(activityRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Set empty arrays on error
      setRecentActivity([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from real data
  // Get total coding and MCQ counts from submissions
  const totalCoding = progress?.total_attempted || 0;
  const totalMCQs = recentActivity.filter(a => a.type === 'mcq').length;
  const passPercentage = progress?.success_rate || 0;
  const currentStreak = progress?.current_streak || 0;

  const filteredActivity = recentActivity.filter(a => a.type === activeTab);

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 p-6 pb-24 md:pb-8 overflow-y-auto font-sans bg-gray-50 dark:bg-slate-900">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Welcome back, {user?.name || user?.username || 'Student'}! 👋
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm md:text-base">Ready to solve some problems today?</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full md:w-64 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Streak Badge */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl">
              <Flame className="text-orange-500" size={20} />
              <div className="text-sm">
                <span className="font-bold text-blue-700 dark:text-blue-300">{currentStreak} Day</span>
                <p className="text-blue-600 dark:text-blue-400 text-xs">Streak</p>
              </div>
            </div>

            {/* User Avatar */}
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-slate-700">
              <div className="text-right hidden md:block">
                <p className="font-semibold text-gray-800 dark:text-white">{user?.name || user?.username}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">Student ID: {user?.id?.slice(0, 8) || 'N/A'}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {(user?.name || user?.username || 'S')[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left Column - Main Content */}
          <div className="flex-1 space-y-6">

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Coding Questions Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Code className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <span className="text-green-500 text-sm font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> +12%
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{totalCoding}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Total Coding Questions Practiced</p>
                <div className="mt-4 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '70%' }}></div>
                </div>
              </div>

              {/* MCQ Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <BookOpen className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <span className="text-green-500 text-sm font-medium flex items-center gap-1">
                    <TrendingUp size={14} /> +54 today
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{totalMCQs}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Total MCQs Practiced</p>
                <div className="mt-4 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              {/* Pass Percentage Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                    <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={24} />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{passPercentage.toFixed(1)}%</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Overall Pass Percentage</p>
                <div className="mt-4 flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-gray-600 dark:text-slate-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Passing
                  </span>
                  <span className="flex items-center gap-1 text-gray-600 dark:text-slate-400">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span> Failing
                  </span>
                </div>
              </div>
            </div>

            {/* Task Assigned Section */}
            {tasks.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <ListChecks size={20} className="text-gray-400 dark:text-slate-500" />
                    Task Assigned
                  </h2>
                </div>

                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => task.course_id && navigate(`/courses/${task.course_id}/levels`)}
                      className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group border border-transparent hover:border-gray-100 dark:hover:border-slate-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                          {task.type === 'coding' ? (
                            <Code className="text-blue-600 dark:text-blue-400" size={20} />
                          ) : (
                            <BookOpen className="text-blue-600 dark:text-blue-400" size={20} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                              {task.course}
                            </span>
                            <span className="text-gray-400 dark:text-slate-500 text-sm">
                              {task.completed_questions}/{task.total_questions} completed
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 text-xs font-medium rounded ${task.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            task.status === 'in_progress' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                          {task.status === 'completed' ? 'Completed' :
                            task.status === 'in_progress' ? 'In Progress' :
                              'Not Started'}
                        </span>
                        <ChevronRight className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Clock size={20} className="text-gray-400 dark:text-slate-500" />
                  Recent Activity
                </h2>

                {/* Tab Toggle */}
                <div className="flex flex-wrap bg-gray-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setActiveTab('mcq')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'mcq'
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                      }`}
                  >
                    MCQs
                  </button>
                  <button
                    onClick={() => setActiveTab('coding')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'coding'
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                          }`}>
                          {activity.passed
                            ? <Check className="text-green-600 dark:text-green-400" size={20} />
                            : <X className="text-red-500 dark:text-red-400" size={20} />
                          }
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {activity.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                              {activity.course}
                            </span>
                            <span className="text-gray-400 dark:text-slate-500 text-sm">Score: {activity.score}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 dark:text-slate-500 text-sm">{activity.time}</span>
                        <ChevronRight className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" size={20} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <p>No recent activity found. Start practicing to see your progress!</p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                    >
                      Browse Courses <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              {filteredActivity.length > 0 && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full mt-4 py-3 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                >
                  View All History
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="w-full lg:w-80 space-y-6">

            {/* Streak Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <Flame className="text-orange-300" size={32} />
              </div>
              <h3 className="text-4xl font-bold mt-8 mb-2">{currentStreak} Day Streak!</h3>
              <p className="text-blue-100 mb-6">You're on fire! Solve 2 more coding questions today to keep it going.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors"
              >
                Continue Practice
              </button>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Progress;
