'use client'

import { useState, useEffect } from 'react'

export default function Playground() {
    const [input, setInput] = useState('')
    const [result, setResult] = useState<any>(null)
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
        <section id="playground" style={{ padding: '80px 24px', position: 'relative' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: '16px' }}>
                        See <span className="gradient-text">Redaction</span> in Action
                    </h2>
                    <p style={{ color: '#94A3B8' }}>
                        Try it yourself. No data leaves this demo permanently.
                    </p>
                </div>

                <div className="glass-card" style={{ padding: '32px', display: 'grid', gap: '32px', gridTemplateColumns: '1fr 1fr' }}>

                    {/* Input Side */}
                    <div>
                        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {examples.map(ex => (
                                <button
                                    key={ex.label}
                                    onClick={() => setInput(ex.text)}
                                    style={{
                                        fontSize: '12px',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#cbd5e1',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {ex.label}
                                </button>
                            ))}
                        </div>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Type or paste text with sensitive info..."
                            style={{
                                width: '100%',
                                height: '300px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: '#fff',
                                fontFamily: 'monospace',
                                resize: 'none',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !input}
                            style={{
                                width: '100%',
                                marginTop: '16px',
                                padding: '14px 24px',
                                background: loading || !input ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #06B6D4, #0891B2)',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '15px',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: loading || !input ? 'not-allowed' : 'pointer',
                                letterSpacing: '0.5px',
                                transition: 'all 0.2s ease',
                                boxShadow: loading || !input ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={e => {
                                if (!loading && input) {
                                    (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                                    (e.target as HTMLElement).style.boxShadow = '0 6px 25px rgba(6, 182, 212, 0.5)';
                                }
                            }}
                            onMouseLeave={e => {
                                (e.target as HTMLElement).style.transform = 'translateY(0)';
                                (e.target as HTMLElement).style.boxShadow = loading || !input ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.35)';
                            }}
                        >
                            {loading ? '⏳ Analyzing...' : '⚡ Simulate Redaction'}
                        </button>
                    </div>

                    {/* Output Side */}
                    <div style={{ position: 'relative' }}>
                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '12px 12px 0 0',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <button
                                onClick={() => setActiveTab('redacted')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px 0 0 0',
                                    background: activeTab === 'redacted' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    color: activeTab === 'redacted' ? '#22D3EE' : '#64748B',
                                    fontWeight: activeTab === 'redacted' ? 'bold' : 'normal'
                                }}
                            >
                                What LLM Sees
                            </button>
                            <button
                                onClick={() => setActiveTab('rehydrated')}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '0 12px 0 0',
                                    background: activeTab === 'rehydrated' ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    color: activeTab === 'rehydrated' ? '#10B981' : '#64748B',
                                    fontWeight: activeTab === 'rehydrated' ? 'bold' : 'normal'
                                }}
                            >
                                Rehydrated (Final)
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{
                            height: '300px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '0 0 12px 12px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderTop: 'none',
                            padding: '16px',
                            position: 'relative',
                            overflow: 'auto',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            color: activeTab === 'redacted' ? '#A5F3FC' : '#D1FAE5'
                        }}>
                            {result ? (
                                activeTab === 'redacted' ? result.redacted : result.rehydrated
                            ) : (
                                <div style={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.3
                                }}>
                                    Run simulation to see output
                                </div>
                            )}
                        </div>

                        {/* Stats Overlay */}
                        {result && (
                            <div style={{
                                marginTop: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#94A3B8'
                            }}>
                                <span>Secrets Detected: <strong style={{ color: '#fff' }}>{Object.keys(result.detected_secrets).length}</strong></span>
                                <span>Overhead: <strong style={{ color: '#fff' }}>{result.latency_ms}ms</strong></span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
