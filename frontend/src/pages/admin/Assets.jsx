import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../services/api';
import { Upload, Trash2, Copy, Check, Image as ImageIcon, Loader, RefreshCw, Search, ArrowLeft, X } from 'lucide-react';

const AdminAssets = () => {
    const navigate = useNavigate();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const response = await api.get('/assets');
            setAssets(response.data);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (files) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        const formData = new FormData();
        // Currently backend supports single file, loop if multiple
        for (let i = 0; i < files.length; i++) {
            formData.append('file', files[i]);
        }

        try {
            await api.post('/assets/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            await fetchAssets();
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const onFileChange = (e) => {
        handleUpload(e.target.files);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files);
        }
    };

    const handleDelete = async (filename) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;

        try {
            await api.delete(`/assets/${filename}`);
            setAssets(assets.filter(a => a.name !== filename));
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete asset');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(text);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout>
            <div className="p-8 pb-20 max-w-7xl mx-auto space-y-8 font-sans">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                Asset Library
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                Manage images and resources for your courses.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search assets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={fetchAssets}
                            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Refresh Assets"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Success Popup */}
                {showSuccess && (
                    <div className="fixed top-24 right-8 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-800 p-2 rounded-full">
                                <Check size={20} className="text-green-600 dark:text-green-300" />
                            </div>
                            <div>
                                <h4 className="font-bold">Upload Successful!</h4>
                                <p className="text-sm opacity-90">Your assets have been added to the library.</p>
                            </div>
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="ml-4 p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded-full transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Upload Area */}
                <div
                    className={`
                        relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300
                        ${dragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                        ${uploading ? 'opacity-50 pointer-events-none' : ''}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        id="asset-upload"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={onFileChange}
                    />

                    <div className="flex flex-col items-center gap-4">
                        <div className={`
                            w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-transform duration-300
                            ${dragActive ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}
                        `}>
                            {uploading ? <Loader className="animate-spin" size={32} /> : <Upload size={32} />}
                        </div>

                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {uploading ? 'Uploading...' : 'Drop images here or click to upload'}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Supports PNG, JPG, GIF, WEBP up to 5MB
                            </p>
                        </div>

                        {!uploading && (
                            <label
                                htmlFor="asset-upload"
                                className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-lg shadow-blue-200/50 dark:shadow-none"
                            >
                                Browse Files
                            </label>
                        )}
                    </div>
                </div>

                {/* Gallery */}
                {loading && assets.length === 0 ? (
                    <div className="flex justify-center py-20">
                        <Loader className="animate-spin text-blue-600" size={40} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredAssets.map((asset) => (
                            <div
                                key={asset.name}
                                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                            >
                                {/* Image Preview */}
                                <div className="aspect-square bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
                                    <img
                                        src={asset.path || `/assets/${asset.name}`}
                                        alt={asset.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />

                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                        <button
                                            onClick={() => window.open(asset.path || `/assets/${asset.name}`, '_blank')}
                                            className="p-2 bg-white/20 text-white rounded-lg hover:bg-white hover:text-blue-600 transition-all backdrop-blur-md"
                                            title="View Full Size"
                                        >
                                            <ImageIcon size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(asset.name)}
                                            className="p-2 bg-white/20 text-white rounded-lg hover:bg-red-500 hover:text-white transition-all backdrop-blur-md"
                                            title="Delete Asset"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Info Footer */}
                                <div className="p-4 flex flex-col gap-3 flex-1">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm" title={asset.name}>
                                            {asset.name}
                                        </h4>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                            {asset.size ? (asset.size / 1024).toFixed(1) + ' KB' : ''}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => copyToClipboard(asset.path || `/assets/${asset.name}`)}
                                        className={`
                                            flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all w-full border
                                            ${copiedId === (asset.path || `/assets/${asset.name}`)
                                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                                                : 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200'
                                            }
                                        `}
                                    >
                                        {copiedId === (asset.path || `/assets/${asset.name}`) ? (
                                            <> <Check size={14} /> Copied! </>
                                        ) : (
                                            <> <Copy size={14} /> Copy Path </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {filteredAssets.length === 0 && !loading && (
                    <div className="text-center py-20 text-slate-400">
                        <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No assets uploaded yet</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AdminAssets;
