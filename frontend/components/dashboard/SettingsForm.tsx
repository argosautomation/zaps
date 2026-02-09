'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Building, ShieldCheck, Mail, Save, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function SettingsForm() {
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [profile, setProfile] = useState({
        first_name: '',
        last_name: '',
        email: '',
    });

    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactor: false,
    });

    const [org, setOrg] = useState({
        name: '',
        tenantId: '',
        subscription: '',
    });

    // 2FA Modal State
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [twoFASecret, setTwoFASecret] = useState('');
    const [twoFAURL, setTwoFAURL] = useState('');
    const [twoFACode, setTwoFACode] = useState('');
    const [is2FALoading, setIs2FALoading] = useState(false);

    // Fetch initial data
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Fetch Profile
                const profileRes = await fetch('/api/dashboard/profile', {
                    credentials: 'include',
                });
                if (profileRes.ok) {
                    const data = await profileRes.json();
                    setProfile({
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        email: data.email,
                    });
                }

                // Fetch Organization
                const orgRes = await fetch('/api/dashboard/organization', {
                    credentials: 'include',
                });
                if (orgRes.ok) {
                    const data = await orgRes.json();
                    setOrg({
                        name: data.name,
                        tenantId: data.id,
                        subscription: data.subscription,
                    });
                }

                // Fetch Security Status
                const secRes = await fetch('/api/dashboard/security/status', {
                    credentials: 'include',
                });
                if (secRes.ok) {
                    const data = await secRes.json();
                    setSecurity(prev => ({ ...prev, twoFactor: data.two_factor_enabled }));
                }
            } catch {
                // Silent fail
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let response;
            if (activeTab === 'profile') {
                response = await fetch('/api/dashboard/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        first_name: profile.first_name,
                        last_name: profile.last_name,
                    }),
                });
            } else if (activeTab === 'organization') {
                response = await fetch('/api/dashboard/organization', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: org.name,
                    }),
                });
            } else if (activeTab === 'security') {
                if (security.newPassword !== security.confirmPassword) {
                    setMessage({ type: 'error', text: 'New passwords do not match' });
                    setIsLoading(false);
                    return;
                }
                response = await fetch('/api/dashboard/security/password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        current_password: security.currentPassword,
                        new_password: security.newPassword,
                    }),
                });
            }

            if (response && response.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });

                // Clear password fields on success
                if (activeTab === 'security') {
                    setSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
                }
            } else {
                const data = await response?.json();
                setMessage({ type: 'error', text: data?.error || 'Failed to save settings' });
            }
        } catch {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle2FA = async () => {
        if (security.twoFactor) {
            // Disable 2FA
            if (confirm("Are you sure you want to disable Two-Factor Authentication?")) {
                try {
                    const res = await fetch('/api/dashboard/security/2fa/disable', {
                        method: 'POST',
                        credentials: 'include',
                    });
                    if (res.ok) {
                        setSecurity(prev => ({ ...prev, twoFactor: false }));
                        setMessage({ type: 'success', text: 'Two-Factor Authentication disabled' });
                    } else {
                        setMessage({ type: 'error', text: 'Failed to disable 2FA' });
                    }
                } catch {
                    setMessage({ type: 'error', text: 'Error disabling 2FA' });
                }
            }
        } else {
            // Enable 2FA - Generate Secret
            setIs2FALoading(true);
            try {
                const res = await fetch('/api/dashboard/security/2fa/generate', {
                    method: 'POST',
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    setTwoFASecret(data.secret);
                    setTwoFAURL(data.qr_code);
                    setShow2FAModal(true);
                    setTwoFACode('');
                } else {
                    setMessage({ type: 'error', text: 'Failed to generate 2FA secret' });
                }
            } catch {
                setMessage({ type: 'error', text: 'Error generating 2FA' });
            } finally {
                setIs2FALoading(false);
            }
        }
    };

    const handleVerify2FA = async () => {
        setIs2FALoading(true);
        try {
            const res = await fetch('/api/dashboard/security/2fa/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ secret: twoFASecret, code: twoFACode }),
            });

            if (res.ok) {
                setSecurity(prev => ({ ...prev, twoFactor: true }));
                setShow2FAModal(false);
                setMessage({ type: 'success', text: 'Two-Factor Authentication enabled successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Invalid verification code' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Error enabling 2FA' });
        } finally {
            setIs2FALoading(false);
        }
    }

    return (
        <div className="space-y-10 spacing-form-gap">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 gap-8 spacing-tabs-gap">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profile'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    <User size={18} />
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`pb-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'security'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    <Lock size={18} />
                    Security
                </button>
                <button
                    onClick={() => setActiveTab('organization')}
                    className={`pb-4 px-6 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'organization'
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                >
                    <Building size={18} />
                    Organization
                </button>
            </div>

            {/* Notification Message */}
            {message.text && (
                <div className={`p-4 rounded-lg text-sm border ${message.type === 'success'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Content Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                <form onSubmit={handleSave}>
                    {activeTab === 'profile' && (
                        <div className="max-w-4xl flex flex-col gap-10">
                            <div className="border-b border-slate-800 pb-5">
                                <h3 className="text-xl font-semibold text-white mb-1">Public Profile</h3>
                                <p className="text-sm text-slate-400">Manage how you appear to others on the platform.</p>
                            </div>

                            <div className="flex flex-col gap-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-3">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.first_name}
                                            onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-3">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.last_name}
                                            onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 text-slate-500" size={18} />
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg pl-12 pr-4 py-3 text-slate-400 cursor-not-allowed spacing-input-pl"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="max-w-4xl flex flex-col gap-10">
                            <div className="border-b border-slate-800 pb-5">
                                <h3 className="text-xl font-semibold text-white mb-1">Security Settings</h3>
                                <p className="text-sm text-slate-400">Update your password and secure your account.</p>
                            </div>

                            <div className="flex flex-col gap-8">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        value={security.currentPassword}
                                        onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={security.newPassword}
                                        onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={security.confirmPassword}
                                        onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-800 mt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">Two-Factor Authentication</div>
                                                <div className="text-sm text-slate-400">Add an extra layer of security to your account</div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleToggle2FA}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${security.twoFactor ? 'bg-cyan-500' : 'bg-slate-700'
                                                }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${security.twoFactor ? 'translate-x-6' : 'translate-x-1'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {
                        activeTab === 'organization' && (
                            <div className="max-w-4xl flex flex-col gap-10">
                                <div className="border-b border-slate-800 pb-5">
                                    <h3 className="text-xl font-semibold text-white mb-1">Organization Details</h3>
                                    <p className="text-sm text-slate-400">Manage your team and billing information.</p>
                                </div>

                                <div className="flex flex-col gap-8">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-3">
                                            Organization Name
                                        </label>
                                        <input
                                            type="text"
                                            value={org.name}
                                            onChange={(e) => setOrg({ ...org, name: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-3">
                                            Tenant ID
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={org.tenantId}
                                                readOnly
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-400 font-mono text-sm cursor-text focus:outline-none"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <div className="absolute right-3 top-2.5 text-xs text-slate-500">
                                                Read-only
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-3">
                                            Subscription Plan
                                        </label>
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                                            {org.subscription || 'Free Tier'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    <div className="pt-6 border-t border-slate-800 mt-6 flex justify-start">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 px-8 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed spacing-button-padding"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* 2FA Modal */}
            {show2FAModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-semibold text-white">Setup Two-Factor Authentication</h3>
                            <button onClick={() => setShow2FAModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-6">
                            <div className="bg-white p-4 rounded-lg">
                                <QRCodeSVG value={twoFAURL} size={200} />
                            </div>

                            <div className="text-center space-y-2">
                                <p className="text-sm text-slate-400">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                                <p className="text-xs text-slate-500 font-mono select-all bg-slate-950 p-2 rounded break-all">{twoFASecret}</p>
                            </div>

                            <div className="w-full space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Enter 6-digit code
                                </label>
                                <input
                                    type="text"
                                    value={twoFACode}
                                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white text-center tracking-widest text-lg focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>

                            <button
                                onClick={handleVerify2FA}
                                disabled={twoFACode.length !== 6 || is2FALoading}
                                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {is2FALoading ? 'Verifying...' : 'Enable 2FA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
