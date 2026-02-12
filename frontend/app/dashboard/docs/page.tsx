'use client';

import useSWR from 'swr';
import SnippetGenerator from '@/components/dashboard/SnippetGenerator';
import { Shield, Key, Lock, ExternalLink, Terminal, AlertCircle } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DocsPage() {
    // Fetch user profile to get the API Key (if we want to show it)
    // In a real app, we might want to fetch keys specifically from /api/dashboard/keys
    // For now, we'll try to fetch keys or use a placeholder.
    // Let's assume we can get a key from /api/dashboard/keys logic or profile.
    // Actually, ProviderList fetches /api/dashboard/providers. 
    // Let's use a generic fetcher for keys if available, otherwise placeholder.

    // NOTE: For security, we might not want to auto-inject the *actual* secret key 
    // unless explicitly requested, but the user asked for "test the APIs... export apis".
    // We'll leave it as a placeholder for safety by default, or better yet,
    // let's fetch the keys and if one exists, use it.

    const { data: keysData } = useSWR('/api/dashboard/keys', fetcher);

    // Find the first active key if available
    const activeKey = keysData?.keys && keysData.keys.length > 0
        ? keysData.keys[0].key
        : 'gk_YOUR_ZAPS_KEY';

    return (
        <div className="max-w-6xl mx-auto space-y-10 mb-20">
            {/* Header */}
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    API Reference
                </h1>
                <p className="text-slate-400 text-lg max-w-3xl">
                    Integrate Zaps into your application in minutes. The Gateway provides a unified,
                    OpenAI-compatible API for all supported LLM providers.
                </p>
            </div>

            {/* Authentication Guide */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-white font-semibold text-lg">
                            <Shield className="text-cyan-400" size={20} />
                            <h2>Authentication</h2>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                            Authenticate your requests by including your API key in the <code className="text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded text-sm border border-cyan-900/50">Authorization</code> header.
                            Your keys carry many privileges, so be sure to keep them secure. Do not share your secret API keys in publicly accessible areas such as GitHub, client-side code, and so forth.
                        </p>

                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-3">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Header Format</span>
                            <code className="font-mono text-slate-300">
                                Authorization: Bearer <span className="text-cyan-400">{activeKey}</span>
                            </code>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="flex items-center gap-2 text-white font-semibold text-lg">
                            <Terminal className="text-purple-400" size={20} />
                            <h2>Interactive Request Builder</h2>
                        </div>
                        <p className="text-slate-400">
                            Select a provider and language to generate a ready-to-run code snippet.
                        </p>

                        <SnippetGenerator apiKey={activeKey} />
                    </section>

                    <section className="space-y-6 pt-8 border-t border-slate-800">
                        <div className="flex items-center gap-2 text-white font-semibold text-lg">
                            <AlertCircle className="text-amber-400" size={20} />
                            <h2>Troubleshooting Common Errors</h2>
                        </div>
                        <div className="grid gap-4">
                            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
                                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                                    <span className="text-red-400 font-mono text-sm">402 Payment Required</span>
                                    <span className="text-slate-500 text-sm">/</span>
                                    <span className="text-red-400 font-mono text-sm">insufficient_quota</span>
                                </h3>
                                <p className="text-sm text-slate-400">
                                    <strong>Cause:</strong> Your OpenAI API key has no active credits.
                                    <br />
                                    <strong>Fix:</strong> Add credits to your OpenAI account (Settings &gt; Billing). A linked card alone is not enough; you must pre-purchase credits.
                                </p>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
                                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                                    <span className="text-red-400 font-mono text-sm">404 Not Found</span>
                                    <span className="text-slate-500 text-sm">/</span>
                                    <span className="text-red-400 font-mono text-sm">model_not_found</span>
                                </h3>
                                <p className="text-sm text-slate-400">
                                    <strong>Cause:</strong> Your API key does not have access to the requested model.
                                    <br />
                                    <strong>Fix:</strong>
                                    <ul className="list-disc pl-5 mt-1 space-y-1">
                                        <li><strong>Anthropic:</strong> Claude 3.5 Sonnet requires a <strong>Tier 1+</strong> account (min. $5 prepaid). Free keys are restricted to Haiku.</li>
                                        <li><strong>Check Typos:</strong> Ensure you are using a supported model ID (e.g., <code>claude-3-5-sonnet-latest</code>).</li>
                                    </ul>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Sidebar / Info Cards */}
                <div className="space-y-6">
                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-3 text-slate-200 font-medium">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Lock size={18} className="text-blue-400" />
                            </div>
                            PII Redaction Active
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            All requests sent through this gateway are automatically scanned. Sensitive data (PII) is encrypted before reaching the LLM provider and rehydrated in the response.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-3 text-slate-200 font-medium">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <Key size={18} className="text-green-400" />
                            </div>
                            Managing Keys
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            You can roll your API keys or create separate keys for different environments (Development, Production) in the Keys dashboard.
                        </p>
                        <a href="/dashboard/keys" className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                            Manage API Keys <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
