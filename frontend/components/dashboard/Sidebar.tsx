'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
    BarChart3,
    Key,
    ShieldAlert,
    Settings,
    LogOut,
    Zap,
    Terminal,
    CreditCard,
    Shield,
    Book,
    SearchCode
} from 'lucide-react';

const navigation = [
    { name: 'Overview', href: '/dashboard', icon: BarChart3 },
    { name: 'Playground', href: '/dashboard/playground', icon: Terminal },
    { name: 'Inspector', href: '/dashboard/inspector', icon: SearchCode },
    { name: 'Providers', href: '/dashboard/providers', icon: Zap },
    { name: 'API Keys', href: '/dashboard/keys', icon: Key },
    { name: 'Audit Logs', href: '/dashboard/logs', icon: ShieldAlert },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Docs', href: '/dashboard/docs', icon: Book },
    { name: 'Admin', href: '/dashboard/admin', icon: Shield },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

// Fetcher helper - Browser automatically handles HttpOnly cookies
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Sidebar() {
    const pathname = usePathname();
    const { data: user } = useSWR('/api/dashboard/profile', fetcher);

    const filteredNav = navigation.filter(item => {
        if (item.name === 'Admin' && !user?.is_super_admin) return false;
        return true;
    });

    return (
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 border-r border-slate-800 px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
                        <img src="/logo-transparent.png" alt="Zaps Logo" className="h-8 w-8 object-contain" />
                        <span>Zaps<span className="text-cyan-400">.ai</span></span>
                    </Link>
                </div>
                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <ul role="list" className="-mx-2 space-y-1">
                                {filteredNav.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${isActive
                                                        ? 'bg-slate-800 text-cyan-400'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }
                        `}
                                            >
                                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                        <li className="mt-auto">
                            <button
                                onClick={async () => {
                                    try {
                                        await fetch('/auth/logout', { method: 'POST' });
                                        window.location.href = '/login';
                                    } catch (e) {
                                        console.error('Logout failed', e);
                                        window.location.href = '/login';
                                    }
                                }}
                                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-slate-400 hover:bg-slate-800 hover:text-white w-full text-left"
                            >
                                <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                                Sign out
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
