
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
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-red-100 text-red-700 border-red-200';
    };

    const getScoreColor = (score) => {
        if (score >= 75) return 'text-green-600 font-bold';
        if (score >= 60) return 'text-yellow-600 font-semibold';
        return 'text-red-600 font-semibold';
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
            <div className="flex-1 p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Student Results</h1>
                        <p className="text-gray-600">Track and analyze student performance across all courses</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                        <div className="relative flex-1 w-full md:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or course..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
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
                            <tbody className="divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                            Loading results...
                                        </td>
                                    </tr>
                                ) : filteredResults.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                            No results found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredResults.map((result, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-600">
                                                {result.student_id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                                                        {result.student_name.substring(0, 2)}
                                                    </div>
                                                    <span className="font-medium text-gray-800">{result.student_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(result.date_time).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                                {result.course}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {result.level}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${result.test_type === 'MCQ'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                    : result.test_type === 'HTML/CSS'
                                                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
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
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                        <span>Showing {filteredResults.length} results</span>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default StudentResults;

