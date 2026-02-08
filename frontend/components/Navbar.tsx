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
                alignItems: 'center'
            }}>
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white">
                    <span style={{ fontSize: '24px' }}>⚡</span>
                    Zaps.ai
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">features</Link>
                    <Link href="#pricing" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">pricing</Link>
                    <Link href="https://github.com/zaps-ai/gateway" target="_blank" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">docs</Link>
                </div>

                {/* Auth Buttons */}
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">
                        Log in
                    </Link>
                    <Link href="/signup" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 px-4 rounded-lg transition-all text-sm">
                        Get Started
                    </Link>
                </div>
            </div>
        </nav>
    );
}
