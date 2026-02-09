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

                    {/* MCQ Questions Breakdown */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 mt-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Brain className="text-green-500" size={20} />
                                MCQ Questions Breakdown
                            </h3>
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                                Multiple Choice
                            </span>
                        </div>

                        {courseStats.some(c => (c.mcqAttempted || 0) > 0) ? (
                            <div className="space-y-4">
                                {courseStats.filter(c => (c.mcqAttempted || 0) > 0).map((course) => {
                                    const IconComponent = getCourseIcon(course.icon);
                                    const mcqPassed = course.mcqPassed || 0;
                                    const mcqAttempted = course.mcqAttempted || 0;
                                    const accuracy = mcqAttempted > 0 ? Math.round((mcqPassed / mcqAttempted) * 100) : 0;
                                    return (
                                        <div
                                            key={`mcq-${course.courseId}`}
                                            className="flex items-center gap-4 p-4 bg-green-50 dark:bg-slate-700/50 rounded-xl"
                                        >
                                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center shrink-0">
                                                <IconComponent className="text-green-500" size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                                    {course.courseName}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                                    {mcqPassed} correct of {mcqAttempted} attempted
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xl font-bold text-green-600 dark:text-green-400">{mcqPassed}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-400">{accuracy}% accuracy</p>
                                            </div>
                                            <div className="w-24 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden shrink-0">
                                                <div
                                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${accuracy}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* MCQ Total Summary */}
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600 dark:text-slate-300">Total MCQ Questions</span>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                                {courseStats.reduce((acc, c) => acc + (c.mcqPassed || 0), 0)}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-slate-400"> / {courseStats.reduce((acc, c) => acc + (c.mcqAttempted || 0), 0)} attempted</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 dark:text-slate-400">
                                <Brain size={36} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No MCQ questions attempted yet</p>
                            </div>
                        )}
                    </div>

                    {/* Coding Questions Breakdown */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 mt-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Terminal className="text-purple-500" size={20} />
                                Coding Questions Breakdown
                            </h3>
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-full">
                                Programming
                            </span>
                        </div>

                        {courseStats.some(c => (c.codingAttempted || 0) > 0) ? (
                            <div className="space-y-4">
                                {courseStats.filter(c => (c.codingAttempted || 0) > 0).map((course) => {
                                    const IconComponent = getCourseIcon(course.icon);
                                    const codingPassed = course.codingPassed || 0;
                                    const codingAttempted = course.codingAttempted || 0;
                                    const accuracy = codingAttempted > 0 ? Math.round((codingPassed / codingAttempted) * 100) : 0;
                                    return (
                                        <div
                                            key={`coding-${course.courseId}`}
                                            className="flex items-center gap-4 p-4 bg-purple-50 dark:bg-slate-700/50 rounded-xl"
                                        >
                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center shrink-0">
                                                <IconComponent className="text-purple-500" size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                                    {course.courseName}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                                    {codingPassed} passed of {codingAttempted} attempted
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{codingPassed}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-slate-400">{accuracy}% success</p>
                                            </div>
                                            <div className="w-24 h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden shrink-0">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${accuracy}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Coding Total Summary */}
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600 dark:text-slate-300">Total Coding Questions</span>
                                        <div className="text-right">
                                            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                                {courseStats.reduce((acc, c) => acc + (c.codingPassed || 0), 0)}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-slate-400"> / {courseStats.reduce((acc, c) => acc + (c.codingAttempted || 0), 0)} attempted</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 dark:text-slate-400">
                                <Terminal size={36} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No coding questions attempted yet</p>
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
