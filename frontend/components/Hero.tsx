'use client'

import Link from 'next/link'

export default function Hero() {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            position: 'relative'
        }}>

            {/* Animated background blobs */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '20%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'pulse 4s ease-in-out infinite'
            }}></div>

            <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '20%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
                filter: 'blur(60px)',
                animation: 'pulse 4s ease-in-out infinite 2s'
            }}></div>

            <div style={{
                maxWidth: '1200px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10
            }}>

                {/* Lightning Icon */}
                <div style={{
                    fontSize: '80px',
                    marginBottom: '32px',
                    animation: 'pulse 3s ease-in-out infinite'
                }}>⚡</div>

                {/* Headline */}
                <h1 style={{
                    fontSize: 'clamp(32px, 8vw, 72px)',
                    fontWeight: '900',
                    marginBottom: '24px',
                    lineHeight: '1.1'
                }}>
                    <div style={{ color: '#ffffff', marginBottom: '16px' }}>
                        Stop Sending Customer Secrets
                    </div>
                    <div className="gradient-text">
                        to AI Companies
                    </div>
                </h1>

                {/* Subheadline */}
                <p style={{
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    color: '#CBD5E1',
                    marginBottom: '16px',
                    maxWidth: '900px',
                    margin: '0 auto 16px'
                }}>
                    Automatically remove emails, phone numbers, and sensitive data before every ChatGPT, Claude, or LLM call.
                </p>

                <p style={{
                    fontSize: 'clamp(16px, 2vw, 20px)',
                    color: '#94A3B8',
                    marginBottom: '48px',
                    maxWidth: '800px',
                    margin: '0 auto 48px'
                }}>
                    Your AI gets the context. Customer privacy stays protected. You stay compliant.
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
                        Start Free Trial
                    </Link>

                    <Link href="#features" className="cta-secondary">
                        See How It Works
                    </Link>
                </div>

                {/* Trust indicators */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '24px',
                    fontSize: '14px',
                    color: '#94A3B8'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg style={{ width: '20px', height: '20px', color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        No credit card required
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg style={{ width: '20px', height: '20px', color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        1,000 free requests/month
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg style={{ width: '20px', height: '20px', color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Enterprise-grade protection
                    </span>
                </div>

                {/* Trusted By */}
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '48px', marginBottom: '16px', letterSpacing: '1px' }}>TRUSTED BY INNOVATORS AT</p>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '40px',
                    opacity: 0.5,
                    filter: 'grayscale(100%)',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>JNTO.co</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Glassdesk.ai</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Pranstech</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Landline Remover</div>
                </div>
            </div>
        </section>
    )
}
