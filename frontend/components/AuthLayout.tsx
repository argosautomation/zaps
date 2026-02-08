'use client'

import Link from 'next/link'

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
    return (
        <div className="min-h-screen flex bg-slate-950">

            {/* Left Side - Art / Testimonial (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>

                {/* Grid Overlay */}
                <div style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    position: 'absolute',
                    inset: 0,
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
                }}></div>

                {/* Content */}
                <div className="relative z-10 max-w-lg px-12">
                    <div className="mb-16">
                        <Link href="/" className="flex items-center gap-2 text-white font-bold text-2xl mb-10">
                            <span>⚡</span> Zaps.ai
                        </Link>
                        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-6 leading-tight">
                            {title}
                        </h1>
                        <p className="text-lg text-slate-400 leading-relaxed">
                            {subtitle}
                        </p>
                    </div>

                    {/* Testimonial Card */}
                    <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl border border-slate-700/50">
                        <div className="flex gap-1 mb-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <svg key={i} className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <p className="text-slate-300 italic mb-4">
                            "Before Zaps, we spent weeks manual reviewing logs. Now I sleep easy knowing raw PII never even hits our provider."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                TG
                            </div>
                            <div>
                                <div className="text-white font-semibold">TJ Gaushas</div>
                                <div className="text-xs text-slate-400">COO @ Textdrip</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                {/* Mobile Background Elements */}
                <div className="lg:hidden absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>

                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <Link href="/" className="lg:hidden flex items-center gap-2 text-white font-bold text-2xl mb-12 justify-center">
                        <span>⚡</span> Zaps.ai
                    </Link>

                    {children}
                </div>
            </div>
        </div>
    )
}
