import { useState, useRef, useEffect } from 'react';
import { Send, StopCircle, RefreshCw, Eraser, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';

interface ChatInterfaceProps {
    messages: any[];
    onSendMessage: (content: string) => void;
    isLoading: boolean;
    onClearChat?: () => void;
    placeholder?: string;
    onToggleRedaction?: (index: number) => void;
    redactionStates?: Record<number, boolean>;
}

export default function ChatInterface({
    messages,
    onSendMessage,
    isLoading,
    onClearChat,
    placeholder = "Type your message...",
    onToggleRedaction,
    redactionStates = {}
}: ChatInterfaceProps) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 pointer-events-none select-none">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">✨</span>
                        </div>
                        <p className="text-sm font-medium">Start a conversation with the AI.</p>
                        <p className="text-xs mt-1">System prompts control the personality.</p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto py-8">
                        {messages.map((msg, idx) => (
                            <ChatMessage
                                key={idx}
                                role={msg.role}
                                content={msg.content}
                                redactedContent={msg.redactedContent}
                                isRedactedView={redactionStates?.[idx]}
                                onToggleRedaction={() => onToggleRedaction?.(idx)}
                            />
                        ))}
                        {isLoading && (
                            <div className="flex justify-start mb-6 animate-pulse ml-12">
                                <div className="bg-slate-800 rounded-2xl px-5 py-3.5 rounded-tl-none flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <div className="max-w-3xl mx-auto relative group">
                    <form onSubmit={handleSubmit} className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none shadow-lg max-h-48 overflow-y-auto"
                            rows={1}
                            style={{
                                minHeight: '50px',
                                height: input.split('\n').length > 1 ? 'auto' : '50px'
                            }}
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 bottom-2 p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 transition-colors"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </form>

                    <div className="absolute -top-10 right-0 flex gap-2">
                        {messages.length > 0 && (
                            <button
                                onClick={onClearChat}
                                className="bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-500 text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 backdrop-blur-sm border border-slate-700/50"
                            >
                                <Eraser className="w-3 h-3" /> Clear Chat
                            </button>
                        )}
                    </div>
                </div>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-600">AI can make mistakes. Verify important information.</p>
                </div>
            </div>
        </div>
    );
}
