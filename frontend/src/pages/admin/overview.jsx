import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Users, TrendingUp, FileText, CheckCircle2, ChevronLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Use real data from stats
  const popularCourses = stats?.popular_courses || [];
  const avgSuccessRate = stats?.average_success_rate ? `${stats.average_success_rate}%` : '0%';

  const fetchData = async () => {
    try {
      // Keep existing stats fetch, we'll map fields as needed.
      const statsResponse = await api.get('/admin/dashboard/stats');
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }



  return (
    <Layout>
      <div className="p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Breadcrumb */}
        <AdminBreadcrumb items={[{ label: 'Overview', path: null }]} />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          {/* Card 1: Total Users */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-40">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <Users className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{stats?.total_users?.toLocaleString() || '2,840'}</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Total Users</p>
              <p className="text-green-600 dark:text-green-400 text-xs font-semibold mt-1">+12% vs last month</p>
            </div>
          </div>

          {/* Card 2: Active Learners */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-40">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{stats?.active_learners?.toLocaleString() || '1,152'}</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Active Learners</p>
              <p className="text-gray-400 dark:text-slate-500 text-xs mt-1">Currently online</p>
            </div>
          </div>

          {/* Card 3: Questions Attempted */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-40">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <FileText className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{stats?.questions_attempted?.toLocaleString() || '15,420'}</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Questions Attempted</p>
              <p className="text-green-600 dark:text-green-400 text-xs font-semibold mt-1">+540 today</p>
            </div>
          </div>

          {/* Card 4: Avg. Success Rate */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-40">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle2 className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-1">{avgSuccessRate}</h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">Avg. Success Rate</p>

              {/* Simple progress bar mock */}
              <div className="w-full bg-blue-50 dark:bg-blue-900/30 rounded-full h-1.5 mt-3">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${parseFloat(avgSuccessRate) || 0}%` }}></div>
              </div>
            </div>
          </div>

        </div>

        {/* Popular Courses Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="text-orange-400">★</div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Popular Courses</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border-none dark:border-slate-600 rounded-lg text-sm focus:ring-0 w-64 text-gray-600 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500"
                />
              </div>
              <button
                onClick={() => navigate('/admin/courses')}
                className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline"
              >
                View All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider py-4 px-2">Course Name</th>
                  <th className="text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider py-4 px-2">Subject</th>
                  <th className="text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider py-4 px-2">Student Count</th>
                  <th className="text-right text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider py-4 px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                {popularCourses
                  .filter(course => course.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((course) => (
                    <tr key={course.id} className="group hover:bg-blue-50/30 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="py-4 px-2">
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{course.name}</span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">{course.subject}</span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="text-sm text-gray-800 dark:text-slate-300 font-medium">{course.count}</span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <a href="/admin/courses" className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:text-blue-700 dark:hover:text-blue-300">Manage</a>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </Layout>
  );
};

export default AdminOverview;
