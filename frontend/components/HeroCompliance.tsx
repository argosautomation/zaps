'use client'

import Link from 'next/link'

export default function HeroCompliance() {
    return (
        <section style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 24px',
            position: 'relative',
            background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)'
        }}>

            {/* Shield Background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
                filter: 'blur(80px)',
            }}></div>

            <div style={{
                maxWidth: '1200px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10
            }}>

                {/* Compliance Badges */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    {['HIPAA Ready', 'GDPR Compliant', 'SOC 2 Type II'].map(badge => (
                        <div key={badge} style={{
                            padding: '6px 12px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#34D399',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            {badge}
                        </div>
                    ))}
                </div>

                {/* Headline */}
                <h1 style={{
                    fontSize: 'clamp(32px, 8vw, 72px)',
                    fontWeight: '900',
                    marginBottom: '24px',
                    lineHeight: '1.2'
                }}>
                    Instant <span style={{ color: '#34D399' }}>Compliance</span> for <br />
                    Generative AI
                </h1>

                {/* Subheadline */}
                <p style={{
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    color: '#CBD5E1',
                    marginBottom: '16px',
                    maxWidth: '900px',
                    margin: '0 auto 16px'
                }}>
                    Meet data residency and privacy requirements automatically.
                    We filter PII before it ever touches OpenAI, Anthropic, or external vendors.
                </p>

                {/* CTA Buttons */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: '48px',
                    marginTop: '32px'
                }}>
                    <Link href="/signup" className="cta-button" style={{
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
                        color: 'white'
                    }}>
                        Download Compliance Report
                    </Link>

                    <Link href="#pricing" className="cta-secondary">
                        View Enterprise Plans
                    </Link>
                </div>

                {/* Logos */}
                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>TRUSTED BY COMPLIANCE TEAMS AT</p>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '40px',
                    opacity: 0.5,
                    filter: 'grayscale(100%)'
                }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>JNTO.co</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Glassdesk.ai</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Pranstech</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Landline Remover</div>
                </div>
            </div>
        </section>
    )
}
