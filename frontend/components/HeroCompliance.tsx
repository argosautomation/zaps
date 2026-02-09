'use client'

import Link from 'next/link'
import DecryptedText from './DecryptedText'

export default function HeroCompliance() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 py-20 px-6">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-20"></div>

                {/* Green/Emerald Tint for Compliance */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto text-center">

                {/* Compliance Badges */}
                <div className="flex justify-center gap-4 mb-8">
                    {['HIPAA Ready', 'GDPR Compliant', 'SOC 2 Type II'].map(badge => (
                        <div key={badge} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400 uppercase tracking-widest backdrop-blur-sm">
                            {badge}
                        </div>
                    ))}
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-500">
                        <DecryptedText
                            text="Instant Compliance"
                            animateOn="view"
                            revealDirection="start"
                            sequential={true}
                            speed={70}
                            maxIterations={10}
                            characters="ABCDEF0123456789"
                            parentClassName="inline-block"
                            className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-emerald-400 to-teal-500"
                            encryptedClassName="text-emerald-800"
                        />
                    </span>
                    <br />
                    for Generative AI
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-slate-300 font-medium mb-12 max-w-3xl mx-auto leading-relaxed">
                    Meet data residency and privacy requirements automatically.
                    We filter PII before it ever touches OpenAI, Anthropic, or external vendors.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                    <Link
                        href="/signup"
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-bold rounded-full transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-105"
                    >
                        Download Compliance Report
                    </Link>

                    <Link
                        href="#pricing"
                        className="px-8 py-4 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-full font-semibold transition-all hover:bg-slate-800/50"
                    >
                        View Enterprise Plans
                    </Link>
                </div>

                {/* Trusted By */}
                <div className="border-t border-slate-800/50 pt-10">
                    <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-8">
                        Trusted by Compliance Teams at
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
