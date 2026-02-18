import React, { useState, useRef, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { Send, Bot, User, Loader2, Sparkles, Code, Terminal, Zap, ChevronRight, RefreshCw, Copy, Check } from 'lucide-react';

const SUGGESTIONS = [
    {
        icon: <Code size={20} className="text-blue-500" />,
        title: "Code Explanation",
        desc: "Explain Python list comprehensions",
        prompt: "Explain Python list comprehensions with examples"
    },
    {
        icon: <Terminal size={20} className="text-emerald-500" />,
        title: "Debugging Helper",
        desc: "How do I debug a React Hook error?",
        prompt: "I'm getting a 'Rendered fewer hooks than expected' error in React. How do I fix it?"
    },
    {
        icon: <Zap size={20} className="text-amber-500" />,
        title: "Optimization",
        desc: "Optimize this SQL query...",
        prompt: "How can I optimize a SQL query that uses multiple JOINs and a LIKE clause?"
    },
    {
        icon: <RefreshCw size={20} className="text-purple-500" />,
        title: "Refactoring",
        desc: "Refactor this function to be cleaner",
        prompt: "Best practices for refactoring large JavaScript functions into smaller, reusable components?"
    },
];

const AICoach = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleInputResize = (e) => {
        const target = e.target;
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
        setInput(target.value);
    };

    const handleSend = async (messageText = input) => {
        const textToSend = messageText?.trim();
        if (!textToSend || isLoading) return;

        const userMessage = {
            id: Date.now(),
            role: 'user',
            content: textToSend
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            const conversationHistory = messages.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await api.post('/ai-tutor/free-chat', {
                message: userMessage.content,
                conversationHistory
            });

            const aiMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: response.data.reply || response.data.message
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('AI Coach Error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again later.",
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (code, index) => {
        navigator.clipboard.writeText(code);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Helper to render message content with code block styling and markdown parsing
    const renderContent = (content) => {
        const parts = content.split(/(```[\s\S]*?```)/g);

        return parts.map((part, index) => {
            if (part.startsWith('```') && part.endsWith('```')) {
                const codeContent = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
                const isCopied = copiedIndex === index;

                return (
                    <div key={index} className="my-4 rounded-xl overflow-hidden bg-[#1e1e1e] border border-gray-700/50 shadow-lg group/code">
                        <div className="bg-[#252526] px-4 py-2 flex items-center justify-between border-b border-gray-700/50">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                            </div>
                            <button
                                onClick={() => handleCopy(codeContent, index)}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                                {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                {isCopied ? 'Copied!' : 'Copy code'}
                            </button>
                        </div>
                        <div className="p-4 overflow-x-auto custom-scrollbar">
                            <pre className="text-sm font-mono text-gray-300 whitespace-pre leading-relaxed">
                                {codeContent}
                            </pre>
                        </div>
                    </div>
                );
            }

            // Format Bold Text (**text**)
            const textParts = part.split(/(\*\*.*?\*\*)/g);
            return (
                <span key={index} className="whitespace-pre-wrap leading-7 text-gray-800 dark:text-gray-200">
                    {textParts.map((tPart, i) => {
                        if (tPart.startsWith('**') && tPart.endsWith('**')) {
                            return <strong key={i} className="font-semibold text-gray-900 dark:text-white">{tPart.slice(2, -2)}</strong>;
                        }
                        return tPart;
                    })}
                </span>
            );
        });
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-64px)] bg-white dark:bg-[#0B1120]">
                {/* Header with glass effect */}
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 p-4 z-10">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">AI Coach Pro</h1>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Online</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setMessages([])} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="New Chat">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto py-8 px-4 flex flex-col gap-6">

                        {/* Empty State / Welcome Screen */}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
                                <div className="w-24 h-24 bg-gradient-to-tr from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-3xl flex items-center justify-center mb-8 shadow-inner ring-1 ring-inset ring-gray-900/5 dark:ring-white/10">
                                    <Bot className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 text-center tracking-tight">
                                    Hello, Developer
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md text-center mb-10 text-lg leading-relaxed">
                                    I can help you debug tricky errors, explain complex concepts, or refactor your code.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    {SUGGESTIONS.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(suggestion.prompt)}
                                            className="group flex flex-col gap-3 p-5 text-left bg-white dark:bg-[#151b2b] border border-gray-200 dark:border-gray-800 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 hover:-translate-y-1"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:scale-110 transition-transform duration-300">
                                                    {suggestion.icon}
                                                </div>
                                                <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {suggestion.title}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                                                    {suggestion.desc}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex w-full group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex max-w-full md:max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    <div className={`
                                        w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm mt-1 transition-transform hover:scale-105 cursor-default
                                        ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}
                                    `}>
                                        {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`
                                        relative px-6 py-5 shadow-sm text-[15px] leading-7
                                        ${msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-[20px] rounded-tr-md'
                                            : 'bg-white dark:bg-[#151b2b] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-800 rounded-[20px] rounded-tl-md shadow-md'}
                                        ${msg.isError ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30' : ''}
                                    `}>
                                        <div className="font-sans">
                                            {msg.role === 'assistant'
                                                ? renderContent(msg.content)
                                                : msg.content}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <div className="flex justify-start w-full animate-pulse">
                                <div className="flex max-w-[85%] gap-4">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                                        <Sparkles size={16} />
                                    </div>
                                    <div className="bg-white dark:bg-[#151b2b] border border-gray-100 dark:border-gray-800 px-6 py-4 rounded-[20px] rounded-tl-md shadow-sm flex items-center gap-3">
                                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 bg-white/0 dark:bg-gray-900/0">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative flex items-end gap-2 bg-white dark:bg-[#151b2b] border border-gray-200 dark:border-gray-800 rounded-2xl p-2 shadow-2xl shadow-indigo-500/10 focus-within:border-indigo-500/50 transition-all duration-300">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInputResize}
                                onKeyDown={handleKeyDown}
                                placeholder="Message AI Coach..."
                                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-[200px] min-h-[48px] py-3 px-4 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-[15px] leading-relaxed scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
                                rows={1}
                            />
                            <div className="flex flex-col justify-end h-full py-1 pr-1">
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim() || isLoading}
                                    className={`
                                        p-3 rounded-xl transition-all duration-200 flex items-center justify-center
                                        ${!input.trim() || isLoading
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-indigo-500/25 active:scale-95'}
                                    `}
                                >
                                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                        <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 mt-3 font-medium tracking-wide uppercase opacity-70">
                            Powered by Llama 3 • AI can make mistakes
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.3);
                    border-radius: 20px;
                }
            `}</style>
        </Layout>
    );
};

export default AICoach;
