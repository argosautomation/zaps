import APIKeyManager from '@/components/dashboard/APIKeyManager';

export default function APIKeysPage() {
    return (
        <div>
            <div className="mb-16 spacing-header-mb">
                <h1 className="text-2xl font-bold leading-tight text-white sm:truncate sm:text-3xl sm:tracking-tight">
                    API Keys
                </h1>
                <p className="mt-6 text-base leading-relaxed text-slate-400">
                    Create and manage API keys to access the Zaps.ai Gateway.
                </p>
            </div>

            <APIKeyManager />
        </div>
    );
}
