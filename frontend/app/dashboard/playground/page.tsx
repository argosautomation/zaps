'use client';

import { useState } from 'react';
import ChatInterface from '@/components/dashboard/playground/ChatInterface';
import SystemEditor from '@/components/dashboard/playground/SystemEditor';
import { Sidebar } from 'lucide-react';

export default function PlaygroundPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState('deepseek-chat');

    // UI State
    const [showSystem, setShowSystem] = useState(true);

    // Debug / Inspector State


    // Track which messages have redaction toggled ON
    // Key = message index, Value = boolean (true = show redacted)
    const [redactionStates, setRedactionStates] = useState<Record<number, boolean>>({});

    const handleSendMessage = async (content: string) => {
        const newMessage = { role: 'user', content };
        setMessages(prev => [...prev, newMessage]);
        setIsLoading(true);




        try {
            const allMessages = [
                { role: 'system', content: systemPrompt },
                ...messages,
                newMessage
            ];

            const res = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zaps-Debug': 'true'
                },
                body: JSON.stringify({
                    model: model,
                    messages: allMessages
                })
            });

            // Handle Redaction Header
            const redactedContent = res.headers.get('X-Zaps-Redacted-Content');
            let redactedBody = null;
            if (redactedContent) {
                try {
                    const parsed = JSON.parse(redactedContent);
                    redactedBody = JSON.stringify(parsed, null, 2);
                    // Update the user message in history with the redacted version for toggling
                    setMessages(prev => {
                        const copy = [...prev];
                        const lastMsg = copy[copy.length - 1];
                        if (lastMsg.role === 'user') {
                            lastMsg.redactedContent = JSON.stringify(parsed.messages[parsed.messages.length - 1].content);
                            // Clean up quotes if it was just a string
                            if (lastMsg.redactedContent.startsWith('"') && lastMsg.redactedContent.endsWith('"')) {
                                lastMsg.redactedContent = lastMsg.redactedContent.slice(1, -1);
                            }
                        }
                        return copy;
                    });
                } catch {
                    redactedBody = redactedContent;
                }
            }


            const data = await res.json();
            const aiContent = data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);

            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);


        } catch (error: any) {
            const errorMsg = "Error: " + error.message;
            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);

        } finally {
            setIsLoading(false);
        }
    };

    const toggleRedaction = (index: number) => {
        setRedactionStates(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
            {/* Left Panel: System Prompt */}
            <SystemEditor
                value={systemPrompt}
                onChange={setSystemPrompt}
                isCollapsed={!showSystem}
            />

            {/* Center: Chat Interface */}
            <div className="flex-1 flex flex-col relative min-w-0 border-l border-r border-slate-800">
                {/* Header / Toolbar */}
                <div className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 shrink-0 z-10">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSystem(!showSystem)}
                            className={`p-2 rounded-md transition-colors ${showSystem ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                            title="Toggle System Prompt"
                        >
                            <Sidebar className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-semibold text-white ml-2">Chat Session</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {messages.length} msgs
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <SelectModel value={model} onChange={setModel} />

                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 min-h-0">
                    <ChatInterface
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        onClearChat={() => setMessages([])}
                        onToggleRedaction={(idx) => toggleRedaction(idx)}
                        redactionStates={redactionStates}
                    />
                </div>
            </div>

            {/* Right Panel: Inspector - MOVED TO /dashboard/inspector */}

        </div>
    );
}

function SelectModel({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-slate-950 text-xs font-medium text-white focus:outline-none cursor-pointer border border-slate-700 rounded-md py-1.5 px-2 hover:border-cyan-500 transition-colors max-w-[120px] sm:max-w-none"
        >
            <optgroup label="DeepSeek">
                <option value="deepseek-chat">DeepSeek V3</option>
                <option value="deepseek-reasoner">DeepSeek R1</option>
            </optgroup>
            <optgroup label="OpenAI">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </optgroup>
            <optgroup label="Anthropic">
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            </optgroup>
        </select>
    )
}
