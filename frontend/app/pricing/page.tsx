'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

const tiers = [
    {
        name: 'Free',
        id: 'tier-free',
        href: '#',
        price: '$0',
        description: 'Perfect for testing and personal projects.',
        features: [
            '1,000 requests per month',
            'Basic PII Redaction',
            'Single User',
            'Community Support',
        ],
        mostPopular: false,
    },
    {
        name: 'Starter',
        id: 'tier-starter',
        href: '#',
        price: '$49',
        description: 'Perfect for growing apps that need real protection.',
        features: [
            '50,000 requests/mo',
            'Secure PII Rehydration',
            'Custom PII Patterns',
            'Email & Slack Alerts',
            '7-day Audit Log Retention',
        ],
        mostPopular: true,
    },
    {
        name: 'Pro',
        id: 'tier-pro',
        href: '#',
        price: '$249',
        description: 'For scaling teams requiring compliance & control.',
        features: [
            '250,000 requests/mo',
            'Everything in Starter',
            'Secure PII Rehydration',
            'SSO & SAML (Coming Soon)',
            'Team Collaboration Seats',
            '30-day Audit Log Retention',
            'Priority Support',
        ],
        mostPopular: false,
    },
    {
        name: 'Enterprise',
        id: 'tier-enterprise',
        href: '#',
        price: 'Custom',
        description: 'Bank-grade security for regulated industries.',
        features: [
            'Unlimited volume',
            'On-Premise Deployment',
            'HIPAA BAA & SOC 2 Report',
            'Dedicated Success Manager',
            'Custom SLA',
            '99.99% Uptime Guarantee',
        ],
        mostPopular: false,
    },
]

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)

    const handleCheckout = async (priceId: string) => {
        setLoading(priceId)
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}` // Assuming implicit auth or proxy handling
                },
                body: JSON.stringify({ priceID: priceId }),
            })

            if (!res.ok) throw new Error('Checkout failed')

            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch (error) {
            console.error(error)
            alert('Checkout failed. Please ensure backend is running with Stripe keys.')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="bg-slate-950 py-24 sm:py-32 min-h-screen">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-cyan-400">Pricing</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Pricing plans for teams of all sizes
                    </p>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-slate-400">
                    Choose the best plan for your business. Upgrade or downgrade at any time.
                </p>

                <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={classNames(
                                tier.mostPopular ? 'bg-slate-900/50 ring-2 ring-cyan-500' : 'list-none ring-1 ring-white/10 bg-slate-900/20',
                                'rounded-3xl p-8 xl:p-10 transition-all hover:bg-slate-900/80 relative'
                            )}
                        >
                            {tier.mostPopular && (
                                <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-cyan-500/20">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-x-4">
                                <h3 id={tier.id} className="text-lg font-semibold leading-8 text-white">
                                    {tier.name}
                                </h3>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-slate-400">{tier.description}</p>
                            <p className="mt-6 flex items-baseline gap-x-1">
                                <span className="text-4xl font-bold tracking-tight text-white">{tier.price}</span>
                                {tier.price !== 'Custom' && <span className="text-sm font-semibold leading-6 text-slate-400">/month</span>}
                            </p>
                            <button
                                onClick={() => {
                                    if (tier.id === 'tier-starter') {
                                        // Starter Plan ($49)
                                        handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || '');
                                    } else if (tier.id === 'tier-pro') {
                                        // Pro Plan ($249)
                                        handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '');
                                    } else if (tier.price === 'Custom') {
                                        window.location.href = 'mailto:sales@zaps.ai';
                                    }
                                }}
                                disabled={loading !== null || tier.price === '$0'}
                                className={classNames(
                                    tier.mostPopular
                                        ? 'bg-cyan-500 text-white shadow-sm hover:bg-cyan-400'
                                        : 'bg-white/10 text-white hover:bg-white/20',
                                    'mt-6 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 w-full disabled:opacity-50 disabled:cursor-not-allowed'
                                )}
                            >
                                {loading === tier.id ? 'Processing...' : (
                                    tier.price === '$0' ? 'Current Plan' :
                                        (tier.id === 'tier-starter' ? 'Start Free Trial' :
                                            (tier.id === 'tier-pro' ? 'Start Pro Trial' :
                                                (tier.price === 'Custom' ? 'Contact Sales' : 'Coming Soon')))
                                )}
                            </button>
                            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-slate-400 xl:mt-10">
                                {tier.features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <Check className="h-6 w-5 flex-none text-cyan-400" aria-hidden="true" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-16 flex justify-center">
                    <Link href="/dashboard" className="text-sm font-semibold leading-6 text-cyan-400 hover:text-cyan-300">
                        &larr; Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
