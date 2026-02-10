'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Check, Shield, Save, Eye, EyeOff, Trash2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper not needed for HttpOnly cookies
// function getCookie...

interface ProviderConfig {
    provider: string;
    configured: boolean;
    key_masked: string;
}

const PROVIDERS = [
    { id: 'deepseek', name: 'DeepSeek', logo: '🚀', desc: 'Required for default chat completion' },
    { id: 'openai', name: 'OpenAI', logo: '🤖', desc: 'Fallback for GPT-4o models' },
    { id: 'anthropic', name: 'Anthropic', logo: '🧠', desc: 'Claude 3.5 Sonnet support' },
    { id: 'gemini', name: 'Google Gemini', logo: '✨', desc: 'Gemini 1.5 Pro & Flash support' },
];

export default function ProviderList() {
    const { data: configs, error } = useSWR<ProviderConfig[]>('/api/dashboard/providers', fetcher);

    // State
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [visibility, setVisibility] = useState<Record<string, boolean>>({});
    const [editing, setEditing] = useState<Record<string, boolean>>({});
    const [success, setSuccess] = useState<Record<string, boolean>>({});

    const handleSave = async (providerId: string) => {
        const key = inputs[providerId];
        if (!key) return;

        setLoading(prev => ({ ...prev, [providerId]: true }));
        try {
            const res = await fetch('/api/dashboard/providers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ provider: providerId, key }),
            });

            if (res.ok) {
                setInputs(prev => ({ ...prev, [providerId]: '' }));
                setEditing(prev => ({ ...prev, [providerId]: false }));
                setSuccess(prev => ({ ...prev, [providerId]: true }));
                mutate('/api/dashboard/providers');

                // Clear success message after 3s
                setTimeout(() => {
                    setSuccess(prev => ({ ...prev, [providerId]: false }));
                }, 3000);
            } else {
                alert('Failed to save key');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(prev => ({ ...prev, [providerId]: false }));
        }
    };

    const handleDelete = async (providerId: string) => {
        if (!confirm(`Are you sure you want to remove the ${providerId} key?`)) return;
        try {
            await fetch(`/api/dashboard/providers/${providerId}`, {
                method: 'DELETE',
            });
            mutate('/api/dashboard/providers');
            setEditing(prev => ({ ...prev, [providerId]: false }));
        } catch (err) {
            console.error(err);
        }
    };

    if (error) return <div className="text-red-400">Failed to load providers</div>;
    if (!configs) return <div className="text-slate-500">Loading configuration...</div>;
    if (!Array.isArray(configs)) {
        return <div className="text-red-400">Error loading configuration. Please log in again.</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-4">
            {PROVIDERS.map((p) => {
                const config = configs.find(c => c.provider === p.id);
                const isConfigured = config?.configured;
                const isLoading = loading[p.id];
                const isSuccess = success[p.id];
                const showKey = visibility[p.id];
                const isEditing = editing[p.id];

                // Show input if: Not Configured OR Is Editing
                const showInput = !isConfigured || isEditing;

                return (
                    <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-6 transition-all hover:border-slate-700">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-3xl bg-slate-800 w-12 h-12 flex items-center justify-center rounded-xl ring-1 ring-white/5">
                                    {p.logo}
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white flex items-center gap-3">
                                        {p.name}
                                        {isConfigured && !isEditing && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20">
                                                Active
                                            </span>
                                        )}
                                        {isSuccess && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 ring-1 ring-inset ring-cyan-500/20 animate-fade-in">
                                                <Check size={12} /> Saved
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{p.desc}</p>
                                </div>
                            </div>

                            {/* Delete Button (Only visible if configured and not editing) */}
                            {isConfigured && !isEditing && (
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                                    title="Remove Key"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="flex flex-col gap-2">
                            {/* Label or Status Text */}
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                                    {isConfigured && !isEditing ? 'Current Configuration' : 'API Key'}
                                </label>
                                {isConfigured && !isEditing && (
                                    <button
                                        onClick={() => setEditing(prev => ({ ...prev, [p.id]: true }))}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                                    >
                                        Edit Key
                                    </button>
                                )}
                            </div>

                            {/* View Mode: Masked Display */}
                            {isConfigured && !isEditing ? (
                                <div className="w-full pl-4 pr-4 py-3 sm:text-sm rounded-xl bg-slate-800/40 border border-slate-700/50 text-slate-300 font-mono flex items-center justify-between select-none p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-green-500/10 rounded-md ring-1 ring-green-500/20">
                                            <Shield size={14} className="text-green-400" />
                                        </div>
                                        <span className="tracking-widest">••••••••••••••••••••••••</span>
                                        <span className="text-xs text-slate-500 font-sans font-medium uppercase tracking-wider ml-2 py-0.5 px-2 bg-slate-800 rounded text-slate-400">Encrypted</span>
                                    </div>
                                </div>
                            ) : (
                                /* Edit Mode: Input Field */
                                <div className="relative group animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Shield size={16} className="text-slate-500" />
                                    </div>

                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={inputs[p.id] || ''}
                                        placeholder="sk-..."
                                        onChange={(e) => setInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                        autoFocus={isEditing}
                                        className={`
                                            block w-full pl-10 pr-24 py-3 sm:text-sm rounded-xl
                                            bg-slate-950 border border-slate-800 
                                            text-white placeholder-slate-600
                                            focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 focus:outline-none 
                                            transition-all
                                        `}
                                    />

                                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setVisibility(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                                            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                        >
                                            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>

                                        {/* Save / Cancel Actions */}
                                        <div className="flex items-center gap-1">
                                            {isEditing && (
                                                <button
                                                    onClick={() => {
                                                        setEditing(prev => ({ ...prev, [p.id]: false }));
                                                        setInputs(prev => ({ ...prev, [p.id]: '' }));
                                                    }}
                                                    className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-medium transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleSave(p.id)}
                                                disabled={isLoading || !inputs[p.id]}
                                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded shadow-sm transition-all transform active:scale-95 flex items-center gap-1"
                                            >
                                                {isLoading ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
