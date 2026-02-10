'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Pricing() {
    const [loading, setLoading] = useState<string | null>(null);

    const handleUpgrade = async (priceId: string) => {
        if (!priceId) return;
        setLoading(priceId);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ priceID: priceId })
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('Failed to start checkout');
                setLoading(null);
            }
        } catch (err) {
            console.error(err);
            alert('Error connecting to billing service');
            setLoading(null);
        }
    };

    const plans = [
        {
            name: 'Free',
            price: '$0',
            period: '/month',
            description: 'Perfect for testing and personal projects',
            features: [
                '1,000 requests/month',
                'Sandbox environment',
                'Email support',
                'Basic analytics',
                'Community access'
            ],
            cta: 'Current Plan',
            href: '/dashboard',
            highlighted: false,
            priceId: '' // Free has no price ID
        },
        {
            name: 'Starter',
            price: '$49',
            period: '/mo',
            description: 'Perfect for growing apps that need real protection.',
            features: [
                '50,000 requests/mo',
                'Secure PII Rehydration',
                'Custom PII Patterns',
                'Email & Slack Alerts',
                '7-day Audit Log Retention'
            ],
            cta: 'Start Free Trial',
            href: '',
            highlighted: true,
            priceId: 'price_1Sz0JDGhDW3wG5p3zxqu5MYH' // Live Starter Price
        },
        {
            name: 'Pro',
            price: '$249',
            period: '/mo',
            description: 'For scaling teams requiring compliance & control.',
            features: [
                '250,000 requests/mo',
                'Everything in Starter',
                'Secure PII Rehydration',
                'SSO & SAML (Coming Soon)',
                'Team Collaboration Seats',
                '30-day Audit Log Retention',
                'Priority Support'
            ],
            cta: 'Start Pro Trial',
            href: '',
            highlighted: false,
            priceId: 'price_1Sz0EDGhDW3wG5p3k3zoXEYK' // Live Pro Price
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'Bank-grade security for regulated industries.',
            features: [
                'Unlimited volume',
                'On-Premise Deployment',
                'HIPAA BAA & SOC 2 Report',
                'Dedicated Success Manager',
                'Custom SLA',
                '99.99% Uptime Guarantee'
            ],
            cta: 'Contact Sales',
            href: 'mailto:sales@zaps.ai',
            highlighted: false,
            priceId: ''
        },
    ]

    return (
        <section id="pricing" style={{ padding: '100px 24px', position: 'relative' }}>

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Section Header */}
                <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                    <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginBottom: '24px' }}>
                        Simple, <span className="gradient-text">Transparent</span> Pricing
                    </h2>
                    <p style={{ fontSize: 'clamp(18px, 3vw, 20px)', color: '#94A3B8', maxWidth: '800px', margin: '0 auto' }}>
                        Pay only for what you use. No hidden fees. Cancel anytime.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '32px',
                    alignItems: 'stretch'
                }}>
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className="glass-card"
                            style={{
                                padding: '32px',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                border: plan.highlighted ? '1px solid rgba(6, 182, 212, 0.5)' : undefined,
                                boxShadow: plan.highlighted ? '0 0 30px rgba(6, 182, 212, 0.15)' : undefined,
                                transform: plan.highlighted ? 'scale(1.02)' : undefined
                            }}
                        >
                            {/* Popular badge */}
                            {plan.highlighted && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-16px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
                                    color: '#0F172A',
                                    padding: '4px 16px',
                                    borderRadius: '100px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    letterSpacing: '0.5px'
                                }}>
                                    MOST POPULAR
                                </div>
                            )}

                            {/* Plan name */}
                            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>{plan.name}</h3>

                            {/* Price */}
                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '48px', fontWeight: '700' }}>{plan.price}</span>
                                {plan.period && <span style={{ color: '#94A3B8', fontSize: '18px' }}>{plan.period}</span>}
                            </div>

                            {/* Description */}
                            <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '32px', minHeight: '42px' }}>
                                {plan.description}
                            </p>

                            {/* Features list */}
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flexGrow: 1 }}>
                                {plan.features.map((feature, index) => (
                                    <li key={index} style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        marginBottom: '16px',
                                        fontSize: '14px',
                                        color: '#CBD5E1',
                                        lineHeight: '1.5'
                                    }}>
                                        <svg
                                            style={{
                                                width: '20px',
                                                height: '20px',
                                                marginRight: '12px',
                                                flexShrink: 0,
                                                color: plan.highlighted ? '#22D3EE' : '#10B981'
                                            }}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button moved to bottom */}
                            {plan.priceId ? (
                                <button
                                    onClick={() => handleUpgrade(plan.priceId)}
                                    disabled={loading === plan.priceId}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'center',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        marginTop: 'auto',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        background: plan.highlighted ? 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)' : 'rgba(255, 255, 255, 0.05)',
                                        color: plan.highlighted ? '#0F172A' : '#fff',
                                        border: plan.highlighted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                                        opacity: loading === plan.priceId ? 0.7 : 1
                                    }}
                                >
                                    {loading === plan.priceId ? 'Processing...' : plan.cta}
                                </button>
                            ) : (
                                <Link
                                    href={plan.href}
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        textAlign: 'center',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        marginTop: 'auto',
                                        textDecoration: 'none',
                                        transition: 'all 0.3s ease',
                                        background: plan.highlighted ? 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)' : 'rgba(255, 255, 255, 0.05)',
                                        color: plan.highlighted ? '#0F172A' : '#fff',
                                        border: plan.highlighted ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                >
                                    {plan.cta}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                {/* Bottom text */}
                <p style={{ textAlign: 'center', color: '#64748B', fontSize: '14px', marginTop: '64px' }}>
                    All plans protect emails, phone numbers, API keys, credit cards, and more • Full GDPR & HIPAA compliance ready
                </p>
            </div>
        </section>
    )
}
