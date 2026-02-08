'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        orgName: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await fetch('http://localhost:3000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed')
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-slate-950 to-slate-900">
                <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 border border-gray-700">
                    <div className="text-center">
                        <div className="text-6xl mb-4">✉️</div>
                        <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
                        <p className="text-gray-300 mb-6">
                            We've sent a verification link to <strong className="text-cyan-400">{formData.email}</strong>
                        </p>
                        <p className="text-sm text-gray-400">
                            Click the link in the email to activate your account and start using Zaps.ai
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <span className="text-5xl">⚡</span>
                    <h1 className="text-3xl font-bold mt-4 mb-2">Create Your Account</h1>
                    <p className="text-gray-400">Start protecting your PII in AI calls</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:border-cyan-400 focus:outline-none text-white"
                            placeholder="you@company.com"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <input
                            type="password"
                            required
                            minLength={12}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:border-cyan-400 focus:outline-none text-white"
                            placeholder="Minimum 12 characters"
                        />
                        <p className="text-xs text-gray-400 mt-1">Use a strong password with at least 12 characters</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Organization Name (Optional)</label>
                        <input
                            type="text"
                            value={formData.orgName}
                            onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:border-cyan-400 focus:outline-none text-white"
                            placeholder="Acme Inc"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all lightning-glow"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <p className="text-center text-sm text-gray-400 mt-6">
                        Already have an account?{' '}
                        <a href="/login" className="text-cyan-400 hover:underline">
                            Sign in
                        </a>
                    </p>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                    By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    )
}
