"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ActivateContent() {
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'checking' | 'submitting' | 'success' | 'error'>('checking');
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();

    // Auto-fill from URL if present (e.g. ?user_code=...)
    useEffect(() => {
        const urlCode = searchParams.get('user_code');
        if (urlCode) {
            setCode(urlCode);
        }
    }, [searchParams]);

    // Check Session on Mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Try fetching a protected endpoint to verify cookie
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/dashboard/profile`, {
                    credentials: 'include'
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        const currentPath = window.location.pathname + window.location.search;
                        router.push(`/login?next=${encodeURIComponent(currentPath)}`);
                        return;
                    }
                    throw new Error('Session check failed');
                }
                setStatus('idle');
            } catch (err) {
                console.error(err);
                // On network error or other, we might still let them try to submit or redirect.
                // Redirecting to login is safest if we can't reach API.
                setStatus('idle');
            }
        };
        checkSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        setErrorMsg('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/dashboard/device/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Important for session cookie
                body: JSON.stringify({ user_code: code }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to approve device');
            }

            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setErrorMsg(err.message);
        }
    }

    if (status === 'checking') return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                        Connect Device
                    </h1>
                    <p className="text-slate-400">
                        Authorize a new device to access your Zaps account.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {status === 'success' ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">✅</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Device Connected!</h3>
                            <p className="text-slate-400 mb-6">
                                You can now close this window and return to your device.
                            </p>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-cyan-400 hover:text-cyan-300 font-medium text-sm transition-colors"
                            >
                                Go to Dashboard &rarr;
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                                    Device Code
                                </label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="ABCD-1234"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-2xl tracking-widest font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    maxLength={9}
                                    autoFocus
                                />
                            </div>

                            {errorMsg && (
                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={code.length < 8 || status === 'submitting'}
                                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                                >
                                    {status === 'submitting' ? 'Verifying...' : 'Authorize Device'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard')}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>

                            <p className="mt-6 text-xs text-center text-slate-500">
                                Verify the code matches what connects on your device.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ActivatePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
            <ActivateContent />
        </Suspense>
    );
}
