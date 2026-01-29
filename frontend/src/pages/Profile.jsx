import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Edit2, Mail, Shield, User, Lock, Moon, Sun } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const Profile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
    const [passwordForm, setPasswordForm] = React.useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = React.useState(false);
    const [passwordError, setPasswordError] = React.useState('');
    const [passwordSuccess, setPasswordSuccess] = React.useState('');

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("New passwords don't match");
            return;
        }

        if (passwordForm.newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            return;
        }

        try {
            setPasswordLoading(true);

            await api.post('/auth/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });

            setPasswordSuccess('Password updated successfully!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setPasswordSuccess('');
            }, 2000);

        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to change password';
            setPasswordError(errorMessage);
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8 transition-colors duration-300">

                {/* Custom Header with Back Button */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span className="font-medium">Back</span>
                    </button>
                </div>

                <div className="max-w-xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center md:text-left">My Profile</h1>

                    {/* Main Profile Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-6 transition-colors duration-300">
                        <div className="p-8 flex flex-col items-center border-b border-gray-100 dark:border-slate-700">
                            <div className="relative mb-4">
                                <div className="w-24 h-24 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                    <User size={40} />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{user?.name || user?.username || 'User Account'}</h2>
                            <p className="text-sm text-green-500 font-medium">Account status: Active</p>
                        </div>

                        <div className="p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <User className="text-blue-500" size={20} />
                                <h3 className="font-bold text-gray-900 dark:text-white">Account Information</h3>
                            </div>

                            <div className="space-y-4">
                                {/* Username */}
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Username</p>
                                        <p className="text-gray-900 dark:text-gray-200 font-medium">{user?.username || 'USER'}</p>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Email</p>
                                        <p className="text-gray-900 dark:text-gray-200 font-medium">{user?.email || 'student@practicehub.com'}</p>
                                    </div>
                                </div>

                                {/* Role */}
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                        <Shield size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Role</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-900 dark:text-gray-200 font-medium capitalize">{user?.role || 'Student'}</span>
                                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-[10px] font-bold rounded uppercase">Verified</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-300">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-xl">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Security</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your password and account security settings.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap"
                        >
                            Change Password
                        </button>
                    </div>

                    <div className="mt-8 text-center pb-8">
                        <p className="text-x text-gray-400 dark:text-gray-600">© 2024 Practice Hub. All rights reserved.</p>
                    </div>

                </div>
            </div>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h3>
                            <button
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <Lock size={20} />
                            </button>
                        </div>

                        {passwordSuccess ? (
                            <div className="p-4 mb-6 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-center flex flex-col items-center">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-2">
                                    <Shield size={24} />
                                </div>
                                <p className="font-medium">{passwordSuccess}</p>
                            </div>
                        ) : (
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                {passwordError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                        {passwordError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {passwordLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Profile;
