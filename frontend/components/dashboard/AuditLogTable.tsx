'use client';

import useSWR from 'swr';
import { Shield, Clock, AlertTriangle, FileText } from 'lucide-react';

// Fetcher helper
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Helper not needed for HttpOnly cookies
// function getCookie...

interface AuditLog {
    id: number;
    event_type: string;
    event_data: any;
    created_at: string;
    ip_address?: string;
}

interface AuditLogResponse {
    data: AuditLog[];
    page: number;
    limit: number;
}

export default function AuditLogTable() {
    const { data: response, error } = useSWR<AuditLogResponse>('/api/dashboard/logs?limit=5', fetcher);

    // For quick view, we just want the list
    const logs = response?.data;

    if (error) return <div className="text-red-400">Failed to load audit logs</div>;
    if (!logs) return <div className="text-slate-500">Loading logs...</div>;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-slate-200 font-medium flex items-center gap-2">
                    <Shield size={18} className="text-cyan-400" />
                    Security & Activity Logs
                </h3>
                <a
                    href="/api/dashboard/reports/export"
                    target="_blank"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                >
                    <FileText size={14} />
                    Export CSV
                </a>
            </div>

            <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-950">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Event</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">IP Address</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {logs.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                                No audit logs found yet.
                            </td>
                        </tr>
                    ) : (
                        logs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center text-sm text-white font-medium">
                                        <span className="bg-slate-800 px-2 py-1 rounded text-xs border border-slate-700 font-mono text-cyan-400">
                                            {log.event_type}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                                    <div className="max-w-xs truncate" title={JSON.stringify(log.event_data)}>
                                        {JSON.stringify(log.event_data)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                    {log.ip_address || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
