'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Zap, CheckCircle2, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface BillingStats {
    monthly_usage: number;
    monthly_quota: number;
    plan_name?: string;
}

export default function BillingPage() {
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-slate-400 p-8">Loading billing info...</div>;

    const usage = stats?.monthly_usage || 0;
    const quota = stats?.monthly_quota || 1000;
    const percentage = Math.min((usage / quota) * 100, 100);

    // Infer plan from quota for now (since we don't have distinct plan column yet)
    let planName = 'Free Plan';
    if (quota >= 1000000) planName = 'Enterprise';
    else if (quota >= 50000) planName = 'Pro Plan';

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Usage</h1>
                <p className="text-slate-400 mt-1">Manage your subscription and view usage limits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Plan Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-950/50 rounded-lg border border-cyan-900/50">
                                <CreditCard className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Current Plan</h3>
                                <div className="text-cyan-400 text-sm font-semibold">{planName}</div>
                            </div>
                        </div>
                        {planName === 'Free Plan' && (
                            <button disabled className="px-4 py-2 bg-slate-800 text-slate-500 text-sm font-medium rounded-lg cursor-not-allowed border border-slate-700">
                                Upgrade Coming Soon
                            </button>
                        )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800/50">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Active Subscription</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <span>Next billing date: 1st of next month</span>
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
