import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { BookOpen, Calendar, Check, Search, Users, Plus, RefreshCw, Trash2, Award, X } from 'lucide-react';

const AdminAssignments = () => {
    const [assignments, setAssignments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        target_type: 'all', // all, department, year, user
        target_value: '',
        course_id: '',
        level_id: ''
    });

    useEffect(() => {
        fetchAssignments();
        fetchCourses();
    }, []);

    useEffect(() => {
        if (formData.course_id) {
            fetchLevels(formData.course_id);
        } else {
            setLevels([]);
        }
    }, [formData.course_id]);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/assignments');
            setAssignments(res.data);
        } catch (error) {
            console.error("Failed to fetch assignments", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses'); // Assuming public or admin endpoint exists
            setCourses(res.data);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        }
    };

    const fetchLevels = async (courseId) => {
        try {
            const res = await api.get(`/courses/${courseId}/levels`);
            setLevels(res.data);
        } catch (error) {
            console.error("Failed to fetch levels", error);
        }
    };

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentDetails, setAssignmentDetails] = useState([]);

    const fetchAssignmentDetails = async (assignmentId) => {
        try {
            const res = await api.get(`/admin/assignments/${assignmentId}`);
            setAssignmentDetails(res.data);
            setShowDetailsModal(true);
        } catch (error) {
            console.error("Failed to fetch assignment details", error);
            alert("Failed to fetch details");
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/admin/assignments', formData);
            alert('Assignment created successfully!');
            setFormData({
                title: '',
                target_type: 'all',
                target_value: '',
                course_id: '',
                level_id: ''
            });
            fetchAssignments();
        } catch (error) {
            console.error("Failed to create assignment", error);
            alert(error.response?.data?.error || 'Failed to create assignment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8 transition-colors duration-300">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Task Assignments</h1>
                    <p className="text-gray-600 dark:text-slate-400">Assign specific tasks to students based on department, year, or individually.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Assignment Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 p-6 sticky top-24">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Plus size={20} className="text-blue-500" />
                                Create New Assignment
                            </h2>

                            <form onSubmit={handleCreateAssignment} className="space-y-4">
                                {/* Assignment Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignment Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., Complete Python Basics"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                {/* Target Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                                    <select
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        value={formData.target_type}
                                        onChange={(e) => setFormData({ ...formData, target_type: e.target.value, target_value: '' })}
                                    >
                                        <option value="all">All Students</option>
                                        <option value="department">By Department</option>
                                        <option value="year">By Year</option>
                                        <option value="user">Specific User</option>
                                    </select>
                                </div>

                                {/* Target Value (Conditional) */}
                                {formData.target_type === 'department' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Department</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            value={formData.target_value}
                                            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                                        >
                                            <option value="">Choose Department</option>
                                            <option value="CSE">CSE</option>
                                            <option value="ECE">ECE</option>
                                            <option value="EEE">EEE</option>
                                            <option value="MECH">MECH</option>
                                            <option value="CIVIL">CIVIL</option>
                                            <option value="IT">IT</option>
                                            <option value="AI&DS">AI&DS</option>
                                        </select>
                                    </div>
                                )}

                                {formData.target_type === 'year' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Year</label>
                                        <select
                                            required
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            value={formData.target_value}
                                            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                                        >
                                            <option value="">Choose Year</option>
                                            <option value="1">1st Year</option>
                                            <option value="2">2nd Year</option>
                                            <option value="3">3rd Year</option>
                                            <option value="4">4th Year</option>
                                        </select>
                                    </div>
                                )}

                                {formData.target_type === 'user' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User ID / Email</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter User ID or Email" // Backend currently expects ID, ideally we'd implement search
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                            value={formData.target_value}
                                            onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Found in Admin Users table</p>
                                    </div>
                                )}

                                {/* Course Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Course</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
                                        value={formData.course_id}
                                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value, level_id: '' })}
                                    >
                                        <option value="">Choose Course</option>
                                        {courses.map(course => (
                                            <option key={course.id} value={course.id}>{course.title}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Level Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Level</label>
                                    <select
                                        required
                                        disabled={!formData.course_id}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
                                        value={formData.level_id}
                                        onChange={(e) => setFormData({ ...formData, level_id: e.target.value })}
                                    >
                                        <option value="">Choose Level</option>
                                        {levels.map(level => (
                                            <option key={level.id} value={level.id}>{level.title} (Level {level.level_number})</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !formData.course_id || !formData.level_id}
                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Assigning...' : 'Assign Task'}
                                </button>

                            </form>
                        </div>
                    </div>

                    {/* Assignments List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Award size={20} className="text-orange-500" />
                                    Recent Assignments
                                </h2>
                                <button
                                    onClick={fetchAssignments}
                                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>

                            {loading ? (
                                <div className="p-12 text-center text-gray-500 dark:text-slate-400">
                                    Loading assignments...
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="p-12 text-center text-gray-500 dark:text-slate-400">
                                    No assignments found. Create one to get started!
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Assignment</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Target</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                            {assignments.map((assignment) => (
                                                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900 dark:text-white">{assignment.title}</span>
                                                            <span className="text-xs text-gray-500 dark:text-slate-400">Course ID: {assignment.course_id?.substring(0, 8)}...</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                            ${assignment.target_type === 'all' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                assignment.target_type === 'department' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                    assignment.target_type === 'year' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                            {assignment.target_type}
                                                            {assignment.target_value && `: ${assignment.target_value}`}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                                                        <div className="flex items-center gap-4">
                                                            {new Date(assignment.created_at).toLocaleDateString()}
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAssignment(assignment);
                                                                    fetchAssignmentDetails(assignment.id);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                                                            >
                                                                View Details
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Details Modal */}
                {showDetailsModal && selectedAssignment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{selectedAssignment.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">Student Progress Report</p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="p-0 overflow-y-auto flex-1">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Student</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Roll No</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Dept / Year</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Completed At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                        {assignmentDetails.map((detail) => (
                                            <tr key={detail.task_id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 dark:text-white">{detail.name}</span>
                                                        <span className="text-xs text-gray-500 dark:text-slate-400">{detail.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600 dark:text-slate-300">{detail.roll_number || '-'}</td>
                                                <td className="px-6 py-3 text-sm text-gray-600 dark:text-slate-300">
                                                    {detail.department || '-'} / {detail.year || '-'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize
                                                        ${detail.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                        {detail.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">
                                                    {detail.completed_at ? new Date(detail.completed_at).toLocaleString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AdminAssignments;
