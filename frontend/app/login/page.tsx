'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        code: ''
    })
    const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (response.status === 403 && data.error === 'mfa_required') {
                setStep('2fa')
                setLoading(false)
                return
            }

            if (!response.ok) {
                throw new Error(data.error || 'Login failed')
            }

            router.push('/dashboard')
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Invalid credentials'
            setError(errorMessage)
            if (step === '2fa') {
                // specific handling if 2fa fails? stay on 2fa step
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="h-12 w-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                            <span className="text-2xl">⚡</span>
                        </div>
                    </div>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                        {step === 'credentials' ? 'Welcome back' : 'Two-Factor Authentication'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                        {step === 'credentials'
                            ? 'Sign in to manage your secure gateways'
                            : 'Enter the 6-digit code from your authenticator app'}
                    </p>
                </div>

                <div className="bg-slate-900/50 p-8 py-10 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {step === 'credentials' ? (
                            <>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-300">
                                        Email address
                                    </label>
                                    <div className="mt-2 relative">
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            style={{ paddingLeft: '1.5rem' }}
                                            className="block w-full rounded-lg border-0 bg-slate-950/50 py-3 px-6 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6 transition-all"
                                            placeholder="you@company.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-300">
                                        Password
                                    </label>
                                    <div className="mt-2 relative">
                                        <input
                                            id="password"
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            style={{ paddingLeft: '1.5rem' }}
                                            className="block w-full rounded-lg border-0 bg-slate-950/50 py-3 px-6 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label htmlFor="code" className="block text-sm font-medium leading-6 text-slate-300">
                                    Authentication Code
                                </label>
                                <div className="mt-2 relative">
                                    <input
                                        id="code"
                                        type="text"
                                        required
                                        autoFocus
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                        className="block w-full rounded-lg border-0 bg-slate-950/50 py-2.5 px-3 text-white shadow-sm ring-1 ring-inset ring-slate-700 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-cyan-500 sm:text-sm sm:leading-6 text-center tracking-widest text-lg transition-all"
                                        placeholder="000000"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {step === 'credentials' ? 'Signing in...' : 'Verifying...'}
                                </span>
                            ) : (
                                step === 'credentials' ? 'Sign in' : 'Verify'
                            )}
                        </button>
                    </form>

                    {step === 'credentials' && (
                        <p className="mt-8 text-center text-sm text-slate-500">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
                                Create account
                            </Link>
                        </p>
                    )}

                    {step === '2fa' && (
                        <p className="mt-8 text-center text-sm">
                            <button
                                onClick={() => setStep('credentials')}
                                className="text-slate-500 hover:text-slate-400 transition-colors"
                            >
                                Back to login
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

