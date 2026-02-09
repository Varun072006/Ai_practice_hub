import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import AdminBreadcrumb from '../../components/AdminBreadcrumb';
import api from '../../services/api';
import { Plus, Edit, Upload, Trash2 } from 'lucide-react';

const AdminCourses = () => {
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false); // Renamed from showAddCourse for generic modal
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', total_levels: 1, image_url: '' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await api.get('/admin/courses/with-levels');
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ title: '', description: '', total_levels: 1, image_url: '' });
    setCurrentCourseId(null);
    setShowModal(true);
  };

  const openEditModal = (course) => {
    setIsEditMode(true);
    setFormData({
      title: course.title,
      description: course.description || '',
      total_levels: course.total_levels,
      image_url: course.image_url || ''
    });
    setCurrentCourseId(course.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await api.put(`/admin/courses/${currentCourseId}`, formData);
        alert('Course updated successfully');
      } else {
        await api.post('/admin/courses', formData);
        alert('Course created successfully');
      }
      setShowModal(false);
      fetchCourses();
    } catch (error) {
      console.error('Failed to save course:', error);
      alert('Failed to save course');
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/courses/${courseId}`);
      alert('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900 min-h-screen">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 p-8 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Breadcrumb */}
        <AdminBreadcrumb items={[{ label: 'Courses & Questions', path: null }]} />

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Course Management</h1>
            <p className="text-gray-600 dark:text-slate-400">Manage curriculum, subjects, and question banks</p>
          </div>
          {/* Removed unused buttons: Save Draft, Publish Changes */}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">All Courses</h2>
            <div className="flex gap-2">
              {/* Removed Import JSON button */}
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Add New Course
              </button>
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 w-full max-w-md border dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{isEditMode ? 'EDIT COURSE' : 'NEW COURSE DETAILS'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Course Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Introduction to Neural Networks"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Course description..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Number of Levels
                    </label>
                    <input
                      type="number"
                      value={formData.total_levels}
                      onChange={(e) => setFormData({ ...formData, total_levels: parseInt(e.target.value) })}
                      placeholder="e.g., 5"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                      required
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Course Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="e.g., https://example.com/image.jpg"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                    />
                  </div>
                  {formData.image_url && (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Preview</label>
                      <img src={formData.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-slate-600" onError={(e) => e.target.style.display = 'none'} />
                    </div>
                  )}
                  <div className="flex gap-3 justify-end mt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-slate-900/50 p-6 border border-transparent dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{course.title.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{course.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {course.total_levels} Levels
                      {course.levels && ` • ${course.levels.reduce((sum, l) => sum + parseInt(l.question_count || 0), 0)} Questions`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      Last updated: {course.updated_at ? new Date(course.updated_at).toLocaleString() : course.created_at ? new Date(course.created_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/admin/courses/${course.id}/levels`)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={18} />
                    Manage Questions
                  </button>
                  <button
                    onClick={() => openEditModal(course)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    title="Edit Course"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="Delete Course"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {course.levels && course.levels.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Levels:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {course.levels.map((level) => (
                      <div key={level.id} className="text-sm text-gray-600 dark:text-slate-400">
                        Level {level.level_number}: {level.question_count || 0} questions
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div >
    </Layout >
  );
};

export default AdminCourses;
