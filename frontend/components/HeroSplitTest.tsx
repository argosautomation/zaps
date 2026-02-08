'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Hero from './Hero'
import HeroTechnical from './HeroTechnical'
import HeroCompliance from './HeroCompliance'

function HeroSplitTestContent() {
    const searchParams = useSearchParams()
    const [variant, setVariant] = useState<string>('A')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Check URL params first (e.g., ?v=B)
        const urlVariant = searchParams.get('v')
        if (urlVariant && ['A', 'B', 'C'].includes(urlVariant.toUpperCase())) {
            setVariant(urlVariant.toUpperCase())
            return
        }

        // Otherwise random assignment (simple client-side split)
        const savedVariant = localStorage.getItem('zaps_hero_variant')
        if (savedVariant) {
            setVariant(savedVariant)
        } else {
            const rand = Math.random()
            let newVariant = 'A' // 50% Control
            if (rand > 0.5 && rand <= 0.75) newVariant = 'B' // 25% Technical
            if (rand > 0.75) newVariant = 'C' // 25% Compliance

            localStorage.setItem('zaps_hero_variant', newVariant)
            setVariant(newVariant)
        }
    }, [searchParams])

    if (!mounted) return <Hero /> // Default to Control for SSR

    return (
        <>
            {/* Dev Controls - Visible only in development */}
            {process.env.NODE_ENV === 'development' && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999,
                    background: 'rgba(0,0,0,0.8)',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    fontSize: '12px',
                    color: '#fff',
                    display: 'flex',
                    gap: '8px'
                }}>
                    <span className="block text-cyan-400">for Generative AI</span>
                    <span style={{ opacity: 0.5 }}>Variant:</span>
                    <button onClick={() => setVariant('A')} style={{ fontWeight: variant === 'A' ? 'bold' : 'normal', color: variant === 'A' ? '#22D3EE' : '#fff' }}>A (Control)</button>
                    <button onClick={() => setVariant('B')} style={{ fontWeight: variant === 'B' ? 'bold' : 'normal', color: variant === 'B' ? '#22D3EE' : '#fff' }}>B (Tech)</button>
                    <button onClick={() => setVariant('C')} style={{ fontWeight: variant === 'C' ? 'bold' : 'normal', color: variant === 'C' ? '#22D3EE' : '#fff' }}>C (Comp)</button>
                </div>
            )}

            {variant === 'A' && <Hero />}
            {variant === 'B' && <HeroTechnical />}
            {variant === 'C' && <HeroCompliance />}
        </>
    )
}

export default function HeroSplitTest() {
    return (
        <Suspense fallback={<Hero />}>
            <HeroSplitTestContent />
        </Suspense>
    )
}
