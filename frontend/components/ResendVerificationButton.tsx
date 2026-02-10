'use client'

import { useState, useEffect } from 'react'

interface ResendVerificationButtonProps {
    email: string
    className?: string
}

export default function ResendVerificationButton({ email, className = "" }: ResendVerificationButtonProps) {
    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => setCooldown(c => c - 1), 1000)
            return () => clearInterval(timer)
        }
    }, [cooldown])

    const handleResend = async () => {
        setLoading(true)
        setMessage('')
        try {
            const res = await fetch('/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to send email')
            setMessage('Email sent!')
            setCooldown(60)
        } catch (err: any) {
            setMessage(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (cooldown > 0) {
        return (
            <div className={`flex flex-col items-center gap-2 ${className}`}>
                <button disabled className="text-slate-500 cursor-not-allowed font-medium text-sm">
                    Resend email in {cooldown}s
                </button>
                {message && <p className="text-green-400 text-xs">{message}</p>}
            </div>
        )
    }

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-cyan-400 hover:text-cyan-300 font-medium text-sm transition-colors disabled:opacity-50 underline decoration-cyan-400/30 hover:decoration-cyan-400"
            >
                {loading ? 'Sending...' : 'Resend verification email'}
            </button>
            {message && <p className="text-red-400 text-xs">{message}</p>}
        </div>
    )
}
