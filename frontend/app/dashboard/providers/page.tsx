import ProviderList from '@/components/dashboard/ProviderList';

export default function ProvidersPage() {
    return (
        <div className="max-w-4xl pt-20">
            <div className="mb-8">
                <h1 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
                    LLM Providers
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Configure your upstream AI provider keys. These are encrypted and used securely by the Gateway when you make requests.
                </p>
            </div>

            <div className="mt-12">
                <ProviderList />
            </div>
        </div>
    );
}
