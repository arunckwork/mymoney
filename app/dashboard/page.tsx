'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import AppHeader from '@/components/AppHeader';
import TopExpensesChart from '@/components/TopExpensesChart';

type Account = { id: string; account_name: string; total_money: number; status: 'primary' | 'secondary' };

export default function UserDashboard() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  // Date filters
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const grandTotal = accounts.reduce((sum, acc) => sum + Number(acc.total_money), 0);
  const netBalance = totalIncome - totalExpense;

  const fetchAccounts = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('id, account_name, total_money, status')
      .eq('user_id', userId)
      .order('total_money', { ascending: false });

    if (!error && data) {
      setAccounts(data as Account[]);
    }
  }, [supabase]);

  const fetchSummaries = useCallback(async (userId: string, year: number, month: number) => {
    // Construct date range for the selected month
    const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
    // Get last day of month
    const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

    // Fetch Expenses
    const { data: expenses, error: expError } = await supabase
      .from('user_expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    if (!expError && expenses) {
      const sum = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
      setTotalExpense(sum);
    }

    // Fetch Incomes
    const { data: incomes, error: incError } = await supabase
      .from('user_incomes')
      .select('amount')
      .eq('user_id', userId)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    if (!incError && incomes) {
      const sum = incomes.reduce((acc, curr) => acc + Number(curr.amount), 0);
      setTotalIncome(sum);
    }
  }, [supabase]);

  useEffect(() => {
    const verifySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/');
        return;
      }

      setSessionUserId(session.user.id);
      setEmail(session.user.email ?? null);

      // Load accounts immediately as they don't depend on date filter
      fetchAccounts(session.user.id);
      setLoading(false);
    };

    verifySession();
  }, [router, supabase, fetchAccounts]);

  useEffect(() => {
    if (!sessionUserId) return;
    fetchSummaries(sessionUserId, selectedYear, selectedMonth);
  }, [sessionUserId, selectedYear, selectedMonth, fetchSummaries]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate last 5 years
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader pageTitle="Dashboard" userEmail={email} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header & Date Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
            <p className="text-gray-500 text-sm">Summary for {months[selectedMonth]} {selectedYear}</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="mt-2 text-3xl font-bold text-green-600">₹{totalIncome.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Total Expense</p>
            <p className="mt-2 text-3xl font-bold text-red-600">₹{totalExpense.toFixed(2)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm font-medium text-gray-500">Net Balance</p>
            <p className={`mt-2 text-3xl font-bold ${netBalance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
              ₹{netBalance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Charts and Accounts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Expenses Chart */}
          {sessionUserId && (
            <TopExpensesChart
              userId={sessionUserId}
              year={selectedYear}
              month={selectedMonth}
            />
          )}

          {/* Accounts Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-96 flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
              <h3 className="text-lg font-bold text-gray-900">Your Accounts</h3>
              <span className="text-sm font-medium text-gray-500">
                Total: <span className="text-gray-900">₹{grandTotal.toFixed(2)}</span>
              </span>
            </div>
            <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
              {accounts.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  No accounts found. Use &quot;Manage Accounts&quot; to add one.
                </div>
              ) : (
                accounts.map((acc) => (
                  <div key={acc.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-gray-900">{acc.account_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{acc.status}</p>
                    </div>
                    <p className="font-mono font-medium text-gray-900">₹{Number(acc.total_money).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>



      </main>
    </div>
  );
}
