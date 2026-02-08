'use client';
import Sidebar from '@/components/dashboard/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/dashboard/profile'); // Proxy handles port
                if (!res.ok) {
                    throw new Error('Unauthorized');
                }
                setAuthorized(true);
            } catch {
                router.push('/login');
            }
        };
        checkAuth();
    }, [router]);

    if (!authorized) {
        return null; // Or a loading spinner
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <Sidebar />
            <div className="dashboard-content lg:pl-72">
                <main className="py-10">
                    <div className="dashboard-inner px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
