import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * AdminBreadcrumb - Professional breadcrumb navigation for admin pages
 * 
 * @param {Array} items - Array of breadcrumb items: { label: string, path: string | null }
 *                        Last item should have path: null (current page)
 * 
 * Example usage:
 * <AdminBreadcrumb items={[
 *   { label: 'Courses', path: '/admin/courses' },
 *   { label: 'Machine Learning', path: '/admin/courses/123/levels' },
 *   { label: 'Level 1', path: null }
 * ]} />
 */
const AdminBreadcrumb = ({ items = [] }) => {
    return (
        <nav className="flex items-center gap-2 text-sm mb-6">
            {/* Home/Admin Link */}
            <Link
                to="/admin/overview"
                className="flex items-center gap-1.5 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
                <Home size={16} />
                <span className="font-medium">Admin</span>
            </Link>

            {/* Breadcrumb Items */}
            {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-gray-400 dark:text-slate-500" />
                    {item.path ? (
                        <Link
                            to={item.path}
                            className="text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium truncate max-w-[200px]"
                            title={item.label}
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span
                            className="text-gray-800 dark:text-white font-semibold truncate max-w-[200px]"
                            title={item.label}
                        >
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    );
};

export default AdminBreadcrumb;
