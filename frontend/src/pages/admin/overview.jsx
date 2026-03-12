import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Users, TrendingUp, FileText, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

const AdminOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  // Prepare data for charts with default fallbacks
  const questionAttemptsData = stats?.weekly_attempts?.map(d => ({ name: d.name, attempts: d.attempts })) || [];
  const successRateData = stats?.success_trend?.length > 0 ? stats.success_trend.map(d => ({ week: d.week, rate: d.rate })) : [{ week: 'Week 1', rate: 0 }];


  return (
    <Layout>
      <div className="p-4 md:p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
        <AdminBreadcrumb items={[{ label: 'Overview', path: null }]} />

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h1>
          <p className="text-slate-500 dark:text-slate-400">Track practice portal metrics and performance.</p>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400">
                <Users size={20} />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${(stats?.user_growth || 0) >= 0
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                : 'text-red-600 bg-red-50 dark:bg-red-900/20'
                }`}>
                <TrendingUp size={12} />
                {(stats?.user_growth || 0) > 0 ? '+' : ''}{stats?.user_growth || 0}%
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
                {stats?.total_users?.toLocaleString() || 0}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Users</p>
            </div>
          </div>

          {/* Active Learners */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-40 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400">
                <span className="text-lg font-bold">⚡</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
                {stats?.active_learners?.toLocaleString() || 0}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Learners</p>
            </div>
          </div>

          {/* Total Attempts */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-40 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400">
                <FileText size={20} />
              </div>
              <span className="text-emerald-600 text-xs font-semibold px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
                +{stats?.attempts_today || 0} today
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
                {stats?.questions_attempted?.toLocaleString() || 0}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Attempts</p>
            </div>
          </div>

          {/* Avg Success Rate */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between h-40 hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
                {stats?.average_success_rate || 0}%
              </h3>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                <div
                  className="bg-slate-600 dark:bg-slate-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(stats?.average_success_rate || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">Avg. Success Rate</p>
            </div>
          </div>
        </div>

        {/* Main Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Question Attempts Bar Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">Question Attempts</h3>
            </div>
            <div className="h-64 w-full min-h-[256px] min-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={questionAttemptsData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    dy={10}
                  />
                  <Tooltip
                    cursor={{ fill: '#F1F5F9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="attempts" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Success Rate Line/Area Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">Success Rate Over Time</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-blue-600 font-medium">● Current</span>
                <span className="flex items-center gap-1 text-slate-400">● Previous</span>
              </div>
            </div>
            <div className="h-64 w-full min-h-[256px] min-w-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={successRateData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    dy={10}
                  />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Course Performance Insights Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 mb-2">
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Course Performance Insights</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Course Name</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Attempts</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg. Accuracy</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {stats?.course_insights?.map((course, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-slate-800 dark:text-white">{course.name}</td>
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">{course.subject}</td>
                    <td className="py-4 px-6 text-sm text-slate-800 dark:text-slate-300 font-medium">{course.attempts.toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{course.accuracy}%</span>
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-slate-600 dark:bg-slate-400"
                            style={{ width: `${course.accuracy}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${course.status === 'Healthy' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        course.status === 'Review' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                          'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${course.status === 'Healthy' ? 'bg-slate-500' :
                          course.status === 'Review' ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                        {course.status}
                      </span>
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
