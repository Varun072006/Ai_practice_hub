import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Search, Edit, Trash2, Trophy, RefreshCw } from 'lucide-react';

const AdminLeaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/progress/leaderboard?limit=50');
            setLeaderboard(response.data);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this user from the leaderboard?')) {
            return;
        }

        try {
            // In a real app, call API to delete or hide user
            setLeaderboard(leaderboard.filter((user) => user.id !== userId));
            alert('User removed from leaderboard');
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Failed to remove user');
        }
    };

    const handleEditUser = (user) => {
        const newName = prompt('Enter new name:', user.name);
        if (newName && newName.trim()) {
            setLeaderboard(
                leaderboard.map((u) => (u.id === user.id ? { ...u, name: newName.trim() } : u))
            );
        }
    };

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
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Trophy className="text-yellow-500" size={24} />
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Leaderboard</h2>
                                <p className="text-gray-600 dark:text-slate-400 text-sm">Top performers ranked by levels cleared</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by student name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                                />
                            </div>
                            <button
                                onClick={fetchData}
                                className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                                title="Refresh data"
                            >
                                <RefreshCw size={20} />
                                <span className="hidden md:inline">Refresh</span>
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                {leaderboard
                                    .filter((user) => {
                                        if (!searchTerm) return true;
                                        const search = searchTerm.toLowerCase();
                                        return (
                                            user.name?.toLowerCase().includes(search) ||
                                            user.roll_number?.toLowerCase().includes(search) ||
                                            user.id?.toLowerCase().includes(search)
                                        );
                                    })
                                    .map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${user.rank === 1
                                                        ? 'bg-yellow-500'
                                                        : user.rank === 2
                                                            ? 'bg-gray-400'
                                                            : user.rank === 3
                                                                ? 'bg-orange-500'
                                                                : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-slate-300'
                                                        }`}
                                                >
                                                    {user.rank}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-300">
                                                {user.roll_number || user.id.substring(0, 8)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-slate-600 flex items-center justify-center mr-3">
                                                        <span className="text-gray-600 dark:text-slate-300 font-semibold">
                                                            {user.name?.charAt(0) || 'U'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || 'Unknown'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-300">
                                                {user.levels_cleared || 0}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditUser(user)}
                                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                                        title="Edit user"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
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

export default AdminLeaderboard;
