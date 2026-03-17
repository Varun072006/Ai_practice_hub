import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Code, Brain, Terminal, Database, BookOpen, Layers,
  CheckCircle2
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const ProfileDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalQuestionsSolved: 0,
    totalQuestionsAttempted: 0,
    leaderboardRank: 0,
    currentStreak: 0,
    accuracyPercentage: 0
  });
  const [courseStats, setCourseStats] = useState([]);
  const [skills, setSkills] = useState([]);

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
        leaderboardRank: 0,
        currentStreak: 0,
        accuracyPercentage: 0
      });
      setCourseStats(data.courseStats || []);
      setSkills(data.skills || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const userName = user?.name || user?.username || 'User';
  const userEmail = user?.email || '';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const rollNumber = user?.roll_number || null;

  // Derive skill proficiency
  const skillProficiency = skills.map(s => ({
    name: s.skillName,
    percentage: s.progressPercentage || 0,
    icon: getCourseIcon(s.courseId)
  }));

  // MCQ courses
  const mcqCourses = courseStats.filter(c => (c.mcqAttempted || 0) > 0).map(c => ({
    topic: c.courseName,
    solved: c.mcqPassed || 0,
    total: c.mcqAttempted || 0,
    accuracy: c.mcqAttempted > 0 ? ((c.mcqPassed / c.mcqAttempted) * 100).toFixed(1) : '0.0'
  }));

  const totalMcqAttempted = courseStats.reduce((acc, c) => acc + (c.mcqAttempted || 0), 0);
  const totalMcqPassed = courseStats.reduce((acc, c) => acc + (c.mcqPassed || 0), 0);

  // Coding courses with data
  const codingCourses = courseStats.filter(c => (c.codingAttempted || 0) > 0).map(c => ({
    topic: c.courseName,
    passed: c.codingPassed || 0,
    total: c.codingAttempted || 0,
    courseId: c.courseId
  }));

  const totalCodingAttempted = courseStats.reduce((acc, c) => acc + (c.codingAttempted || 0), 0);
  const totalCodingPassed = courseStats.reduce((acc, c) => acc + (c.codingPassed || 0), 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-slate-900 min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 dark:bg-slate-900 min-h-screen pb-24 md:pb-8">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6">

          {/* Profile Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 bg-slate-700 dark:bg-slate-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-white">{userInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-slate-800 dark:text-white">{userName}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{userEmail}</p>
                {rollNumber && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{rollNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Total Solved</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {stats.totalQuestionsSolved}
                <span className="text-sm font-normal text-slate-400"> / {stats.totalQuestionsAttempted}</span>
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Rank</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {stats.leaderboardRank > 0 ? `#${stats.leaderboardRank}` : '—'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Streak</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">
                {stats.currentStreak}
                <span className="text-sm font-normal text-slate-400"> days</span>
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Accuracy</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.accuracyPercentage || 0}%
              </p>
            </div>
          </div>

          {/* Skills */}
          {skillProficiency.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Skills</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {skillProficiency.map((skill, idx) => {
                  const IconComp = skill.icon;
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                      <IconComp size={16} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{skill.name}</span>
                      <span className="text-sm font-semibold text-slate-800 dark:text-white">{skill.percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MCQ Performance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">MCQ Performance</h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {totalMcqPassed} / {totalMcqAttempted} passed
              </span>
            </div>

            {mcqCourses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2.5">Course</th>
                      <th className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2.5">Solved</th>
                      <th className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2.5">Accuracy</th>
                      <th className="text-right text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-2.5 hidden sm:table-cell">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {mcqCourses.map((course, idx) => {
                      const progressPercent = course.total > 0 ? (course.solved / course.total) * 100 : 0;
                      return (
                        <tr key={idx}>
                          <td className="py-3">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{course.topic}</span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {course.solved}<span className="text-slate-400"> / {course.total}</span>
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{course.accuracy}%</span>
                          </td>
                          <td className="py-3 hidden sm:table-cell">
                            <div className="flex justify-end">
                              <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No MCQ attempts yet</p>
            )}
          </div>

          {/* Coding Challenges */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-blue-500" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Coding Challenges</h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {totalCodingPassed} / {totalCodingAttempted} passed
              </span>
            </div>

            {codingCourses.length > 0 ? (
              <div className="space-y-3">
                {codingCourses.map((course, idx) => {
                  const progressPercent = course.total > 0 ? (course.passed / course.total) * 100 : 0;
                  return (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{course.topic}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {course.passed}<span className="text-slate-400"> / {course.total}</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No coding challenges attempted yet</p>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default ProfileDashboard;
