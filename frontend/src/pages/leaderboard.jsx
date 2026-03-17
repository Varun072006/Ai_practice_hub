import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, RefreshCw, Trophy, Medal, Award, ChevronLeft, ChevronRight } from 'lucide-react';

const Leaderboard = () => {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [topThree, setTopThree] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const limit = 20;

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

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [topRes, rankRes] = await Promise.all([
                    api.get('/progress/leaderboard?limit=3'),
                    api.get('/progress/leaderboard/my-rank'),
                ]);
                setTopThree(topRes.data || []);
                setMyRank(rankRes.data || null);
            } catch (error) {
                console.error('Failed to fetch initial data:', error);
            }
        };
        fetchInitial();
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Trophy className="text-yellow-500" size={15} />;
        if (rank === 2) return <Medal className="text-slate-400" size={15} />;
        if (rank === 3) return <Award className="text-orange-500" size={15} />;
        return null;
    };

    const podiumStyles = [
        { avatar: 'bg-yellow-500', border: 'border-yellow-200 dark:border-yellow-800', rankBg: 'bg-yellow-500', rankIcon: Trophy },
        { avatar: 'bg-slate-400', border: 'border-slate-200 dark:border-slate-600', rankBg: 'bg-slate-400', rankIcon: Medal },
        { avatar: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800', rankBg: 'bg-orange-500', rankIcon: Award },
    ];

    return (
        <Layout>
            <div className="flex-1 p-4 md:p-8 bg-gray-50 dark:bg-slate-900 min-h-screen max-w-full overflow-hidden">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Leaderboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">See how you rank against other learners</p>
                </div>

                {/* Top 3 Podium */}
                {topThree.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {topThree.map((entry, index) => {
                            const isYou = user?.id === entry.id;
                            const RankIcon = podiumStyles[index].rankIcon;
                            return (
                                <div
                                    key={entry.id}
                                    className={`bg-white dark:bg-slate-800 rounded-xl border ${isYou ? 'border-blue-300 dark:border-blue-700' : podiumStyles[index].border} p-5 transition-shadow hover:shadow-md`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-11 h-11 rounded-full ${podiumStyles[index].avatar} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                                {getInitials(entry.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                                                    {entry.name || 'Unknown'}
                                                    {isYou && <span className="ml-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">(You)</span>}
                                                </h3>
                                                {entry.roll_number && (
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{entry.roll_number}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`w-9 h-9 rounded-lg ${podiumStyles[index].rankBg} flex items-center justify-center shrink-0`}>
                                            <RankIcon size={18} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                        <div>
                                            <p className="text-lg font-bold text-slate-800 dark:text-white">{entry.levels_cleared}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Levels</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-slate-800 dark:text-white">{entry.problems_solved}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Solved</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-800 dark:text-white">{Math.round(entry.efficiency || 0)}%</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Efficiency</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Your Stats */}
                {myRank && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5 mb-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold text-slate-800 dark:text-white">Your Performance</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {myRank.rank > 0
                                        ? `Ranked #${myRank.rank} of ${myRank.total_users} users`
                                        : 'Complete sessions to get ranked'}
                                </p>
                            </div>
                            <div className="flex items-center gap-6 sm:gap-8">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">#{myRank.rank > 0 ? myRank.rank : '—'}</p>
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-0.5">Rank</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{myRank.levels_cleared}</p>
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-0.5">Levels</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{myRank.problems_solved}</p>
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-0.5">Solved</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{myRank.efficiency}%</p>
                                    <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-0.5">Efficiency</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rankings Table */}
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                            All Rankings
                            {totalUsers > 0 && <span className="text-slate-400 dark:text-slate-500 font-normal ml-2">({totalUsers})</span>}
                        </h3>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Search user..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full sm:w-52 pl-8 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <button
                                onClick={() => fetchData()}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <p className="text-sm">No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700">
                                        <th className="text-left py-2.5 px-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider w-16">Rank</th>
                                        <th className="text-left py-2.5 px-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Roll No.</th>
                                        <th className="text-left py-2.5 px-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Name</th>
                                        <th className="text-center py-2.5 px-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Levels</th>
                                        <th className="text-center py-2.5 px-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:table-cell">Solved</th>
                                        <th className="text-right py-2.5 px-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {leaderboard.map((entry) => {
                                        const isYou = user?.id === entry.id;
                                        return (
                                            <tr
                                                key={entry.id}
                                                className={`transition-colors ${isYou
                                                    ? 'bg-blue-50/50 dark:bg-blue-900/10'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                                                    }`}
                                            >
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center gap-1.5">
                                                        {getRankIcon(entry.rank)}
                                                        <span className={`text-sm ${entry.rank <= 3 ? 'font-semibold text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {entry.rank}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                                                        {entry.roll_number || '-'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${isYou
                                                            ? 'bg-blue-600 text-white'
                                                            : entry.rank <= 3
                                                                ? `${podiumStyles[entry.rank - 1]?.avatar || 'bg-slate-200'} text-white`
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                            }`}>
                                                            {getInitials(entry.name)}
                                                        </div>
                                                        <span className={`text-sm ${isYou ? 'font-semibold text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                            {entry.name || 'Unknown'}
                                                            {isYou && <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">YOU</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4 text-center text-sm text-slate-600 dark:text-slate-300">
                                                    {entry.levels_cleared}
                                                </td>
                                                <td className="py-2.5 px-4 text-center text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                                                    {entry.problems_solved}
                                                </td>
                                                <td className="py-2.5 px-4 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {Math.round(entry.efficiency)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <p className="text-xs text-slate-400">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${page === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Leaderboard;
