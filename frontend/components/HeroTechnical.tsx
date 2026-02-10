'use client'

import Link from 'next/link'
import DecryptedText from './DecryptedText'

export default function HeroTechnical() {
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
                    className="group inline-flex items-center gap-3 px-6 py-3 bg-slate-900/60 border border-cyan-400/20 rounded-full font-mono text-cyan-400 text-sm mb-8 cursor-pointer transition-all hover:border-cyan-400/50 relative"
                >
                    <span className="opacity-50">$</span>
                    <span>docker run zapsai/zaps-gateway</span>

                    {/* Copy Icon */}
                    <svg
                        className="w-4 h-4 opacity-50 transition-opacity group-hover:opacity-100"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>

                    {/* Copied Feedback */}
                    <div
                        id="copy-feedback"
                        className="absolute -top-8 left-1/2 -translate-x-1/2 translate-y-2 bg-cyan-400 text-slate-950 px-2 py-1 rounded text-xs font-bold opacity-0 pointer-events-none transition-all whitespace-nowrap"
                    >
                        Copied!
                    </div>
                </button>

                {/* Headline */}
                <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                    High-Performance<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-500">
                        <DecryptedText
                            text="PII Redaction Gateway"
                            animateOn="view"
                            revealDirection="start"
                            sequential={true}
                            speed={70}
                            maxIterations={10}
                            characters="ABCDEF0123456789"
                            parentClassName="inline-block"
                            className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-blue-500"
                            encryptedClassName="text-cyan-800"
                        />
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg md:text-xl text-slate-300 font-medium mb-6 max-w-3xl mx-auto leading-relaxed">
                    Open-source, self-hostable proxy that sanitizes sensitive data from LLM requests in real-time.
                </p>

                <p className="font-mono text-sm md:text-base text-slate-400 mb-12 max-w-2xl mx-auto tracking-tight">
                    {'< 10ms latency • Smart PII Detection • 100% Stateless'}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                    <Link
                        href="/signup"
                        className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-lg font-bold rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-105"
                    >
                        Get API Keys
                    </Link>

                    <Link
                        href="https://github.com/argosautomation/zaps"
                        className="px-8 py-4 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-full font-semibold transition-all hover:bg-slate-800/50 flex items-center gap-2"
                    >
                        <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                        View Documentation
                    </Link>
                </div>

                {/* Trusted By */}
                <div className="border-t border-slate-800/50 pt-10">
                    <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase mb-8">
                        Trusted by Engineering Teams at
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
        </section >
    )
}
