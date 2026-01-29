import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Home, LayoutDashboard, TrendingUp, Bot, Trophy, LogOut, Users, GraduationCap, ClipboardList, User, Moon, Sun } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const studentMenuItems = [
    { path: '/dashboard', label: 'Courses', icon: LayoutDashboard },
    { path: '/progress', label: 'My Progress', icon: TrendingUp },
    { path: '/ai-coach', label: 'AI Coach', icon: Bot },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/profile', label: 'My Profile', icon: User },
  ];

  const adminMenuItems = [
    { path: '/admin/overview', label: 'Overview', icon: Home },
    { path: '/admin/users', label: 'User Management', icon: Users },
    { path: '/admin/courses', label: 'Courses & Questions', icon: GraduationCap },
    { path: '/admin/results', label: 'Student Results', icon: ClipboardList },
    { path: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : studentMenuItems;

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between sticky top-0 z-40 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">&gt;_</span>
          </div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">AI Practice Hub</h1>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
        </button>
      </div>

      {/* Desktop Sidebar Shover Effect */}
      <div className="hidden md:flex sticky left-0 top-0 h-screen bg-gray-50 dark:bg-slate-900 flex-col border-r border-gray-200 dark:border-slate-800 z-50 transition-all duration-300 w-20 hover:w-64 group shadow-lg shrink-0">
        <div className="mb-8 p-6">
          <div className="flex items-center gap-2 mb-2 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 min-w-[2rem] bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">&gt;_</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Practice Hub</h1>
              {user?.role === 'admin' && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin Dashboard</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/');

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 mb-2 rounded-lg transition-all overflow-hidden whitespace-nowrap ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="min-w-[1.25rem]">
                  <Icon size={20} />
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-slate-800 p-4">
          <div className="mb-4 overflow-hidden whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="font-semibold text-gray-800 dark:text-white truncate">{user?.name || user?.username}</p>
            {user?.role === 'student' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-3 w-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors overflow-hidden whitespace-nowrap mb-2"
          >
            <div className="min-w-[1.25rem]">
              {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-1 text-left">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-3 w-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors overflow-hidden whitespace-nowrap"
          >
            <div className="min-w-[1.25rem]">
              <LogOut size={20} />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      < div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex justify-around p-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]" >
        {
          menuItems.map((item) => {
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
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })
        }
        < button onClick={logout} className="flex flex-col items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400" >
          <LogOut size={20} />
          <span>Logout</span>
        </button >
      </div >
    </>
  );
};

export default Sidebar;

