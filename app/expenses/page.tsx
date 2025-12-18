'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import AppHeader from '@/components/AppHeader';

type Account = { id: string; account_name: string; total_money: number; status: 'primary' | 'secondary' };
type Category = { id: string; category_name: string; status: 'active' | 'inactive' };
type Expense = {
  id: string;
  amount: number;
  entry_date: string;
  note: string | null;
  account_id: string;
  category_id: string;
  user_accounts: { account_name: string } | { account_name: string }[];
  user_income_expense_categories: { category_name: string } | { category_name: string }[];
};

export default function ExpensesPage() {
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  // Filters
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Add form
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [entryDateInput, setEntryDateInput] = useState(today);
  const [accountInput, setAccountInput] = useState<string>('');
  const [categoryInput, setCategoryInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/');
        return;
      }

      setSessionUserId(session.user.id);
      setEmail(session.user.email ?? null);
      await Promise.all([fetchAccounts(session.user.id), fetchCategories(session.user.id)]);
      setLoading(false);
    };

    load();
  }, [router, supabase]);



  const fetchAccounts = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('id, account_name, total_money, status')
      .eq('user_id', userId)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    setAccounts(data as Account[]);

    const primary = (data as Account[]).find((a) => a.status === 'primary') ?? (data as Account[])[0];
    if (primary && !accountInput) {
      setAccountInput(primary.id);
    }
  };

  const fetchCategories = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_income_expense_categories')
      .select('id, category_name, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('category_type', 'expense')
      .order('category_name', { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    setCategories(data as Category[]);
    if (!categoryInput && data && data.length > 0) {
      setCategoryInput(data[0].id);
    }
  };

  const fetchExpenses = useCallback(async (userId: string) => {
    setError('');
    const query = supabase
      .from('user_expenses')
      .select(
        `
          id,
          amount,
          entry_date,
          note,
          account_id,
          category_id,
          user_accounts ( account_name ),
          user_income_expense_categories ( category_name )
        `
      )
      .eq('user_id', userId)
      .gte('entry_date', fromDate)
      .lte('entry_date', toDate)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (accountFilter !== 'all') {
      query.eq('account_id', accountFilter);
    }
    if (categoryFilter !== 'all') {
      query.eq('category_id', categoryFilter);
    }

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      return;
    }
    setExpenses(data as Expense[]);
  }, [supabase, fromDate, toDate, accountFilter, categoryFilter]);

  useEffect(() => {
    if (!sessionUserId) return;
    fetchExpenses(sessionUserId);
  }, [sessionUserId, fetchExpenses]);

  const resetForm = () => {
    setAmountInput('');
    setEntryDateInput(today);
    const primary = accounts.find((a) => a.status === 'primary') ?? accounts[0];
    if (primary) setAccountInput(primary.id);
    if (categories[0]) setCategoryInput(categories[0].id);
    setNoteInput('');
  };

  const closeDrawer = () => {
    resetForm();
    setDrawerOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUserId) return;
    setSaving(true);
    setError('');

    const { error } = await supabase.from('user_expenses').insert([
      {
        user_id: sessionUserId,
        account_id: accountInput,
        category_id: categoryInput,
        amount: Number(amountInput || 0),
        entry_date: entryDateInput,
        note: noteInput.trim() || null,
      },
    ]);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    closeDrawer();
    fetchExpenses(sessionUserId);
    fetchAccounts(sessionUserId); // refresh balances
  };

  const handleDelete = async (expenseId: string) => {
    if (!sessionUserId) return;
    setSaving(true);
    setError('');
    const { error } = await supabase
      .from('user_expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', sessionUserId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    fetchExpenses(sessionUserId);
    fetchAccounts(sessionUserId); // refresh balances after trigger restore
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader pageTitle="Expenses" userEmail={email} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Account</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} {a.status === 'primary' ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2 flex items-end justify-end gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Expense</p>
                  <p className="text-2xl font-semibold text-gray-900">₹{totalExpense.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => sessionUserId && fetchExpenses(sessionUserId)}
                  className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setDrawerOpen(true);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-lg font-bold hover:bg-green-700"
                  aria-label="Add expense"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </section>

        <section className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-600">No expenses for this period.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1">
                    <p className="text-base font-semibold text-gray-900">
                      ₹{Number(exp.amount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-700">
                      {(Array.isArray(exp.user_income_expense_categories) ? exp.user_income_expense_categories[0]?.category_name : exp.user_income_expense_categories?.category_name) || 'Category'} ·{' '}
                      {(Array.isArray(exp.user_accounts) ? exp.user_accounts[0]?.account_name : exp.user_accounts?.account_name) || 'Account'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(exp.entry_date)}
                      {exp.note ? ` · ${exp.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(exp.id)}
                      disabled={saving}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => !saving && closeDrawer()}
            aria-hidden="true"
          />
          <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
              <button
                onClick={closeDrawer}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
                disabled={saving}
              >
                ✕
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value === '' ? '' : Number(e.target.value))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Account</label>
                <select
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_name} {a.status === 'primary' ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={entryDateInput}
                  onChange={(e) => setEntryDateInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Note (optional)</label>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  placeholder="Short note"
                  rows={2}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Add Expense'}
                </button>
                <button
                  type="button"
                  onClick={closeDrawer}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
