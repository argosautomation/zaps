'use client';

import { X, ShieldCheck, ShieldAlert, Copy } from 'lucide-react';

interface LogDetailViewerProps {
    log: any;
    onClose: () => void;
}

export default function LogDetailViewer({ log, onClose }: LogDetailViewerProps) {
    const isPIIRedacted = log.event_data?.redacted;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer */}
            <div className="relative w-full max-w-2xl bg-slate-900 h-full border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h3 className="text-lg font-semibold text-white">Request Detail</h3>
                        <p className="text-sm text-slate-500 font-mono">{log.id} • {new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Status Card */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</label>
                            <div className={`text-xl font-mono mt-1 ${log.event_data.status >= 400 ? 'text-red-400' : 'text-green-400'
                                }`}>
                                {log.event_data.status || 'N/A'}
                            </div>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Security Analysis</label>
                            <div className="mt-1 flex items-center gap-2">
                                {isPIIRedacted ? (
                                    <>
                                        <ShieldAlert className="text-amber-400" size={20} />
                                        <span className="text-amber-400 font-semibold">PII Detected</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="text-emerald-400" size={20} />
                                        <span className="text-emerald-400 font-semibold">Clean Request</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">Top-Level Metadata</h4>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                            <div>
                                <dt className="text-slate-500">Event Type</dt>
                                <dd className="text-white font-mono">{log.event_type}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Client IP</dt>
                                <dd className="text-white font-mono">{log.ip_address}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">User Agent</dt>
                                <dd className="text-slate-400 break-all">{log.user_agent || 'Unknown'}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">Latency</dt>
                                <dd className="text-white font-mono">{log.event_data.latency_ms}ms</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Full JSON Payload */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-semibold text-white">Full Event Payload</h4>
                            <button
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(log.event_data, null, 2))}
                                className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                            >
                                <Copy size={12} /> Copy JSON
                            </button>
                        </div>
                        <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 font-mono text-xs overflow-x-auto">
                            <pre className="text-slate-300">
                                {JSON.stringify(log.event_data, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                    >
                        Close Inspector
                    </button>
                </div>
            </div>
        </div>
    );
}
