'use client';
import { useState } from 'react';

interface VisualizerProps {
    original: string;
    redacted: string | null;
    response: string | null;
    isLoading: boolean;
}

const SyntaxHighlight = ({ code }: { code: string | null }) => {
    if (!code) return <span className="text-slate-600 italic">// Waiting for data...</span>;

    // Simple JSON highlighting
    try {
        const tokens = code.split(/(".*?"|[:{},[\]]|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?)/g).filter(Boolean);

        return (
            <code className="font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words block">
                {tokens.map((token, i) => {
                    if (token.includes('<SECRET:')) {
                        return <span key={i} className="text-emerald-400 font-bold bg-emerald-400/10 px-1 rounded mx-0.5">{token}</span>
                    }
                    if (token.startsWith('"')) {
                        if (token.endsWith('":')) { // key
                            return <span key={i} className="text-sky-300">{token}</span>
                        }
                        // string value
                        return <span key={i} className="text-orange-200">{token}</span>
                    }
                    if (['true', 'false', 'null'].includes(token)) return <span key={i} className="text-pink-400">{token}</span>;
                    if (/^-?\d/.test(token)) return <span key={i} className="text-violet-400">{token}</span>;
                    return <span key={i} className="text-slate-400">{token}</span>;
                })}
            </code>
        )
    } catch (e) {
        return <pre className="whitespace-pre-wrap text-slate-300">{code}</pre>;
    }
}

export default function RedactionVisualizer({ original, redacted, response, isLoading }: VisualizerProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full font-mono">
            {/* 1. Original Request */}
            <div className="flex flex-col gap-3 h-full group">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                    <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                    Input Prompt
                </div>
                <div className="bg-[#0B1120] rounded-xl p-5 border border-slate-800 flex-1 overflow-auto shadow-inner group-hover:border-slate-700 transition-colors">
                    <pre className="whitespace-pre-wrap break-words text-slate-300 text-sm">{original || '// Enter your prompt below...'}</pre>
                </div>
            </div>

            {/* 2. Redacted Request (The Magic) */}
            <div className="flex flex-col gap-3 h-full relative group">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-500 uppercase tracking-widest pl-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                    Zaps Secure Gateway
                </div>

                {/* Connector Lines */}
                <div className="absolute top-1/2 -left-4 w-4 h-[1px] bg-gradient-to-r from-slate-800 to-cyan-900 hidden md:block"></div>
                <div className="absolute top-1/2 -right-4 w-4 h-[1px] bg-gradient-to-r from-cyan-900 to-slate-800 hidden md:block"></div>

                <div className="bg-[#0B1120] rounded-xl p-5 border border-cyan-500/20 flex-1 overflow-auto shadow-[0_0_30px_rgba(8,145,178,0.05)] relative group-hover:border-cyan-500/40 transition-colors">
                    {isLoading && !redacted ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1120]/90 z-10 backdrop-blur-sm gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                            <div className="text-cyan-400/70 text-xs tracking-widest animate-pulse">REDACTING PII...</div>
                        </div>
                    ) : null}

                    <SyntaxHighlight code={redacted} />
                </div>
            </div>

            {/* 3. Rehydrated Response */}
            <div className="flex flex-col gap-3 h-full group">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest pl-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Final Response
                </div>
                <div className="bg-[#0B1120] rounded-xl p-5 border border-slate-800 flex-1 overflow-auto shadow-inner group-hover:border-slate-700 transition-colors">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-600 animate-pulse text-sm">
                            Waiting for model...
                        </div>
                    ) : (
                        <pre className="whitespace-pre-wrap break-words text-slate-300 text-sm leading-relaxed">{response || '// Response will appear here'}</pre>
                    )}
                </div>
            </div>
        </div>
    );
}
