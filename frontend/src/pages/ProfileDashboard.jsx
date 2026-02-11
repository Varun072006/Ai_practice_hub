import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Code, Brain, Terminal, Database, BookOpen, Layers,
  BarChart3, CheckCircle2, Target, ChevronRight, Bell
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const ProfileDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [profile, setProfile] = useState({ bio: null, goal: null, photoUrl: null });

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
      setProfile(data.profile || { bio: null, goal: null, photoUrl: null });
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
  const userEmail = user?.email || 'user@practicehub.com';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const studentId = user?.roll_number || user?.id || '0000';

  // Derive skill proficiency from skills array
  const skillProficiency = skills.map(s => ({
    name: s.skillName,
    percentage: s.progressPercentage || 0,
    icon: getCourseIcon(s.courseId)
  }));

  // MCQ courses with data
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
    lastAttempt: 'Recently',
    courseId: c.courseId
  }));

  const totalCodingAttempted = courseStats.reduce((acc, c) => acc + (c.codingAttempted || 0), 0);
  const totalCodingPassed = courseStats.reduce((acc, c) => acc + (c.codingPassed || 0), 0);

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
      <div className="flex-1 bg-[#f4f6fb] dark:bg-slate-900 min-h-screen pb-24 md:pb-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <span
              className="hover:text-blue-600 cursor-pointer transition-colors"
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </span>
            <ChevronRight size={14} />
            <span className="hover:text-blue-600 cursor-pointer transition-colors">Users</span>
            <ChevronRight size={14} />
            <span className="text-gray-800 dark:text-white font-semibold">Learning Profile</span>

            {/* Right side icons */}
            <div className="ml-auto flex items-center gap-3">
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">
                <Bell size={18} />
              </button>
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </nav>

          {/* ============================================ */}
          {/* USER INFO BAR                                */}
          {/* ============================================ */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
              {/* Avatar + Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 dark:bg-slate-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xl md:text-2xl font-bold text-white">{userInitials}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">{userName}</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[11px] font-semibold rounded uppercase tracking-wide">
                      Student ID: {studentId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 md:gap-8 flex-wrap">
                {/* Total Solved */}
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Solved</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.totalQuestionsSolved}
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> /{stats.totalQuestionsAttempted}</span>
                  </p>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-10 bg-gray-200 dark:bg-slate-600"></div>

                {/* Global Rank */}
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Global Rank</p>
                  <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                    #{stats.leaderboardRank || 'N/A'}
                  </p>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-10 bg-gray-200 dark:bg-slate-600"></div>

                {/* Current Streak */}
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Current Streak</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.currentStreak}
                    <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> days</span>
                  </p>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px h-10 bg-gray-200 dark:bg-slate-600"></div>

                {/* Accuracy */}
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Accuracy</p>
                  <p className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.accuracyPercentage || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* MAIN TWO-COLUMN LAYOUT                       */}
          {/* ============================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

            {/* ========== LEFT SIDEBAR ========== */}
            <div className="space-y-6">

              {/* Skill Proficiency Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wide">Skill Proficiency</h2>
                  <BarChart3 size={18} className="text-gray-400 dark:text-gray-500" />
                </div>

                <div className="space-y-4">
                  {skillProficiency.length > 0 ? (
                    skillProficiency.map((skill, idx) => {
                      const IconComp = skill.icon;
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-50 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                            <IconComp size={16} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{skill.name}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{skill.percentage}%</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No skill data yet</p>
                  )}
                </div>


              </div>


            </div>

            {/* ========== RIGHT CONTENT ========== */}
            <div className="space-y-6">

              {/* MCQ Performance Breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <h2 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wide">MCQ Performance Breakdown</h2>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {totalMcqPassed} of {totalMcqAttempted} Attempted
                  </span>
                </div>

                {mcqCourses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-700">
                          <th className="text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3">Topic</th>
                          <th className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3">Solved / Total</th>
                          <th className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3">Accuracy</th>
                          <th className="text-right text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pb-3">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mcqCourses.map((course, idx) => {
                          const progressPercent = course.total > 0 ? (course.solved / course.total) * 100 : 0;
                          return (
                            <tr key={idx} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                              <td className="py-3.5">
                                <span className="text-sm font-semibold text-gray-800 dark:text-white">{course.topic}</span>
                              </td>
                              <td className="py-3.5 text-center">
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {course.solved} <span className="text-gray-400 dark:text-gray-500">/{course.total}</span>
                                </span>
                              </td>
                              <td className="py-3.5 text-center">
                                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{course.accuracy}%</span>
                              </td>
                              <td className="py-3.5">
                                <div className="flex justify-end">
                                  <div className="w-28 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                      style={{ width: `${progressPercent}%` }}
                                    ></div>
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
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <Brain size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No MCQ questions attempted yet</p>
                  </div>
                )}
              </div>

              {/* Coding Challenges Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Code size={20} className="text-blue-500" />
                    <h2 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wide">Coding Challenges Summary</h2>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {totalCodingPassed} of {totalCodingAttempted} Successfully Passed
                  </span>
                </div>

                {codingCourses.length > 0 ? (
                  <div className="space-y-5">
                    {codingCourses.map((course, idx) => {
                      const progressPercent = course.total > 0 ? (course.passed / course.total) * 100 : 0;
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">{course.topic}</h4>
                              <span className="text-sm text-gray-700 dark:text-gray-300 shrink-0 ml-3">
                                <span className="font-bold text-gray-900 dark:text-white">{course.passed}</span>
                                <span className="text-gray-400 dark:text-gray-500"> / {course.total} passed</span>
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide">
                              Last attempt: {course.lastAttempt}
                            </p>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <Terminal size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No coding challenges attempted yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>


        </div>
      </div>
    </Layout>
  );
};

export default ProfileDashboard;
