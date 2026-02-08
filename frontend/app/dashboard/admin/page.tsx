'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Check, AlertTriangle } from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    created_at: string;
    monthly_quota: number;
    current_usage: number;
    stripe_customer_id: string;
}

export default function AdminDashboard() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newQuota, setNewQuota] = useState<number>(0);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const res = await fetch('/api/admin/tenants');
            if (res.status === 403) {
                setError('Access Denied: You are not a Super Admin.');
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch tenants');
            const data = await res.json();
            setTenants(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (t: Tenant) => {
        setEditingId(t.id);
        setNewQuota(t.monthly_quota);
    };

    const handleSave = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/tenants/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monthly_quota: newQuota }),
            });
            if (!res.ok) throw new Error('Failed to update');
            setEditingId(null);
            fetchTenants(); // Refresh
        } catch (err) {
            alert('Update failed');
        }
    };

    if (loading) return <div className="p-8 text-white">Loading Admin Dashboard...</div>;
    if (error) return (
        <div className="p-8">
            <div className="bg-red-900/50 border border-red-500 rounded p-4 text-red-200 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                {error}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin Dashboard</h1>
                    <p className="text-slate-400 mt-1">Manage tenants and manual quotas.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-950">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tenant</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Usage</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Quota</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stripe ID</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-slate-900 divide-y divide-slate-800">
                        {tenants.map((t) => (
                            <tr key={t.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                    {t.name}
                                    <div className="text-xs text-slate-500 font-normal">{new Date(t.created_at).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${t.current_usage > t.monthly_quota ? 'bg-red-500' : 'bg-cyan-500'}`}
                                                style={{ width: `${Math.min((t.current_usage / t.monthly_quota) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span>{t.current_usage}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                    {editingId === t.id ? (
                                        <input
                                            type="number"
                                            value={newQuota}
                                            onChange={(e) => setNewQuota(parseInt(e.target.value))}
                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 w-24 text-white text-right focus:ring-1 focus:ring-cyan-500 outline-none"
                                        />
                                    ) : (
                                        t.monthly_quota.toLocaleString()
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                                    {t.stripe_customer_id || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {editingId === t.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleSave(t.id)} className="text-cyan-400 hover:text-cyan-300">Save</button>
                                            <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300">Cancel</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleEdit(t)} className="text-cyan-400 hover:text-cyan-300">Edit Quota</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
