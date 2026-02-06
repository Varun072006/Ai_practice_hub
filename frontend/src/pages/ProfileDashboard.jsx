import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Code, Brain, Terminal, Database, BookOpen, Layers } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const ProfileDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalQuestionsSolved: 0,
        totalQuestionsAttempted: 0,
        leaderboardRank: 0
    });
    const [courseStats, setCourseStats] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/profile/dashboard');
            const data = response.data;

            setStats(data.stats || {
                totalQuestionsSolved: 0,
                totalQuestionsAttempted: 0,
                leaderboardRank: 0
            });

            setCourseStats(data.courseStats || []);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get icon component based on course icon name
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

    // Get user's initial
    const userInitial = (user?.name || user?.username || 'U')[0].toUpperCase();
    const userName = user?.name || user?.username || 'User';
    const userEmail = user?.email || 'user@gmail.com';
    const userRole = user?.role || 'student';

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
            <div className="flex-1 bg-gray-100 dark:bg-slate-900 min-h-screen pb-24 md:pb-8">
                <div className="max-w-5xl mx-auto p-4 md:p-6">

                    {/* Profile Header Card */}
                    <div className="rounded-2xl p-6 md:p-8 mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #7C5CFC 0%, #8B6DFF 100%)' }}>
                        <div className="flex items-center gap-4 md:gap-6">
                            {/* Avatar */}
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 border-4 border-white/30 rounded-full flex items-center justify-center">
                                <span className="text-2xl md:text-3xl font-bold text-white">{userInitial}</span>
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                                    {userName.toUpperCase()} PROFILE
                                </h1>
                                <p className="text-purple-100 text-sm md:text-base mb-3">{userEmail}</p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full uppercase">
                                        {userRole}
                                    </span>
                                    <span className="px-3 py-1 bg-green-400/30 text-white text-xs font-medium rounded-full flex items-center gap-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                        ACTIVE STATUS
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Questions Solved Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                                    <BookOpen className="text-blue-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
                                        {stats.totalQuestionsSolved}
                                    </h2>
                                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                                        Questions solved of {stats.totalQuestionsAttempted} attempted
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Rank Card */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                                    <Layers className="text-blue-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white">
                                        #{stats.leaderboardRank || 'N/A'}
                                    </h2>
                                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                                        Leaderboard Rank
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Skill Progress Overview */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Layers className="text-blue-500" size={20} />
                                Skill Progress Overview
                            </h3>
                            <span className="text-xs text-blue-500 font-medium uppercase tracking-wide">
                                DATA UPDATED TODAY
                            </span>
                        </div>

                        {/* Course Stats Grid */}
                        {courseStats.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {courseStats.map((course) => {
                                    const IconComponent = getCourseIcon(course.icon);
                                    return (
                                        <div
                                            key={course.courseId}
                                            className="bg-blue-50 dark:bg-slate-700/50 rounded-xl p-4 text-center hover:shadow-md transition-shadow"
                                        >
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <IconComponent className="text-blue-500" size={24} />
                                            </div>
                                            <h4 className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1 truncate">
                                                {course.courseName}
                                            </h4>
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                                                {course.questionsPassed}
                                            </p>
                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                                QUESTIONS ATTENDED
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                                <p>No course progress yet. Start practicing to see your stats!</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-8 text-gray-400 dark:text-slate-500 text-sm">
                        © 2024 Practice Hub. Information Display Only.
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ProfileDashboard;
