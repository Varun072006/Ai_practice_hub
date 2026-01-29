import { ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import { useNavigation } from '../context/NavigationContext';

const Layout = ({ children }) => {
    const { navigateBack, canGoBack, currentPath } = useNavigation();

    // Determine if current page should hide the global back button
    const isRootPage = ['/dashboard', '/login', '/register', '/forgot-password', '/admin/overview', '/profile'].includes(currentPath);
    const isResultsPage = currentPath.startsWith('/results/');
    const hideBackButton = isRootPage || isResultsPage;

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
            <Sidebar />
            <div className="flex-1 transition-all duration-300 flex flex-col relative min-w-0">
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
