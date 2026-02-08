'use client';
import { useState } from 'react';
import RedactionVisualizer from '@/components/dashboard/RedactionVisualizer';
import { Send, Settings, Terminal } from 'lucide-react';

export default function PlaygroundPage() {
    const [prompt, setPrompt] = useState('Write an email to user@example.com about their order #12345');
    const [model, setModel] = useState('deepseek-chat');
    const [isLoading, setIsLoading] = useState(false);

    // Debug Data
    const [debugOriginal, setDebugOriginal] = useState('');
    const [debugRedacted, setDebugRedacted] = useState<string | null>(null);
    const [debugResponse, setDebugResponse] = useState<string | null>(null);

    const handleSend = async () => {
        setIsLoading(true);
        setDebugOriginal(prompt);
        setDebugRedacted(null);
        setDebugResponse(null);

        try {
            const res = await fetch('/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zaps-Debug': 'true' // Request Redacted Content
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            // Extract Headers
            const redactedContent = res.headers.get('X-Zaps-Redacted-Content');
            if (redactedContent) {
                // Try to prettify the JSON body if possible, or just show the string
                try {
                    const parsed = JSON.parse(redactedContent);
                    const messages = parsed.messages || [];
                    const lastMsg = messages[messages.length - 1]; // System prompt is likely injected at [0], so verify
                    // Actually, we want to show the whole body mostly, or just the user message?
                    // Let's show the whole JSON body as it illustrates the structure
                    setDebugRedacted(JSON.stringify(parsed, null, 2));
                } catch {
                    setDebugRedacted(redactedContent);
                }
            } else {
                setDebugRedacted('// No debug header received. (Did backend update?)');
            }

            const data = await res.json();

            if (data.choices && data.choices[0]) {
                setDebugResponse(data.choices[0].message.content);
            } else {
                setDebugResponse(JSON.stringify(data, null, 2));
            }

        } catch (error: any) {
            setDebugResponse('Error: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Developer Playground</h1>
                    <p className="text-slate-400">Test PII redaction rules in real-time.</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <SelectModel value={model} onChange={setModel} />
                    <button className="p-2 text-slate-400 hover:text-white transition-colors">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Visualizer Area */}
            <div className="h-[400px]">
                <RedactionVisualizer
                    original={debugOriginal}
                    redacted={debugRedacted}
                    response={debugResponse}
                    isLoading={isLoading}
                />
            </div>

            {/* Input Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none font-sans text-lg"
                    rows={3}
                    placeholder="Enter a prompt with sensitive data (e.g. email, phone, API key)..."
                />
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                    <div className="flex gap-2 text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> POST /v1/chat/completions</span>
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Processing...' : (
                            <>
                                Run Test <Send className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300">
                <strong>💡 Tip:</strong> Try forcing a secret like <code>sk-1234567890abcdef12345678</code> or <code>john.doe@example.com</code>.
            </div>
        </div>
    );
}

function SelectModel({ value, onChange }: { value: string, onChange: (v: string) => void }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-slate-950 text-sm font-semibold text-white focus:outline-none cursor-pointer border border-slate-700 rounded-md py-1 px-3 hover:border-cyan-500 transition-colors"
        >
            <optgroup label="DeepSeek">
                <option value="deepseek-chat">DeepSeek V3 (deepseek-chat)</option>
                <option value="deepseek-reasoner">DeepSeek R1 (deepseek-reasoner)</option>
            </optgroup>
            <optgroup label="OpenAI">
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="o1-preview">o1 Preview</option>
                <option value="o1-mini">o1 Mini</option>
            </optgroup>
            <optgroup label="Anthropic">
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            </optgroup>
        </select>
    )
}
