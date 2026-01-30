import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { Send, Bot, User, Sparkles, Loader, Trash2, Wifi, WifiOff } from 'lucide-react';

const AICoach = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm your AI Tutor powered by Llama3. I can help you with coding questions, explain concepts, debug issues, and guide your learning. What would you like to explore today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState({ isOnline: null, modelName: 'llama3:latest' });
    const messagesEndRef = useRef(null);

    const STARTER_PROMPTS = [
        "Explain Big O notation with examples",
        "How do I debug a null pointer error?",
        "What's the difference between stack and heap?",
        "Explain async/await in JavaScript"
    ];

    // Check Ollama status on mount
    useEffect(() => {
        checkOllamaStatus();
    }, []);

    const checkOllamaStatus = async () => {
        try {
            const response = await api.get('/ai-tutor/health');
            setOllamaStatus(response.data);
        } catch (error) {
            setOllamaStatus({ isOnline: false, modelName: 'llama3:latest', error: 'Cannot reach server' });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleClearChat = () => {
        if (window.confirm("Start a new conversation?")) {
            setMessages([
                { role: 'assistant', content: "Fresh start! I'm ready to help you with any programming questions. What's on your mind?" }
            ]);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleStarterPrompt = async (prompt) => {
        // Set input and immediately submit
        setInput('');
        await sendMessage(prompt);
    };

    const sendMessage = async (textToSend) => {
        if (!textToSend.trim()) return;

        const userMessage = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            // Build conversation history (exclude the message we just added)
            const conversationHistory = [...messages, userMessage]
                .filter(m => m.role !== 'system')
                .slice(-10) // Last 10 messages for context
                .map(m => ({ role: m.role, content: m.content }));

            const response = await api.post('/ai-tutor/free-chat', {
                message: textToSend,
                conversationHistory: conversationHistory.slice(0, -1), // Exclude current message
            });

            const aiMessage = {
                role: 'assistant',
                content: response.data.reply || response.data.message || "I understood that."
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMessage = {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please make sure:\n\n1. Ollama is running: `ollama serve`\n2. Llama3 is installed: `ollama pull llama3`\n3. Try refreshing the page\n\nWould you like me to check the connection status?"
            };
            setMessages(prev => [...prev, errorMessage]);
            // Recheck status
            checkOllamaStatus();
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const textToSend = input.trim();
        if (!textToSend) return;
        setInput('');
        await sendMessage(textToSend);
    };

    const formatMessage = (content) => {
        // Simple markdown-like formatting for code blocks
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const code = part.slice(3, -3);
                const lines = code.split('\n');
                const language = lines[0]?.trim() || '';
                const actualCode = language ? lines.slice(1).join('\n') : code;
                return (
                    <pre key={index} className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-2 text-sm font-mono">
                        {language && <div className="text-gray-500 text-xs mb-2">{language}</div>}
                        <code>{actualCode}</code>
                    </pre>
                );
            }
            // Handle inline code
            const inlineFormatted = part.split(/(`[^`]+`)/g).map((segment, idx) => {
                if (segment.startsWith('`') && segment.endsWith('`')) {
                    return <code key={idx} className="bg-gray-200 dark:bg-slate-600 px-1 py-0.5 rounded text-sm">{segment.slice(1, -1)}</code>;
                }
                return segment;
            });
            return <span key={index}>{inlineFormatted}</span>;
        });
    };

    return (
        <Layout>
            <div className="flex-1 flex flex-col h-screen overflow-hidden font-sans bg-gray-50 dark:bg-slate-900">

                {/* Header */}
                <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 p-4 md:p-6 shadow-sm flex items-center justify-between z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 md:p-2.5 rounded-xl shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-2xl font-bold text-gray-800 dark:text-white">PracticeHub AI Coach</h1>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500 dark:text-slate-400 hidden md:inline">Powered by {ollamaStatus.modelName}</span>
                                {ollamaStatus.isOnline === true && (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <Wifi size={12} />
                                        <span className="hidden md:inline">Online</span>
                                    </span>
                                )}
                                {ollamaStatus.isOnline === false && (
                                    <span className="flex items-center gap-1 text-red-500">
                                        <WifiOff size={12} />
                                        <span className="hidden md:inline">Offline</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="flex items-center gap-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Clear Chat"
                    >
                        <Trash2 size={18} />
                        <span className="text-sm hidden md:inline">Clear</span>
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-slate-900">
                    {messages.length === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                            {STARTER_PROMPTS.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleStarterPrompt(prompt)}
                                    disabled={loading}
                                    className="p-4 bg-white dark:bg-slate-800 border border-purple-100 dark:border-slate-700 rounded-xl hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all text-left text-gray-700 dark:text-slate-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Sparkles size={14} className="inline mr-2 text-purple-500" />
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                            {msg.role === 'assistant' && (
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                    <Bot size={20} className="text-purple-600 dark:text-purple-400" />
                                </div>
                            )}

                            <div className={`max-w-[80%] rounded-2xl p-5 shadow-sm ${msg.role === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-tl-none'
                                }`}>
                                <div className="leading-relaxed whitespace-pre-wrap">
                                    {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
                                </div>
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 shadow-sm mt-1 border border-blue-200 dark:border-blue-800">
                                    <User size={20} className="text-blue-600 dark:text-blue-400" />
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-4 justify-start">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                                <Bot size={20} className="text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-5 rounded-2xl rounded-tl-none shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-sm text-gray-400 dark:text-slate-500 ml-2">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything about programming..."
                            className="flex-1 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl px-6 py-4 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 focus:border-purple-400 dark:focus:border-purple-500 outline-none transition-all shadow-inner text-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                            AI responses may not always be accurate. Always verify important information.
                        </p>
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default AICoach;
