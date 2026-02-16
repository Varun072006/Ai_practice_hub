import { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/Layout';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Search, RefreshCw, Trophy, Medal, Award, Users, TrendingUp, Target, ChevronLeft, ChevronRight } from 'lucide-react';

const AdminLeaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [topThree, setTopThree] = useState([]);
    const limit = 20;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/progress/leaderboard/paginated?page=${page}&limit=${limit}&search=${debouncedSearch}`);
            setLeaderboard(response.data.data || []);
            setTotalPages(response.data.totalPages || 1);
            setTotalUsers(response.data.total || 0);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    // Fetch top 3 once
    useEffect(() => {
        const fetchTopThree = async () => {
            try {
                const response = await api.get('/progress/leaderboard?limit=3');
                setTopThree(response.data || []);
            } catch (error) {
                console.error('Failed to fetch top 3:', error);
            }
        };
        fetchTopThree();
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Stats computed from top 3 and total
    const topScore = topThree.length > 0 ? topThree[0]?.levels_cleared || 0 : 0;
    const avgEfficiency = topThree.length > 0
        ? Math.round(topThree.reduce((sum, u) => sum + (u.efficiency || 0), 0) / topThree.length)
        : 0;

    const getRankBadge = (rank) => {
        if (rank === 1) return <Trophy className="text-yellow-500" size={18} />;
        if (rank === 2) return <Medal className="text-slate-400" size={18} />;
        if (rank === 3) return <Award className="text-orange-500" size={18} />;
        return null;
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
    };

    const podiumColors = [
        { bg: 'from-yellow-400 to-amber-500', ring: 'ring-yellow-300', label: 'TOP PERFORMER', labelColor: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400' },
        { bg: 'from-slate-300 to-slate-400', ring: 'ring-slate-300', label: 'RUNNER UP', labelColor: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300' },
        { bg: 'from-orange-400 to-orange-500', ring: 'ring-orange-300', label: 'THIRD PLACE', labelColor: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400' },
    ];

    return (
        <Layout>
            <div className="p-4 md:p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
                <AdminBreadcrumb items={[{ label: 'Leaderboard', path: null }]} />

                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Trophy className="text-yellow-500" size={28} />
                        Leaderboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Performance tracking and user rankings</p>
                </div>

                {/* Top 3 Podium Cards */}
                {topThree.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {topThree.map((user, index) => (
                            <div
                                key={user.id}
                                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 relative overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${podiumColors[index].labelColor}`}>
                                        {podiumColors[index].label}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${podiumColors[index].bg} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                        {index + 1}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${podiumColors[index].bg} flex items-center justify-center text-white font-bold text-sm ring-2 ${podiumColors[index].ring} ring-offset-2 dark:ring-offset-slate-800`}>
                                        {getInitials(user.name)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{user.name || 'Unknown'}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {user.levels_cleared} Levels · {user.problems_solved} Problems
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-4 text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">
                                        Efficiency: <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(user.efficiency || 0)}%</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Users className="text-blue-600 dark:text-blue-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalUsers.toLocaleString()}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Ranked Users</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{topScore}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Highest Levels Cleared</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Target className="text-purple-600 dark:text-purple-400" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{avgEfficiency}%</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Avg. Efficiency (Top 3)</p>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    {/* Table Header Bar */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white">All Users Ranking</h3>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-60 pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={() => fetchData()}
                                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                            <Trophy size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">No users found</p>
                            <p className="text-xs mt-1">No matching results for your search</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-16">Rank</th>
                                        <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Roll Number</th>
                                        <th className="text-left py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Name</th>
                                        <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Levels Cleared</th>
                                        <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Problems Solved</th>
                                        <th className="text-center py-3 px-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {leaderboard.map((user) => {
                                        const isTop3 = user.rank <= 3;
                                        return (
                                            <tr
                                                key={user.id}
                                                className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isTop3 ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {getRankBadge(user.rank)}
                                                        <span className={`text-sm font-bold ${isTop3 ? 'text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {user.rank}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                                                        {user.roll_number || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${isTop3
                                                            ? `bg-gradient-to-br ${podiumColors[user.rank - 1]?.bg || 'from-slate-200 to-slate-300'} text-white`
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                            }`}>
                                                            {getInitials(user.name)}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-800 dark:text-white">{user.name || 'Unknown'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                        {user.levels_cleared}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user.problems_solved}</span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-14 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                                            <div
                                                                className={`h-1.5 rounded-full transition-all ${user.efficiency >= 80 ? 'bg-emerald-500' : user.efficiency >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${Math.min(user.efficiency, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">{Math.round(user.efficiency)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Page <span className="font-medium text-slate-700 dark:text-slate-300">{page}</span> of <span className="font-medium text-slate-700 dark:text-slate-300">{totalPages}</span>
                                <span className="ml-2">({totalUsers} total users)</span>
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page === pageNum
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AdminLeaderboard;
