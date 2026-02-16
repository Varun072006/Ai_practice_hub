import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Plus, X, FileCode, FileType, Edit2, Trash2, MoreVertical, FileText } from 'lucide-react';

export default function CodeEditor({
    code,
    onChange,
    readOnly = false,
    visibleTabs,
    files, // New: Array of { name, language, content }
    onFileChange, // New: (newFiles) => void
    onFileCreate, // New: (name, language) => void
    onFileRename, // New: (oldName, newName) => void
    onFileDelete  // New: (name) => void
}) {
    // Legacy support: if 'files' is not provided, use 'code' object logic
    const isMultiFile = !!files;

    const [activeTab, setActiveTab] = useState(isMultiFile ? (files[0]?.name || '') : (visibleTabs ? visibleTabs[0] : 'html'));
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [editingFile, setEditingFile] = useState(null);
    const [editName, setEditName] = useState('');
    const addMenuRef = useRef(null);

    // Update active tab if files change and active one is gone
    useEffect(() => {
        if (isMultiFile && files.length > 0) {
            const exists = files.find(f => f.name === activeTab);
            if (!exists) {
                setActiveTab(files[0].name);
            }
        }
    }, [files, isMultiFile, activeTab]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allTabs = [
        { id: 'html', label: 'HTML', language: 'html' },
        { id: 'css', label: 'CSS', language: 'css' },
        { id: 'js', label: 'JavaScript', language: 'javascript' }
    ];

    const protectedFiles = ['index.html', 'style.css', 'script.js'];

    const getTabLabel = (name) => {
        if (name === 'index.html') return 'HTML';
        if (name === 'style.css') return 'CSS';
        if (name === 'script.js') return 'JavaScript';
        return name;
    };

    const sortedFiles = isMultiFile ? [...files].sort((a, b) => {
        const indexA = protectedFiles.indexOf(a.name);
        const indexB = protectedFiles.indexOf(b.name);

        // If both are protected, sort by defined order
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        // If only A is protected, it comes first
        if (indexA !== -1) return -1;
        // If only B is protected, it comes first
        if (indexB !== -1) return 1;
        // Otherwise sort alphabetically
        return a.name.localeCompare(b.name);
    }) : [];

    const tabs = isMultiFile
        ? sortedFiles.map(f => ({ id: f.name, label: getTabLabel(f.name), language: f.language }))
        : (visibleTabs
            ? visibleTabs.map(id => allTabs.find(t => t.id === id)).filter(Boolean)
            : allTabs);

    const handleEditorChange = (value) => {
        if (readOnly) return;
        if (isMultiFile) {
            const updatedFiles = files.map(f =>
                f.name === activeTab ? { ...f, content: value || '' } : f
            );
            onFileChange(updatedFiles);
        } else {
            onChange({ ...code, [activeTab]: value || '' });
        }
    };

    const handleCreateFile = (type) => {
        if (!onFileCreate) return;

        const ext = type === 'javascript' ? 'js' : type === 'text' ? 'txt' : type;
        // User requested "new" as base name or similar. 
        // Logic: new.html, new1.html, new2.html
        let baseName = 'new';
        let name = `${baseName}.${ext}`;
        let counter = 1;

        while (files.some(f => f.name === name)) {
            name = `${baseName}${counter}.${ext}`;
            counter++;
        }

        onFileCreate(name, type === 'text' ? 'plaintext' : type);
        setActiveTab(name);
        setShowAddMenu(false);
    };

    const startEditing = (fileName, e) => {
        e.stopPropagation();
        setEditingFile(fileName);
        setEditName(fileName);
    };

    const saveRename = () => {
        if (editingFile && editName && editName !== editingFile) {
            if (files.some(f => f.name === editName)) {
                alert('File name already exists');
                return;
            }
            onFileRename(editingFile, editName);
            setActiveTab(editName); // Switch to new name
        }
        setEditingFile(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') saveRename();
        if (e.key === 'Escape') setEditingFile(null);
    };

    const activeLanguage = isMultiFile
        ? files.find(f => f.name === activeTab)?.language
        : tabs.find(t => t.id === activeTab)?.language;

    const activeContent = isMultiFile
        ? files.find(f => f.name === activeTab)?.content || ''
        : code[activeTab] || '';

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="flex-1 flex items-center overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            onClick={() => !editingFile && setActiveTab(tab.id)}
                            className={`group flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-r border-gray-200 dark:border-slate-700 cursor-pointer select-none min-w-[120px] max-w-[200px] hover:bg-white dark:hover:bg-slate-700 transition-colors ${activeTab === tab.id
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-600 dark:border-t-blue-400'
                                : 'text-gray-600 dark:text-slate-400 border-t-2 border-t-transparent'
                                } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onDoubleClick={(e) => {
                                if (isMultiFile && !readOnly && !protectedFiles.includes(tab.id)) {
                                    startEditing(tab.id, e);
                                }
                            }}
                        >
                            <FileCode size={14} className={activeTab === tab.id ? 'opacity-100' : 'opacity-70'} />

                            {editingFile === tab.id ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={saveRename}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white dark:bg-slate-900 border border-blue-500 rounded px-1 py-0.5 w-full text-xs outline-none"
                                />
                            ) : (
                                <span className="truncate flex-1">{tab.label}</span>
                            )}

                            {isMultiFile && !readOnly && !protectedFiles.includes(tab.id) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onFileDelete(tab.id); }}
                                    className={`p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ${files.length === 1 ? 'hidden' : ''}`}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add File Button - Outside scroll container */}
                {isMultiFile && !readOnly && (
                    <div className="relative px-2 border-l border-gray-200 dark:border-slate-700" ref={addMenuRef}>
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="p-2 text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                            title="Add File"
                        >
                            <Plus size={18} />
                        </button>

                        {showAddMenu && (
                            <div className="absolute top-full right-0 mt-1 w-48 bg-[#1e1e2e] border border-gray-700 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                <button onClick={() => handleCreateFile('html')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors">
                                    <div className="text-orange-500"><FileCode size={16} /></div> New HTML file
                                </button>
                                <button onClick={() => handleCreateFile('css')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors">
                                    <div className="text-blue-500"><FileType size={16} /></div> New CSS file
                                </button>
                                <button onClick={() => handleCreateFile('javascript')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors">
                                    <div className="text-yellow-500"><FileCode size={16} /></div> New JS file
                                </button>
                                <button onClick={() => handleCreateFile('text')} className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition-colors">
                                    <div className="text-gray-400"><FileText size={16} /></div> New TXT file
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Editor */}
            <div className={`flex-1 relative ${readOnly ? 'opacity-80' : ''}`}>
                <Editor
                    height="100%"
                    language={activeLanguage}
                    value={activeContent}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        readOnly: readOnly,
                        domReadOnly: readOnly,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        fontLigatures: true,
                        padding: { top: 16 }
                    }}
                />
            </div>
        </div>
    );
}
