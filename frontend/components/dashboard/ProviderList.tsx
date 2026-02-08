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

    // State for inputs
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [visibility, setVisibility] = useState<Record<string, boolean>>({});

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
                // Clear input and refresh
                setInputs(prev => ({ ...prev, [providerId]: '' }));
                mutate('/api/dashboard/providers');
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
        } catch (err) {
            console.error(err);
        }
    };

    if (error) return <div className="text-red-400">Failed to load providers</div>;
    if (!configs) return <div className="text-slate-500">Loading configuration...</div>;

    // Handle case where API returns error object (e.g. 401)
    if (!Array.isArray(configs)) {
        return <div className="text-red-400">Error loading configuration. Please log in again.</div>;
    }

    return (
        <div className="grid grid-cols-1 gap-8">
            {PROVIDERS.map((p) => {
                const config = configs.find(c => c.provider === p.id);
                const isConfigured = config?.configured;
                const isLoading = loading[p.id];
                const showKey = visibility[p.id];

                return (
                    <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col gap-6">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-3xl bg-slate-800 w-12 h-12 flex items-center justify-center rounded-xl ring-1 ring-white/5">
                                    {p.logo}
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-white flex items-center gap-3">
                                        {p.name}
                                        {isConfigured && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20">
                                                Active
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{p.desc}</p>
                                </div>
                            </div>
                            {isConfigured && (
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                                    title="Remove Key"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-4">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                                API Key
                            </label>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Shield size={16} className={`transition-colors ${isConfigured ? 'text-green-500/50' : 'text-slate-500'}`} />
                                </div>

                                <input
                                    type={showKey ? "text" : "password"}
                                    value={inputs[p.id] || ''}
                                    placeholder={isConfigured ? "••••••••••••••••" : "sk-..."}
                                    onChange={(e) => setInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    className={`
                                        block w-full pl-10 pr-24 py-4 sm:text-sm rounded-xl
                                        bg-slate-950 border transition-all duration-200
                                        focus:ring-2 focus:ring-cyan-500/20 focus:outline-none 
                                        ${isConfigured && !inputs[p.id]
                                            ? 'border-green-900/30 text-green-500 placeholder-green-700/30'
                                            : 'border-slate-800 text-white placeholder-slate-700 focus:border-cyan-500/50'
                                        }
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

                                    {inputs[p.id] && (
                                        <button
                                            onClick={() => handleSave(p.id)}
                                            disabled={isLoading}
                                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded shadow-sm disabled:opacity-50 transition-all transform active:scale-95"
                                        >
                                            {isLoading ? 'Saving...' : 'Save'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
