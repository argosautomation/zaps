'use client'

import Link from 'next/link'
import DecryptedText from './DecryptedText'

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 py-20 px-6">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-20"></div>

                {/* Gradient Orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto text-center">

                {/* Lightning Icon */}
                <div className="text-6xl mb-8 animate-bounce delay-700 inline-block">
                    ⚡
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                    <DecryptedText
                        text="Stop Sending Customer Secrets"
                        animateOn="view"
                        revealDirection="start"
                        sequential={true}
                        speed={70}
                        maxIterations={10}
                        characters="ABCDEF0123456789"
                    />
                    <br />
                    <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-500 text-transparent bg-clip-text">
                        to AI Companies
                    </span>
                </h1>

                {/* Subheadline - Primary */}
                <p className="text-lg md:text-xl text-slate-300 font-medium mb-6 max-w-3xl mx-auto leading-relaxed">
                    Automatically remove emails, phone numbers, and sensitive data before every ChatGPT, Claude, or LLM call.
                </p>

                {/* Subheadline - Secondary */}
                <p className="text-base md:text-lg text-slate-400 mb-12 max-w-2xl mx-auto">
                    Your AI gets the context. Customer privacy stays protected. You stay compliant.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                    <Link
                        href="/signup"
                        className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-lg font-bold rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-105"
                    >
                        Start Free Trial
                    </Link>

                    <Link
                        href="#features"
                        className="px-8 py-4 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-full font-semibold transition-all hover:bg-slate-800/50"
                    >
                        See How It Works
                    </Link>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-400 font-medium mb-16">
                    <div className="flex items-center gap-2">
                        <CheckIcon /> No credit card required
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckIcon /> 1,000 free requests/month
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckIcon /> Enterprise-grade protection
                    </div>
                </div>

                {/* Trusted By Logos */}
                <div className="border-t border-slate-800/50 pt-10">
                    <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-8">
                        Trusted by Innovators at
                    </p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {['JNTO.co', 'Glassdesk.ai', 'Pranstech', 'Landline Remover'].map((brand) => (
                            <div key={brand} className="text-xl font-bold text-slate-300 hover:text-white transition-colors cursor-default">
                                {brand}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

function CheckIcon() {
    return (
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    )
}
