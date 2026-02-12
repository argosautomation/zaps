'use client'

import { useState, useEffect } from 'react'

export default function InspectorTool() {
    const [input, setInput] = useState('')
    const [result, setResult] = useState<{
        redacted: string;
        rehydrated: string;
        detected_secrets: Record<string, any>;
        latency_ms: number;
    } | null>(null)

    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<'redacted' | 'rehydrated'>('redacted')

    useEffect(() => {
        setMounted(true)
    }, [])

    const examples = [
        {
            label: 'Personal (PII)',
            text: "Hi support, my email is alice.smith@example.com and my phone number is 555-0123. Please reset my password."
        },
        {
            label: 'Financial (PCI)',
            text: "I need a refund for the transaction on card 4444-5555-6666-7777. It was charged yesterday."
        },
        {
            label: 'Developer (Keys)',
            text: "Reviewing the logs, I found a leaked key: sk-live-51N3... (you know the rest). Can you revoke it?"
        }
    ]

    const handleAnalyze = async () => {
        if (!input.trim()) return
        setLoading(true)
        setResult(null)

        try {
            // Use relative path - Next.js rewrites will handle the proxy to backend
            const res = await fetch('/api/playground/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input })
            })
            const data = await res.json()
            setResult(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    return (
        <div className="h-full flex flex-col">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">
                    <span className="gradient-text">PII Redaction</span> Inspector
                </h2>
                <p className="text-slate-400">
                    Test the privacy gateway&apos;s redaction capabilities. No data leaves this demo permanently.
                </p>
            </div>

            <div className="glass-card p-6 grid lg:grid-cols-2 gap-6 flex-1 min-h-0">

                {/* Input Side */}
                <div className="flex flex-col min-h-0">
                    <div className="mb-4 flex gap-2 flex-wrap">
                        {examples.map(ex => (
                            <button
                                key={ex.label}
                                onClick={() => setInput(ex.text)}
                                className="text-xs px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                                {ex.label}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type or paste text with sensitive info..."
                        className="flex-1 w-full bg-slate-950/50 border border-slate-800 rounded-lg p-4 text-white font-mono resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={loading || !input}
                        className="cta-button w-full mt-4 justify-center"
                    >
                        {loading ? 'Analyzing...' : 'Simulate Redaction'}
                    </button>
                </div>

                {/* Output Side */}
                <div className="flex flex-col min-h-0 relative">
                    {/* Tabs */}
                    <div className="flex bg-slate-950/50 rounded-t-xl border-b border-slate-800">
                        <button
                            onClick={() => setActiveTab('redacted')}
                            className={`flex-1 p-3 text-sm font-medium transition-colors rounded-tl-xl ${activeTab === 'redacted'
                                    ? 'bg-slate-800/50 text-cyan-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            What LLM Sees
                        </button>
                        <button
                            onClick={() => setActiveTab('rehydrated')}
                            className={`flex-1 p-3 text-sm font-medium transition-colors rounded-tr-xl ${activeTab === 'rehydrated'
                                    ? 'bg-slate-800/50 text-emerald-400'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Rehydrated (Final)
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-950/30 rounded-b-xl border border-slate-800 border-t-0 p-4 overflow-auto font-mono text-sm whitespace-pre-wrap">
                        {result ? (
                            <span className={activeTab === 'redacted' ? 'text-cyan-200' : 'text-emerald-200'}>
                                {activeTab === 'redacted' ? result.redacted : result.rehydrated}
                            </span>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-600 italic">
                                Run simulation to see output
                            </div>
                        )}
                    </div>

                    {/* Stats Overlay */}
                    {result && (
                        <div className="mt-4 flex justify-between text-xs text-slate-500 font-mono">
                            <span>Secrets Detected: <strong className="text-white">{Object.keys(result.detected_secrets).length}</strong></span>
                            <span>Overhead: <strong className="text-white">{result.latency_ms}ms</strong></span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
