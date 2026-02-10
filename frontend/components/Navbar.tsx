'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: '20px 0',
            transition: 'all 0.3s ease',
            background: scrolled ? 'rgba(15, 23, 42, 0.9)' : 'transparent',
            backdropFilter: scrolled ? 'blur(10px)' : 'none',
            borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative'
            }}>
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white z-10">
                    <span style={{ fontSize: '24px' }}>⚡</span>
                    Zaps.ai
                </Link>

                {/* Desktop Nav - Absolutely Centered */}
                <div className="hidden md:flex items-center gap-10 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Link href="#features" className="text-slate-300 hover:text-white hover:text-cyan-400 transition-colors text-sm font-semibold tracking-wide">Features</Link>
                    <Link href="#pricing" className="text-slate-300 hover:text-white hover:text-cyan-400 transition-colors text-sm font-semibold tracking-wide">Pricing</Link>
                    <Link href="https://github.com/argosautomation/zaps" target="_blank" className="text-slate-300 hover:text-white hover:text-cyan-400 transition-colors text-sm font-semibold tracking-wide">Docs</Link>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-4 z-10">
                    <Link href="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                        Log in
                    </Link>
                    <Link href="/signup" style={{ padding: '12px 32px' }} className="inline-flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:scale-105 whitespace-nowrap">
                        Get Started
                    </Link>
                </div>
            </div>
        </nav>
    );
}
