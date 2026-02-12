import { BookOpen, AlertCircle } from 'lucide-react';

interface SystemEditorProps {
    value: string;
    onChange: (value: string) => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function SystemEditor({ value, onChange, isCollapsed = false, onToggleCollapse }: SystemEditorProps) {
    return (
        <div className={`bg-[#0B1120] border-r border-slate-800 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-80 md:w-96'}`}>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <BookOpen className="w-4 h-4 text-cyan-500" />
                    System Prompt
                </div>
                {/* Mobile close button could go here */}
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                        <p className="text-xs text-blue-300 leading-relaxed">
                            <AlertCircle className="w-3 h-3 inline mr-1.5 relative -top-px" />
                            Defines the AI's behavior, personality, and rules. This is the "Coding Logic" of the agent.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Instructions</label>
                        <textarea
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full h-[calc(100vh-280px)] bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none font-mono leading-relaxed"
                            placeholder="You are a helpful assistant..."
                            spellCheck={false}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Templates (Optional) */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/30 shrink-0">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Quick Presets</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {presets.map(p => (
                        <button
                            key={p.name}
                            onClick={() => onChange(p.prompt)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md whitespace-nowrap transition-colors border border-slate-700"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

const presets = [
    { name: "Default", prompt: "You are a helpful assistant." },
    { name: "Coder", prompt: "You are an expert full-stack developer. Write clean, efficient code." },
    { name: "Pirate", prompt: "You are a helpful pirate. Respond with nautical terms." },
    { name: "Analyst", prompt: "You are a data analyst. Be concise and focus on facts." },
];
