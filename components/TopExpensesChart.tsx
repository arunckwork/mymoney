'use client';

import { useEffect, useState, useMemo } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

type TopExpensesChartProps = {
    userId: string;
    year: number;
    month: number;
};

type ExpenseData = {
    amount: number;
    category: {
        category_name: string;
    };
};

type ChartData = {
    name: string;
    amount: number;
    color: string;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TopExpensesChart({ userId, year, month }: TopExpensesChartProps) {
    const supabase = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    );

    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
            const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

            const { data: expenses, error } = await supabase
                .from('user_expenses')
                .select(`
          amount,
          category:category_id (
            category_name
          )
        `)
                .eq('user_id', userId)
                .gte('entry_date', startDate)
                .lte('entry_date', endDate);

            if (error) {
                console.error('Error fetching top expenses:', error);
                setLoading(false);
                return;
            }

            if (expenses) {
                // Aggregate by category
                const categoryMap = new Map<string, number>();

                (expenses as any[]).forEach((item) => {
                    // Type assertion needed because of joined query structure
                    const expense = item as unknown as { amount: number, category: { category_name: string } | null };

                    const categoryName = expense.category?.category_name || 'Uncategorized';
                    const amount = Number(expense.amount);

                    categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + amount);
                });

                // Convert to array and sort
                const sortedData = Array.from(categoryMap.entries())
                    .map(([name, amount], index) => ({
                        name,
                        amount,
                        color: COLORS[index % COLORS.length],
                    }))
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5); // Take top 5

                setData(sortedData);
            }
            setLoading(false);
        };

        if (userId) {
            fetchData();
        }
    }, [supabase, userId, year, month]);

    if (loading) {
        return (
            <div className="h-64 flex items-center justify-center bg-white rounded-xl border border-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 text-gray-400">
                <p>No expenses found for this month</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 Expenses</h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                        <XAxis type="number" hide />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={100}
                            tick={{ fill: '#6b7280', fontSize: 12 }}
                            interval={0}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Amount']}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={32}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
