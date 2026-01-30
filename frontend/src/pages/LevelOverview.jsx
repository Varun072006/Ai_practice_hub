import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { BookOpen, Code, Lightbulb, ExternalLink, ArrowRight, Sparkles, Loader, Edit, Save, Plus, X, Trash2, CheckCircle, FolderIcon, ListChecks } from 'lucide-react';

const getYouTubeEmbedUrl = (input) => {
    if (!input) return '';

    // 1. Check for standard Playlist URL
    if (input.includes('list=')) {
        const listId = input.split('list=')[1]?.split('&')[0];
        if (listId) return `https://www.youtube.com/embed?listType=playlist&list=${listId}`;
    }

    // 2. Parse all Video IDs from input (multiline support)
    const videoIds = [];
    const lines = input.split(/[\n,;]+/); // Split by newline, comma, or semicolon

    lines.forEach(line => {
        let id = '';
        if (line.includes('youtu.be/')) {
            id = line.split('youtu.be/')[1]?.split('?')[0];
        } else if (line.includes('v=')) {
            id = line.split('v=')[1]?.split('&')[0];
        } else if (line.includes('youtube.com/embed/')) {
            id = line.split('embed/')[1]?.split('?')[0];
        } else if (line.trim().length === 11) {
            // Potential raw video ID (YouTube IDs are 11 chars)
            id = line.trim();
        }

        if (id && id.length === 11) {
            videoIds.push(id);
        }
    });

    if (videoIds.length === 0) return input; // Return raw if no logic matched

    // 3. Construct Embed URL
    if (videoIds.length === 1) {
        return `https://www.youtube.com/embed/${videoIds[0]}`;
    } else {
        // Multiple videos: First one is main, rest are playlist
        const [first, ...rest] = videoIds;
        return `https://www.youtube.com/embed/${first}?playlist=${rest.join(',')}`;
    }
};

