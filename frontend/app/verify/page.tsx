'use client'

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function VerifyContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('')

    useEffect(() => {
        const token = searchParams.get('token')

        if (!token) {
            setStatus('error')
            setMessage('Invalid verification link')
            return
        }

        verifyEmail(token)
    }, [searchParams])

    const verifyEmail = async (token: string) => {
        try {
            const response = await fetch(`http://localhost:3000/auth/verify?token=${token}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed')
            }

            setStatus('success')
            setMessage(data.message)

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        } catch (err: any) {
            setStatus('error')
            setMessage(err.message || 'Verification failed')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
                {status === 'loading' && (
                    <>
                        <div className="animate-spin text-5xl mb-4">⚡</div>
                        <h2 className="text-2xl font-bold mb-2">Verifying Your Email</h2>
                        <p className="text-gray-400">Please wait...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="text-6xl mb-4">✅</div>
                        <h2 className="text-2xl font-bold mb-2 text-cyan-400">Email Verified!</h2>
                        <p className="text-gray-300 mb-4">{message}</p>
                        <p className="text-sm text-gray-400">Redirecting to login...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="text-6xl mb-4">❌</div>
                        <h2 className="text-2xl font-bold mb-2 text-red-400">Verification Failed</h2>
                        <p className="text-gray-300 mb-6">{message}</p>
                        <a
                            href="/signup"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                        >
                            Sign Up Again
                        </a>
                    </>
                )}
            </div>
        </div>
    )
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-slate-950 to-slate-900 text-white">Loading...</div>}>
            <VerifyContent />
        </Suspense>
    )
}
