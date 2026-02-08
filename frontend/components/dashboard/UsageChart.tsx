'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const data = [
    { name: '00:00', requests: 400 },
    { name: '04:00', requests: 300 },
    { name: '08:00', requests: 1200 },
    { name: '12:00', requests: 2400 },
    { name: '16:00', requests: 1800 },
    { name: '20:00', requests: 1400 },
    { name: '24:00', requests: 900 },
];

export default function UsageChart() {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-96">
            <h3 className="text-base font-semibold leading-6 text-white mb-6">Request Volume (24h)</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            itemStyle={{ color: '#22d3ee' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="requests"
                            stroke="#06b6d4"
                            fillOpacity={1}
                            fill="url(#colorRequests)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