const LevelOverview = () => {
    const { courseId, levelId } = useParams();
    const navigate = useNavigate();
    const [lessonPlan, setLessonPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [editData, setEditData] = useState({
        introduction: '',
        concepts: [],
        resources: [],
        key_terms: [],
        example_code: '',
        youtube_url: ''
    });

    const [modeSelection, setModeSelection] = useState({
        open: false,
    });



    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setIsAdmin(user.role === 'admin');
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
        fetchLessonPlan();
    }, [courseId, levelId]);

    const fetchLessonPlan = async () => {
        try {
            // Fetch persistent user-curated/admin-curated content
            const response = await api.get(`/courses/${courseId}/levels/${levelId}`);
            setLessonPlan(response.data);
            setEditData({
                introduction: response.data.introduction || '',
                concepts: response.data.concepts || [],
                resources: response.data.resources || [],
                key_terms: response.data.key_terms || [],
                example_code: response.data.example_code || '',
                youtube_url: response.data.youtube_url || ''
            });
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch lesson plan:', error);
            setLoading(false);
            // Fallback content if empty or error
            if (!lessonPlan) {
                setLessonPlan({
                    introduction: "Content is being prepared for this level.",
                    concepts: [],
                    resources: [],
                    example_code: "// No example code available"
                });
            }
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                learning_materials: {
                    introduction: editData.introduction,
                    concepts: editData.concepts,
                    resources: editData.resources,
                    key_terms: editData.key_terms,
                    youtube_url: editData.youtube_url
                }
            };

            console.log('[LevelOverview] Saving payload:', payload);
            const response = await api.put(`/admin/levels/${levelId}/details`, payload);
            console.log('[LevelOverview] Save successful:', response.data);

            // Show success popup
            alert("✅ Changes saved successfully!");

            setIsEditing(false);
            fetchLessonPlan(); // Refresh
        } catch (error) {
            console.error("Failed to save level details", error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save changes';
            const errorDetails = error.response?.data?.details;
            console.error('[LevelOverview] Error details:', errorDetails);
            alert(`❌ Failed to save changes: ${errorMessage}`);
        }
    };

    const addConcept = () => {
        setEditData({
            ...editData,
            concepts: [...editData.concepts, { title: 'New Concept', explanation: 'Description here' }]
        });
    };

    const updateConcept = (idx, field, value) => {
        const newConcepts = [...editData.concepts];
        newConcepts[idx][field] = value;
        setEditData({ ...editData, concepts: newConcepts });
    };

    const removeConcept = (idx) => {
        const newConcepts = editData.concepts.filter((_, i) => i !== idx);
        setEditData({ ...editData, concepts: newConcepts });
    };

    const addResource = () => {
        setEditData({
            ...editData,
            resources: [...editData.resources, { title: 'New Resource', url: 'https://' }]
        });
    };

    const updateResource = (idx, field, value) => {
        const newResources = [...editData.resources];
        newResources[idx][field] = value;
        setEditData({ ...editData, resources: newResources });
    };

    const removeResource = (idx) => {
        const newResources = editData.resources.filter((_, i) => i !== idx);
        setEditData({ ...editData, resources: newResources });
    };

    const addKeyTerm = () => {
        const term = prompt('Enter key term:');
        if (term && term.trim()) {
            setEditData({
                ...editData,
                key_terms: [...editData.key_terms, term.trim()]
            });
        }
    };

    const removeKeyTerm = (idx) => {
        const newTerms = editData.key_terms.filter((_, i) => i !== idx);
        setEditData({ ...editData, key_terms: newTerms });
    };


    if (loading) {
        return (
            <Layout>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-purple-100 dark:border-slate-700 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                            <Sparkles className="text-purple-600 dark:text-purple-400 animate-pulse" size={32} />
                            <div className="absolute inset-0 border-4 border-purple-200 dark:border-purple-700 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin"></div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Loading Lesson Plan...</h2>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!lessonPlan) return null;

    return (
        <Layout>
            <div className="flex-1 p-8 pb-24 md:pb-8 overflow-y-auto relative font-sans">

                {/* Admin Float Button */}
                {isAdmin && (
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="fixed bottom-24 right-8 md:top-8 md:right-8 md:bottom-auto z-50 bg-black text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                        {isEditing ? <X size={24} /> : <Edit size={24} />}
                    </button>
                )}

                {/* Edit Mode Overlay */}
                {isEditing ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-4xl mx-auto border border-gray-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Level Content</h2>
                            <button onClick={handleSave} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                <Save size={18} /> Save Changes
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Introduction</label>
                                <textarea
                                    className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 min-h-[100px] bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                    value={editData.introduction}
                                    onChange={(e) => setEditData({ ...editData, introduction: e.target.value })}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Concepts</label>
                                    <button onClick={addConcept} className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"><Plus size={14} /> Add</button>
                                </div>
                                <div className="space-y-3">
                                    {editData.concepts.map((c, idx) => (
                                        <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-slate-900 rounded-lg border dark:border-slate-700">
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    className="w-full p-2 border dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                                    placeholder="Title"
                                                    value={c.title}
                                                    onChange={(e) => updateConcept(idx, 'title', e.target.value)}
                                                />
                                                <textarea
                                                    className="w-full p-2 border dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                                    placeholder="Explanation"
                                                    value={c.explanation}
                                                    onChange={(e) => updateConcept(idx, 'explanation', e.target.value)}
                                                />
                                            </div>
                                            <button onClick={() => removeConcept(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Resources</label>
                                    <button onClick={addResource} className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"><Plus size={14} /> Add</button>
                                </div>
                                <div className="space-y-2">
                                    {editData.resources.map((r, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                className="flex-1 p-2 border dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                                placeholder="Title"
                                                value={r.title}
                                                onChange={(e) => updateResource(idx, 'title', e.target.value)}
                                            />
                                            <input
                                                className="flex-1 p-2 border dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                                placeholder="URL"
                                                value={r.url}
                                                onChange={(e) => updateResource(idx, 'url', e.target.value)}
                                            />
                                            <button onClick={() => removeResource(idx)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Key Terms</label>
                                    <button onClick={addKeyTerm} className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline"><Plus size={14} /> Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {editData.key_terms.map((term, idx) => (
                                        <span key={idx} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full text-gray-700 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
                                            {term}
                                            <button onClick={() => removeKeyTerm(idx)} className="text-red-400 hover:text-red-600">
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                    {editData.key_terms.length === 0 && (
                                        <span className="text-gray-400 dark:text-slate-500 text-sm italic">No key terms added yet</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">YouTube Video URL</label>
                                <div className="space-y-2">
                                    <textarea
                                        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px] font-mono text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                                        placeholder="Paste one or more YouTube URLs here (one per line)..."
                                        value={editData.youtube_url}
                                        onChange={(e) => setEditData({ ...editData, youtube_url: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        💡 Tip: Paste multiple video URLs (one per line) to create a playlist automatically. Or paste a single standard Playlist URL.
                                    </p>
                                    {editData.youtube_url && (
                                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">✅ Preview:</p>
                                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                                <iframe
                                                    width="100%"
                                                    height="100%"
                                                    src={getYouTubeEmbedUrl(editData.youtube_url)}
                                                    title="Video Preview"
                                                    frameBorder="0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Example Code</label>
                                <textarea
                                    className="w-full p-4 border border-gray-300 dark:border-slate-700 rounded-lg font-mono text-sm min-h-[200px] bg-slate-900 text-white"
                                    value={editData.example_code}
                                    onChange={(e) => setEditData({ ...editData, example_code: e.target.value })}
                                />
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-12">
                        {/* Top Section: Info & Video */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Left: Info */}
                            <div className="lg:col-span-7 space-y-8">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                            <BookOpen size={20} />
                                        </div>
                                        <span className="text-[10px] font-black tracking-[0.2em] uppercase bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-md border border-blue-100/50 dark:border-blue-800">
                                            LEVEL {lessonPlan.level_number ?? levelId}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                                            {lessonPlan.title || `Level ${levelId} Overview`}
                                        </h1>
                                        <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium max-w-2xl">
                                            {lessonPlan.introduction}
                                        </p>
                                    </div>

                                    {/* Key Terms */}
                                    {lessonPlan.key_terms && lessonPlan.key_terms.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                                KEY TERMS
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {lessonPlan.key_terms.map((term, idx) => (
                                                    <span key={idx} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-default">
                                                        {term}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Video */}
                            {lessonPlan.youtube_url && lessonPlan.youtube_url.trim() && (
                                <div className="lg:col-span-5">
                                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col group h-full max-h-[400px]">
                                        <div className="p-5 bg-white dark:bg-slate-800 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 flex items-center justify-center">
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                                    </svg>
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-white text-sm">Video Tutorial</span>
                                            </div>
                                            <ExternalLink size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-red-500 transition-colors" />
                                        </div>
                                        <div className="flex-1 bg-black relative">
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                src={getYouTubeEmbedUrl(lessonPlan.youtube_url)}
                                                title="Course Video Tutorial"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                className="absolute inset-0"
                                            ></iframe>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Core Topics Grid */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                                    CORE TOPICS
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {lessonPlan.concepts.map((concept, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 border border-slate-100 dark:border-slate-700 flex flex-col min-h-[200px] group">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm ${['bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400', 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500 dark:text-cyan-400', 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400', 'bg-purple-50 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400'][idx % 4]
                                            }`}>
                                            {[<ArrowRight size={24} className="rotate-[-45deg]" />, <Lightbulb size={24} />, <Edit size={22} />, <Sparkles size={24} />][idx % 4]}
                                        </div>
                                        <h3 className="font-black text-slate-900 dark:text-white mb-4 text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                                            {concept.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-[1.6] font-medium flex-1">
                                            {concept.explanation || <span className="text-slate-300 dark:text-slate-600 italic">Description available in learning materials</span>}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Example Code (optional, keeping but styled) */}
                        {lessonPlan.example_code && !isEditing && (
                            <div className="rounded-3xl overflow-hidden shadow-2xl bg-[#0F172A] border border-slate-800">
                                <div className="flex items-center justify-between px-6 py-4 bg-[#1E293B] border-b border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 ml-2 tracking-widest">EXAMPLE CODE</span>
                                    </div>
                                </div>
                                <div className="p-1">
                                    <pre className="font-mono text-sm text-blue-100 overflow-x-auto p-8 leading-relaxed">
                                        {lessonPlan.example_code}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Bottom Section: Materials and Assessment Card */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Materials */}
                            <div className="lg:col-span-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100/50 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-400">
                                            <FolderIcon size={20} />
                                        </div>
                                        <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight">Course Materials</h3>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                        {lessonPlan.resources.length} ASSETS
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {lessonPlan.resources.map((res, idx) => (
                                        <a
                                            key={idx}
                                            href={res.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-5"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all shadow-sm border border-orange-100/30 dark:border-orange-800/30">
                                                <BookOpen size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-slate-800 dark:text-white text-base truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                                                    {res.title}
                                                </h4>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate flex items-center gap-2 mt-1 font-bold">
                                                    <span>External Resource</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                    <span className="text-blue-400">Click to view</span>
                                                </p>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all border border-transparent group-hover:border-blue-100 dark:group-hover:border-blue-800">
                                                <ExternalLink size={18} />
                                            </div>
                                        </a>
                                    ))}
                                    {lessonPlan.resources.length === 0 && (
                                        <div className="py-12 px-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                                            <BookOpen size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                                            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">No materials added yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* New Assessment Card */}
                            <div className="lg:col-span-4">
                                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl shadow-slate-200/60 dark:shadow-slate-900/60 space-y-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>

                                    <div className="space-y-2 relative z-10">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                            <CheckCircle size={14} />
                                            ASSESSMENT READY
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                            Ready to test?
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-[1.6]">
                                            Complete the assessment to validate your knowledge of Level {lessonPlan.level_number ?? levelId} fundamentals and earn your badge.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setModeSelection({ open: true })}
                                        className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transform hover:-translate-y-1 active:translate-y-0.5 transition-all flex items-center justify-center gap-3 group/btn"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                                            <ListChecks size={18} className="text-white" />
                                        </div>
                                        START TEST
                                    </button>


                                </div>
                            </div>
                        </div>
                    </div>

                )}

                {/* Mode selection dialog */}
                {modeSelection.open && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-[320px] w-full transform animate-in zoom-in-95 duration-200 border dark:border-slate-700">
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        navigate(`/mcq-practice/${courseId}/${levelId}`, {
                                            state: { sessionType: 'mcq' },
                                        });
                                        setModeSelection({ open: false });
                                    }}
                                    className="w-full py-4 rounded-xl bg-[#2563EB] text-white font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
                                >
                                    MCQ Test
                                </button>

                                <button
                                    onClick={() => {
                                        const courseTitle = (lessonPlan?.course_title || '').toLowerCase();
                                        const isHtmlCssCourse = courseTitle.includes('html') || courseTitle.includes('css');

                                        if (isHtmlCssCourse) {
                                            navigate(`/html-css-practice/${courseId}/${levelId}`, {
                                                state: { sessionType: 'coding' },
                                            });
                                        } else {
                                            navigate(`/practice/${courseId}/${levelId}`, {
                                                state: { sessionType: 'coding' },
                                            });
                                        }
                                        setModeSelection({ open: false });
                                    }}
                                    className="w-full py-4 rounded-xl bg-[#2563EB] text-white font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
                                >
                                    Coding Test
                                </button>

                                <button
                                    onClick={() => setModeSelection({ open: false })}
                                    className="w-full mt-4 py-2 text-slate-400 dark:text-slate-500 text-sm font-medium hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout >
    );
};

const LinkIcon = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
);

export default LevelOverview;