'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Plus, Trash2, Copy, Check, Key } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper not needed
// function getCookie...

interface APIKey {
    id: string;
    name: string;
    prefix: string;
    created_at: string;
    last_used: string;
    enabled: boolean;
}

export default function APIKeyManager() {
    const { data: keysData, error } = useSWR<APIKey[]>('/api/dashboard/keys', fetcher);
    // Safety check: ensure keysData is an array. If API returns error object (401), treat as empty or null.
    const keys = Array.isArray(keysData) ? keysData : [];

    const [isCreating, setIsCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [createdKey, setCreatedKey] = useState<{ key: string, id: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const res = await fetch('/api/dashboard/keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newKeyName }),
            });
            const data = await res.json();
            if (res.ok) {
                setCreatedKey(data);
                setNewKeyName('');
                mutate('/api/dashboard/keys'); // Refresh list
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this key? This action cannot be undone.')) return;
        try {
            await fetch(`/api/dashboard/keys/${id}`, {
                method: 'DELETE',
            });
            mutate('/api/dashboard/keys');
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (error) return <div className="text-red-400">Failed to load API keys</div>;
    if (!keys) return <div className="text-slate-500">Loading keys...</div>;

    return (
        <div className="space-y-6">
            {/* Removed Redundant Header: Context is provided by page `h1`. */}

            {/* Create Key Form (Simple Inline) */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-white mb-3">Create New Key</h3>
                <form onSubmit={handleCreate} className="flex gap-4 items-end">
                    <div className="w-full max-w-md">
                        <label htmlFor="keyName" className="block text-sm font-medium text-slate-400 mb-2">
                            Key Name
                        </label>
                        <input
                            id="keyName"
                            type="text"
                            placeholder="e.g. Production App"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-md px-3 py-2 text-white text-sm focus:outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400/50 mb-[1px]"
                    >
                        {isCreating ? 'Creating...' : <><Plus size={16} /> Create Key</>}
                    </button>
                </form>

                {/* Success Display ... */}
                {createdKey && (
                    <div className="mt-4 bg-green-900/20 border border-green-900/50 rounded-md p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-1 bg-green-500/20 rounded-full">
                                <Check size={16} className="text-green-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-medium text-green-400">API Key Created Successfully</h4>
                                <p className="text-xs text-slate-400 mt-1">Copy this key now. You won't be able to see it again.</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <code className="bg-black/50 px-3 py-2 rounded text-sm font-mono text-white flex-1 select-all border border-green-500/30">
                                        {createdKey.key}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(createdKey.key)}
                                        className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setCreatedKey(null)} className="text-slate-500 hover:text-white">✕</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Keys List */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Key Prefix</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Used</th>
                            <th scope="col" className="relative px-6 py-4">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                        {keys.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                                    No API keys found. Create one to get started.
                                </td>
                            </tr>
                        ) : (
                            keys.map((key) => (
                                <tr key={key.id} className="group hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500 mr-3">
                                                <Key size={16} />
                                            </div>
                                            <div className="text-sm font-medium text-white">{key.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                                        {key.prefix}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        {new Date(key.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleRevoke(key.id)}
                                            className="text-red-400 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
