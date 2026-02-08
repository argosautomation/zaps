'use client'

import Link from 'next/link'

export default function HeroTechnical() {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            position: 'relative'
        }}>

            {/* Technical Grid Background */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                opacity: 0.5,
                maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
            }}></div>

            <div style={{
                maxWidth: '1200px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10
            }}>

                {/* Code Badge */}
                <button
                    onClick={() => {
                        // Magic Copy: We copy the working command (with ports) even though we display the clean one
                        navigator.clipboard.writeText('docker run -p 3000:3000 zapsai/zaps-gateway')
                        const el = document.getElementById('copy-feedback')
                        if (el) {
                            el.style.opacity = '1'
                            el.style.transform = 'translateY(0)'
                            setTimeout(() => {
                                el.style.opacity = '0'
                                el.style.transform = 'translateY(10px)'
                            }, 2000)
                        }
                    }}
                    className="group"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 24px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid rgba(34, 211, 238, 0.2)',
                        borderRadius: '100px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                        color: '#22D3EE',
                        marginBottom: '32px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.2)'}
                >
                    <span style={{ opacity: 0.5 }}>$</span>
                    <span>docker run zapsai/zaps-gateway</span>

                    {/* Copy Icon */}
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: 0.5, transition: 'opacity 0.2s' }}
                        className="group-hover:opacity-100"
                    >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>

                    {/* Copied Feedback */}
                    <div
                        id="copy-feedback"
                        style={{
                            position: 'absolute',
                            top: '-30px',
                            left: '50%',
                            transform: 'translate(-50%, 10px)',
                            background: '#22D3EE',
                            color: '#0F172A',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            opacity: 0,
                            pointerEvents: 'none',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Copied!
                    </div>
                </button>

                {/* Headline */}
                <h1 style={{
                    fontSize: 'clamp(32px, 8vw, 72px)',
                    fontWeight: '900',
                    marginBottom: '24px',
                    lineHeight: '1.1'
                }}>
                    High-Performance<br />
                    <span className="gradient-text">PII Redaction Gateway</span>
                </h1>

                {/* Subheadline */}
                <p style={{
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    color: '#CBD5E1',
                    marginBottom: '16px',
                    maxWidth: '900px',
                    margin: '0 auto 16px'
                }}>
                    Open-source, self-hostable proxy that sanitizes sensitive data from LLM requests in real-time.
                </p>

                <p style={{
                    fontSize: 'clamp(16px, 2vw, 20px)',
                    color: '#94A3B8',
                    marginBottom: '48px',
                    maxWidth: '800px',
                    margin: '0 auto 48px',
                    fontFamily: 'monospace'
                }}>
                    {'< 10ms latency • Custom Regex Rules • 100% Stateless'}
                </p>

                {/* CTA Buttons */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '48px'
                }}>
                    <Link href="/signup" className="cta-button">
                        Get API Keys
                    </Link>

                    <Link href="https://github.com" className="cta-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        View Documentation
                    </Link>
                </div>
            </div>
        </section>
    )
}
