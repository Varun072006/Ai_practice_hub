
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Search, Filter, Download } from 'lucide-react';

const StudentResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, pass, fail

    useEffect(() => {
        fetchResults();
    }, [searchTerm]);

    const fetchResults = async () => {
        try {
            const response = await api.get(`/admin/results?search=${searchTerm}`);
            setResults(response.data);
        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredResults = results.filter(result => {
        if (filter === 'all') return true;
        return result.status.toLowerCase() === filter;
    });

    const getStatusColor = (status) => {
        return status === 'Pass'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    };

    const getScoreColor = (score) => {
        if (score >= 75) return 'text-green-600 dark:text-green-400 font-bold';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400 font-semibold';
        return 'text-red-600 dark:text-red-400 font-semibold';
    };

    const handleExportCSV = () => {
        if (filteredResults.length === 0) {
            alert('No data to export.');
            return;
        }

        // CSV Header
        const headers = ['Student ID', 'Student Name', 'Date & Time', 'Course', 'Level', 'Test Type', 'Score (%)', 'Status'];

        // CSV Rows
        const csvRows = filteredResults.map(result => [
            result.student_id || 'N/A',
            result.student_name,
            result.date_time ? new Date(result.date_time).toLocaleString() : 'N/A',
            result.course,
            result.level,
            result.test_type,
            result.score !== undefined ? result.score : 'N/A',
            result.status
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `student_results_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Layout>
            <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Student Results</h1>
                        <p className="text-gray-600 dark:text-slate-400">Track and analyze student performance across all courses</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                        <div className="relative flex-1 w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or course..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                            />
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700"
                            >
                                <option value="all">All Status</option>
                                <option value="pass">Passed</option>
                                <option value="fail">Failed</option>
                            </select>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                <Download size={18} />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                                    <th className="px-6 py-4">Student ID</th>
                                    <th className="px-6 py-4">Student Name</th>
                                    <th className="px-6 py-4">Date & Time</th>
                                    <th className="px-6 py-4">Course</th>
                                    <th className="px-6 py-4">Level</th>
                                    <th className="px-6 py-4">Test Type</th>
                                    <th className="px-6 py-4">Score</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                            Loading results...
                                        </td>
                                    </tr>
                                ) : filteredResults.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                                            No results found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResults.map((result, index) => (
                                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-slate-400">
                                                {result.student_id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                                                        {result.student_name.substring(0, 2)}
                                                    </div>
                                                    <span className="font-medium text-gray-800 dark:text-white">{result.student_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                                                {new Date(result.date_time).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-800 dark:text-white font-medium">
                                                {result.course}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">
                                                {result.level}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${result.test_type === 'MCQ'
                                                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                                                    : result.test_type === 'HTML/CSS'
                                                        ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                                                        : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                                    }`}>
                                                    {result.test_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm ${getScoreColor(result.score)}`}>
                                                    {result.score !== undefined ? `${result.score}%` : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getStatusColor(result.status)}`}>
                                                    {result.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination (Visual only for now) */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                        <span>Showing {filteredResults.length} results</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-700 dark:text-slate-300" disabled>Previous</button>
                            <button className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-700 dark:text-slate-300" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default StudentResults;
