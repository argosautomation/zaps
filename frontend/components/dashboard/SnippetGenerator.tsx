'use client';

import { useState } from 'react';
import { Check, Copy, Terminal, Code2, Box } from 'lucide-react';

type Provider = 'openai' | 'deepseek' | 'anthropic' | 'gemini';
type Language = 'curl' | 'node' | 'python';

interface SnippetGeneratorProps {
    apiKey?: string;
}

const providers = [
    { id: 'openai', name: 'OpenAI', model: 'gpt-4o' },
    { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat' },
    { id: 'anthropic-sonnet', name: 'Anthropic (Sonnet)', model: 'claude-3-5-sonnet' },
    { id: 'anthropic-haiku', name: 'Anthropic (Haiku)', model: 'claude-3-haiku-20240307' },
    { id: 'gemini', name: 'Gemini', model: 'gemini-pro' },
] as const;

const languages = [
    { id: 'curl', name: 'cURL', icon: Terminal },
    { id: 'node', name: 'Node.js', icon: Code2 },
    { id: 'python', name: 'Python', icon: Box },
] as const;

export default function SnippetGenerator({ apiKey = 'gk_YOUR_ZAPS_KEY' }: SnippetGeneratorProps) {
    const [provider, setProvider] = useState<Provider>('openai');
    const [language, setLanguage] = useState<Language>('curl');
    const [copied, setCopied] = useState(false);

    const activeProvider = providers.find(p => p.id === provider) || providers[0];

    const generateCode = () => {
        const url = 'https://zaps.ai/v1/chat/completions';
        const model = activeProvider.model;

        switch (language) {
            case 'curl':
                return `curl -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "model": "${model}",
    "messages": [
      {
        "role": "user",
        "content": "Hello world!"
      }
    ]
  }'`;
            case 'node':
                return `const response = await fetch('${url}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey}'
  },
  body: JSON.stringify({
    model: '${model}',
    messages: [
      { role: 'user', content: 'Hello world!' }
    ]
  })
});

const data = await response.json();
console.log(data);`;
            case 'python':
                return `import requests

response = requests.post(
    "${url}",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer ${apiKey}"
    },
    json={
        "model": "${model}",
        "messages": [
            {"role": "user", "content": "Hello world!"}
        ]
    }
)

print(response.json())`;
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateCode());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {/* Controls */}
            <div className="border-b border-slate-800 p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-900/50">
                <div className="flex flex-wrap gap-2">
                    {providers.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setProvider(p.id as Provider)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${provider === p.id
                                ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                    {languages.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => setLanguage(l.id as Language)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${language === l.id
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <l.icon size={14} />
                            {l.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Code Display */}
            <div className="relative group">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleCopy}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>
                <div className="p-6 bg-slate-950 overflow-x-auto">
                    <pre className="font-mono text-sm leading-relaxed text-slate-300">
                        <code>{generateCode()}</code>
                    </pre>
                </div>
            </div>

            {/* Footer info */}
            <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
                <span>Model: <span className="text-cyan-400 font-mono">{activeProvider.model}</span></span>
                <span>Endpoint: <span className="text-slate-400 font-mono">/v1/chat/completions</span></span>
            </div>
        </div>
    );
}
