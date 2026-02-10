'use client';

import useSWR from 'swr';
import { Activity, ShieldCheck, Key } from 'lucide-react';
import UsageChart from '@/components/dashboard/UsageChart';
import AuditLogTable from '@/components/dashboard/AuditLogTable';

// Fetcher helper
const fetcher = (url: string) => fetch(url, { headers: { 'Authorization': 'Bearer ' + getCookie('session') } }).then((res) => res.json());

function getCookie(name: string) {
    if (typeof document === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return '';
}

export default function DashboardOverview() {
    const { data: stats, error } = useSWR('/api/dashboard/stats', fetcher);

    const loading = !stats && !error;

    const statItems = [
        {
            name: 'Total Requests (Today)',
            value: loading ? '...' : (stats?.requests_today || 0).toLocaleString(),
            sub: 'Aggregated via Usage Logs',
            icon: Activity
        },
        {
            name: 'PII Protected',
            value: loading ? '...' : (stats?.pii_redacted || 0).toLocaleString(),
            sub: 'Sensitive entities redacted',
            icon: ShieldCheck
        },
        {
            name: 'Active API Keys',
            value: loading ? '...' : (stats?.active_keys || 0),
            sub: 'Manage in API Keys tab',
            icon: Key
        },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight mb-8">
                Dashboard Overview
            </h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 lg:grid-cols-3 mb-8">
                {statItems.map((item) => (
                    <div key={item.name} className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-cyan-500/10 rounded-lg">
                                <item.icon className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400">{item.name}</p>
                                <p className="text-2xl font-bold text-white mt-1">{item.value}</p>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800 relative z-10">
                            <p className="text-xs text-slate-500">{item.sub}</p>
                        </div>
                        {/* Background Glow Effect */}
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl z-0 pointer-events-none"></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Usage Chart (Spans 2 columns) */}
                <div className="lg:col-span-2">
                    <UsageChart data={stats?.usage_history || []} />
                </div>

                {/* Recent Audit Log (Spans 1 column, but simplified view) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-96 overflow-hidden flex flex-col">
                    <h3 className="text-base font-semibold leading-6 text-white mb-4">Quick Audit Log</h3>
                    <div className="flex-1 overflow-y-auto">
                        {/* Reusing AuditLogTable logic but simplified or just embedding part of it */}
                        <div className="border-l-2 border-slate-800 ml-2 space-y-6 pl-4 py-2">
                            <p className="text-xs text-slate-500 italic">View full logs in 'Audit Logs' tab.</p>
                            {/* We could fetch recent logs here too, but for overview keeping it clean */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
