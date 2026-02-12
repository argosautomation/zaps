'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function AuthCliContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const redirectUri = searchParams.get('redirect_uri');

        // Validate Redirect URI (Localhost Only for security)
        if (!redirectUri) {
            setStatus('error');
            setErrorMsg('Missing redirect_uri parameter.');
            return;
        }

        try {
            const url = new URL(redirectUri);
            if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
                setStatus('error');
                setErrorMsg('Invalid redirect URI. Only localhost is allowed for CLI auth.');
                return;
            }
        } catch (e) {
            setStatus('error');
            setErrorMsg('Invalid redirect URI format.');
            return;
        }

        // Generate Key
        const generateKey = async () => {
            try {
                // 1. Create Key
                const res = await fetch('/api/dashboard/keys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: `Zaps CLI (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`
                    }),
                });

                if (res.status === 401) {
                    // Not logged in, redirect to login
                    // We encode the current URL as the 'next' parameter so they come back here
                    const currentUrl = encodeURIComponent(window.location.href);
                    router.push(`/login?next=${currentUrl}`);
                    return;
                }

                if (!res.ok) {
                    throw new Error('Failed to generate API Key');
                }

                const data = await res.json();
                const newKey = data.key;

                // 2. Redirect back to CLI
                setStatus('success');

                // Small delay to show success UI before redirect
                setTimeout(() => {
                    const callbackUrl = new URL(redirectUri);
                    callbackUrl.searchParams.set('key', newKey);
                    window.location.href = callbackUrl.toString();
                }, 1500);

            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setErrorMsg(err.message || 'An unexpected error occurred.');
            }
        };

        generateKey();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <Loader2 size={48} className="text-cyan-500 animate-spin mb-4" />
                        <h1 className="text-xl font-semibold text-white mb-2">Authorizing Zaps CLI</h1>
                        <p className="text-slate-400">Please wait while we generate your credentials...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <div className="bg-green-500/20 p-3 rounded-full mb-4">
                            <CheckCircle size={48} className="text-green-500" />
                        </div>
                        <h1 className="text-xl font-semibold text-white mb-2">Authorization Successful!</h1>
                        <p className="text-slate-400">You can close this tab and return to your terminal.</p>
                        <p className="text-xs text-slate-500 mt-4">Redirecting you to local app...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <div className="bg-red-500/20 p-3 rounded-full mb-4">
                            <XCircle size={48} className="text-red-500" />
                        </div>
                        <h1 className="text-xl font-semibold text-white mb-2">Authorization Failed</h1>
                        <p className="text-red-400 mb-4">{errorMsg}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 text-slate-600 text-xs">
                &copy; 2026 Zaps.ai • Secure CLI Authorization
            </div>
        </div>
    );
}

export default function AuthCliPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-slate-600" /></div>}>
            <AuthCliContent />
        </Suspense>
    );
}
