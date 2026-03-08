import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Sun, Moon, Image as ImageIcon } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const studentMenuItems = [
    { path: '/dashboard', label: 'Courses', image: '/assets/user-icons/courses.png' },
    { path: '/progress', label: 'My Progress', image: '/assets/user-icons/progress.png' },
    { path: '/ai-coach', label: 'AI Coach', image: '/assets/user-icons/ai-coach.png' },
    { path: '/leaderboard', label: 'Leaderboard', image: '/assets/user-icons/leaderboard.png' },
    { path: '/profile', label: 'My Profile', image: '/assets/user-icons/profile.png' },
  ];

  const adminMenuItems = [
    { path: '/admin/dashboard', label: 'Overview', image: '/assets/admin-icons/overview.png' },
    { path: '/admin/users', label: 'User Management', image: '/assets/admin-icons/users.png' },
    { path: '/admin/assignments', label: 'Assignments', image: '/assets/admin-icons/assignments.png' },
    { path: '/admin/courses', label: 'Courses & Questions', image: '/assets/admin-icons/courses.png' },
    { path: '/admin/results', label: 'Student Results', image: '/assets/admin-icons/results.png' },
    { path: '/admin/leaderboard', label: 'Leaderboard', image: '/assets/admin-icons/leaderboard.png' },
    { path: '/admin/assets', label: 'Assets', icon: ImageIcon },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : studentMenuItems;

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <img src={theme === 'dark' ? '/assets/logo-light.png' : '/assets/logo-dark.png'} alt="Practice Hub" className="w-8 h-8 rounded-lg object-contain" />
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">Practice Hub</h1>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
        </button>
      </div>

      {/* Desktop Sidebar - Fixed Width with Tooltips */}
      <div
        className="hidden md:flex h-full bg-gray-50 dark:bg-slate-900 flex-col border-r border-gray-200 dark:border-slate-800 z-50 w-20 group/sidebar shadow-lg shrink-0 overflow-visible transition-colors duration-300"
      >
        <div className="mb-8 p-6 flex justify-center">
          <div className="relative group flex justify-center items-center">
            <img
              src={theme === 'dark' ? '/assets/logo-light.png' : '/assets/logo-dark.png'}
              alt="Practice Hub"
              className="w-10 h-10 rounded-lg object-contain cursor-pointer transition-transform hover:scale-110 active:scale-95"
            />
            {/* Logo Tooltip */}
            <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800/95 dark:bg-slate-700/95 backdrop-blur-sm text-white text-sm font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
              Practice Hub
              {user?.role === 'admin' && <span className="block text-[10px] opacity-70 font-normal">Admin Dashboard</span>}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/');

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center p-3 rounded-xl transition-all duration-200 group relative ${isActive
                  ? 'border-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm'
                  }`}
              >
                {isActive && (
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-600 rounded-r-full" />
                )}
                <div className="flex items-center justify-center relative">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.label}
                      className={`w-7 h-7 object-contain transition-all duration-300 ${isActive ? 'scale-110' : 'grayscale-[40%] opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110'}`}
                    />
                  ) : (
                    <Icon size={24} className={`transition-all duration-200 ${isActive ? 'scale-110 text-blue-600' : 'group-hover:scale-110'}`} />
                  )}
                </div>

                {/* Menu Label Tooltip */}
                <span className="absolute left-full ml-4 px-3 py-2 bg-slate-800/95 dark:bg-slate-700/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-gray-100 dark:border-slate-800 p-3 space-y-3">
          {/* User Profile Tooltip */}
          <div className="relative group mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-slate-700 cursor-default shadow-sm group-hover:shadow-md transition-all">
              {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="absolute left-full bottom-0 ml-4 px-3 py-2 bg-slate-800/95 dark:bg-slate-700/95 backdrop-blur-sm text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
              <p className="font-bold">{user?.name || user?.username}</p>
              <p className="text-xs opacity-70 capitalize">{user?.role}</p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-yellow-500 transition-all duration-200 group relative shadow-none hover:shadow-sm"
          >
            {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            <span className="absolute left-full ml-4 px-3 py-2 bg-slate-800/95 dark:bg-slate-700/95 backdrop-blur-sm text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl border border-white/10">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            onClick={logout}
            className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all duration-200 group relative"
          >
            <LogOut size={24} />
            <span className="absolute left-full ml-4 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-10px] group-hover:translate-x-0 pointer-events-none whitespace-nowrap z-[100] shadow-xl">
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-around p-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                }`}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.label}
                  className={`w-6 h-6 object-contain transition-all duration-300 filter ${isActive ? 'grayscale-0 opacity-100 scale-110' : 'grayscale-[50%] opacity-70'}`}
                />
              ) : (
                <Icon size={24} className={`transition-all duration-300 ${isActive ? 'scale-110 text-blue-600' : 'text-gray-500'}`} />
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button onClick={logout} className="flex flex-col items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
};

export default Sidebar;

