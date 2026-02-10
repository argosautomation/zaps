'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
    Shield,
    Clock,
    AlertTriangle,
    FileText,
    ChevronLeft,
    ChevronRight,
    Search,
    Eye
} from 'lucide-react';
import LogDetailViewer from './LogDetailViewer';

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

export default function LogExplorer() {
    const [page, setPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const { data: response, error } = useSWR<AuditLogResponse>(`/api/dashboard/logs?page=${page}&limit=20`, fetcher);

    const logs = response?.data || [];
    const isLoading = !response && !error;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Shield className="text-cyan-400" />
                    Audit Log Explorer
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="flex items-center px-4 text-slate-400 font-mono">
                        Page {page}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={logs.length < 20 || isLoading}
                        className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white disabled:opacity-50"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Event</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Client IP</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    Loading flight recorder data...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    No logs found for this period.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${log.event_type === 'PROXY_REQUEST'
                                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                            : 'bg-slate-800 text-slate-300 border-slate-700'
                                            }`}>
                                            {log.event_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">
                                        {log.event_type === 'PROXY_REQUEST' && (
                                            <div className="flex gap-2 text-xs">
                                                <span className="font-mono text-slate-500">
                                                    {log.event_data.provider}/{log.event_data.model}
                                                </span>
                                                {log.event_data.redacted && (
                                                    <span className="text-amber-400 flex items-center gap-1">
                                                        <Shield size={10} />
                                                        PII Redacted ({log.event_data.redact_count})
                                                    </span>
                                                )}
                                                <span className={`${log.event_data.status >= 400 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {log.event_data.status}
                                                </span>
                                            </div>
                                        )}
                                        {log.event_type !== 'PROXY_REQUEST' && (
                                            <span className="text-slate-500 text-xs truncate max-w-xs block">
                                                {JSON.stringify(log.event_data)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                        {log.ip_address}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="text-cyan-400 hover:text-cyan-300 transition-colors p-1 rounded hover:bg-cyan-500/10"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedLog && (
                <LogDetailViewer
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
}
