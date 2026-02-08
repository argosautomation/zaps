import SettingsForm from '@/components/dashboard/SettingsForm';

export default function SettingsPage() {
    return (
        <div className="pt-6 spacing-page-top">

            <div className="mb-12 spacing-header-mb">
                <h1 className="text-2xl font-bold leading-7 text-white sm:text-3xl">
                    Settings
                </h1>
                <p className="mt-4 text-sm text-slate-400">
                    Manage your account profile, security, and organization details.
                </p>
            </div>

            <SettingsForm />
        </div>
    );
}
