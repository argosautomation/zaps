import { User, Bot, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface ChatMessageProps {
    role: 'user' | 'assistant' | 'system';
    content: string;
    redactedContent?: string | null; // For user messages that were redacted
    isRedactedView?: boolean;
    onToggleRedaction?: () => void;
}

export default function ChatMessage({
    role,
    content,
    redactedContent,
    isRedactedView = false,
    onToggleRedaction
}: ChatMessageProps) {
    const isUser = role === 'user';
    const isSystem = role === 'system';

    // If it's a user message and we have redacted content, allow toggling
    const hasRedactionParams = isUser && redactedContent;
    const itemsToDisplay = (isRedactedView && redactedContent) ? redactedContent : content;

    // Check if the displayed content has redacted markers for highlighting
    const isShowingRedacted = isRedactedView && itemsToDisplay.includes('<SECRET:');

    if (isSystem) return null; // Handled separately or hidden in chat flow usually

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>

                {/* Avatar */}
                <div className={`min-w-8 w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                    ${isUser ? 'bg-cyan-500/10 text-cyan-500' : 'bg-slate-800 text-slate-400'}`}>
                    {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Message Bubble */}
                <div className={`relative px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap
                    ${isUser
                        ? 'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white rounded-tr-none'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                    }
                    ${isShowingRedacted ? 'border-amber-500/50 border-2' : ''}
                `}>
                    {/* Content Rendering */}
                    {itemsToDisplay.split(/(<SECRET:.*?>)/g).map((part, i) => {
                        if (part.startsWith('<SECRET:')) {
                            return (
                                <span key={i} className="bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded text-xs font-mono font-bold border border-amber-500/30 mx-0.5">
                                    {part}
                                </span>
                            );
                        }
                        return part;
                    })}

                    {/* Toggle Visibility Button (Only for User messages with redaction) */}
                    {hasRedactionParams && (
                        <button
                            onClick={onToggleRedaction}
                            className="absolute -bottom-6 right-0 text-xs flex items-center gap-1.5 text-slate-500 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
                            title={isRedactedView ? "Show Original" : "Show Redacted (What LLM Sees)"}
                        >
                            {isRedactedView ? (
                                <><Eye className="w-3 h-3" /> Show Original</>
                            ) : (
                                <><EyeOff className="w-3 h-3" /> Show Redacted</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
