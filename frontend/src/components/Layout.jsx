import { ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
    const { navigateBack, canGoBack, currentPath } = useNavigation();
    const { user } = useAuth();

    // Determine if current page should hide the global back button
    const isRootPage = ['/dashboard', '/login', '/register', '/forgot-password', '/admin/overview', '/profile'].includes(currentPath);
    const isResultsPage = currentPath.startsWith('/results/');
    const isTestPage = currentPath.startsWith('/practice/') || currentPath.startsWith('/mcq-practice/');
    const hideBackButton = isRootPage || isResultsPage;

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 transition-all duration-300 flex flex-col relative min-w-0">

                {/* User Info Header - Top Right (excluding test pages) */}
                {!isTestPage && user && (
                    <div className="absolute top-4 right-6 z-50 text-right pointer-events-none">
                        <div className="inline-block text-left pointer-events-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-xl shadow-sm">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {user.name || user.username}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400 font-mono mt-0.5">
                                {user.roll_number || user.id.substring(0, 8)}
                            </div>
                        </div>
                    </div>
                )}

                {!hideBackButton && canGoBack() && (
                    <div className="w-full flex justify-end px-4 py-2 z-40">
                        <button
                            onClick={navigateBack}
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            <ArrowLeft size={18} />
                            <span className="font-medium text-sm">Back</span>
                        </button>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 w-full relative overflow-x-hidden">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
