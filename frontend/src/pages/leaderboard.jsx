import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/progress/leaderboard?limit=20');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-gray-900 dark:text-white">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Leaderboard</h1>
        <p className="text-gray-600 dark:text-slate-400 mb-8">Top performers in AI problem solving this week</p>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 overflow-hidden border border-transparent dark:border-slate-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Levels Cleared
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {leaderboard.map((entry) => (
                <tr
                  key={entry.id}
                  className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${user?.id === entry.id ? 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${entry.rank === 1
                        ? 'bg-yellow-500'
                        : entry.rank === 2
                          ? 'bg-gray-400'
                          : entry.rank === 3
                            ? 'bg-orange-500'
                            : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300'
                        }`}
                    >
                      {entry.rank}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-300">
                    {entry.roll_number || entry.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center mr-3">
                        <span className="text-gray-600 dark:text-slate-300 font-semibold">
                          {entry.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div className={`text-sm font-medium ${user?.id === entry.id ? 'text-blue-700 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-white'}`}>
                        {entry.name || 'Unknown'} {user?.id === entry.id && '(You)'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-300">
                    {entry.levels_cleared || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;

