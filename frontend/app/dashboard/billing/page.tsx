'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Zap, CheckCircle2, TrendingUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BillingStats {
    monthly_usage: number;
    monthly_quota: number;
    subscription_tier?: string;
}

export default function BillingPage() {
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        })
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handlePortal = async () => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else alert('Failed to open portal');
        } catch (e) {
            console.error(e);
            alert('Error opening portal');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="text-slate-400 p-8">Loading billing info...</div>;

    const usage = stats?.monthly_usage || 0;
    const quota = stats?.monthly_quota || 1000;
    const percentage = Math.min((usage / quota) * 100, 100);

    // Infer plan from quota/tier
    let planName = 'Free Plan';
    let isPaid = false;

    // Check explicit tier first, then fallback to quota
    if (stats?.subscription_tier === 'enterprise' || quota >= 1000000) {
        planName = 'Enterprise';
        isPaid = true;
    } else if (stats?.subscription_tier === 'pro' || quota >= 250000) {
        planName = 'Pro Plan';
        isPaid = true;
    } else if (stats?.subscription_tier === 'starter' || quota >= 50000) {
        planName = 'Starter Plan';
        isPaid = true;
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Usage</h1>
                <p className="text-slate-400 mt-1">Manage your subscription and view usage limits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Plan Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-900/50">
                                <CreditCard className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Current Plan</h3>
                                <div className="text-cyan-400 text-sm font-semibold">{planName}</div>
                            </div>
                        </div>

                        {isPaid ? (
                            <button
                                onClick={handlePortal}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
                            >
                                {actionLoading ? 'Loading...' : 'Manage'}
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        ) : (
                            <Link
                                href="/pricing"
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-cyan-900/20"
                            >
                                View Plans
                            </Link>
                        )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800/50 relative z-10">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Active Subscription</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <span>Next billing date: {isPaid ? 'Auto-renew' : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Usage Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-950/50 rounded-lg border border-purple-900/50">
                            <Zap className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Monthly Usage</h3>
                            <div className="text-slate-400 text-sm">Resets on the 1st</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-300">{usage.toLocaleString()} requests</span>
                            <span className="text-slate-400">Limit: {quota.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${percentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 pt-1">
                            {percentage.toFixed(1)}% of your monthly quota used.
                        </p>
                    </div>
                </div>
            </div>

            {/* Billing History Placeholder */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h3 className="text-white font-medium">Billing History</h3>
                </div>
                <div className="p-8 text-center text-slate-500">
                    No invoices found yet.
                </div>
            </div>
        </div>
    );
}
