'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';


type Account = {
    id: string;
    account_name: string;
    total_money: number;
};

type Lending = {
    id: string;
    created_at: string;
    date: string;
    amount: number;
    from_account_id: string;
    note: string;
    status: 'not settled' | 'settled';
    settled_amount: number;
    user_accounts?: {
        account_name: string;
    };
};

export default function LendingsPage() {
    const router = useRouter();
    const supabase = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    );

    const [lendings, setLendings] = useState<Lending[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [sessionUserId, setSessionUserId] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Menu State
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Filter State
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Add Lending Drawer State
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);
    const [addAmount, setAddAmount] = useState<number | ''>('');
    const [addAccountId, setAddAccountId] = useState('');
    const [addNote, setAddNote] = useState('');
    const [saving, setSaving] = useState(false);

    // Settle Modal State
    const [settleModalOpen, setSettleModalOpen] = useState(false);
    const [selectedLending, setSelectedLending] = useState<Lending | null>(null);
    const [settleAmount, setSettleAmount] = useState<number | ''>('');

    const initials = useMemo(() => {
        if (!email) return 'UU';
        const prefix = email.split('@')[0] || email;
        return prefix.slice(0, 2).toUpperCase();
    }, [email]);

    const fetchAccounts = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('user_accounts')
            .select('id, account_name, total_money')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAccounts(data as Account[]);
            // Set default account for adding
            if (data.length > 0 && !addAccountId) {
                setAddAccountId(data[0].id);
            }
        }
    }, [supabase, addAccountId]);

    const fetchLendings = useCallback(async (userId: string) => {
        let query = supabase
            .from('lendings')
            .select(`
        *,
        user_accounts (
          account_name
        )
      `)
            .eq('user_id', userId)
            .order('date', { ascending: false });

        if (filterStartDate) {
            query = query.gte('date', filterStartDate);
        }
        if (filterEndDate) {
            query = query.lte('date', filterEndDate);
        }

        const { data, error } = await query;

        if (error) {
            setError(error.message);
        } else {
            setLendings(data as any[]);
        }
    }, [supabase, filterStartDate, filterEndDate]);

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
            await Promise.all([
                fetchAccounts(session.user.id),
                fetchLendings(session.user.id)
            ]);
            setLoading(false);
        };

        load();
    }, [router, supabase, fetchAccounts, fetchLendings]);

    // Handle Add Lending
    const handleAddLending = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionUserId) return;
        setSaving(true);
        setError('');

        const { error } = await supabase.rpc('create_lending', {
            p_date: addDate,
            p_amount: Number(addAmount),
            p_from_account_id: addAccountId,
            p_note: addNote.trim(),
        });

        setSaving(false);

        if (error) {
            setError(error.message);
            return;
        }

        setDrawerOpen(false);
        // Reset form
        setAddAmount('');
        setAddNote('');
        setAddDate(new Date().toISOString().split('T')[0]);

        fetchLendings(sessionUserId);
        fetchAccounts(sessionUserId); // Refresh accounts to show deducted balance if we were to show it
    };

    // Handle Settle Lending
    const openSettleModal = (lending: Lending) => {
        setSelectedLending(lending);
        setSettleAmount(''); // Reset input
        setSettleModalOpen(true);
        setError('');
    };

    const handleSettleLending = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLending || !sessionUserId) return;
        setSaving(true);
        setError('');

        const { error } = await supabase.rpc('settle_lending', {
            p_lending_id: selectedLending.id,
            p_amount: Number(settleAmount),
        });

        setSaving(false);

        if (error) {
            setError(error.message);
            return;
        }

        setSettleModalOpen(false);
        setSelectedLending(null);
        fetchLendings(sessionUserId);
        fetchAccounts(sessionUserId);
    };

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="mt-4 text-gray-600">Loading lendings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-bold text-gray-900">Lendings</h1>
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen((open) => !open)}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition-colors"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white text-sm font-semibold">
                                    {initials}
                                </span>
                                <span className="text-xs text-gray-600">&#9662;</span>
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-52 rounded-lg border border-gray-200 bg-white shadow-lg py-2 z-10">
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push('/dashboard');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push('/accounts');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Manage Accounts
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push('/categories');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Manage Categories
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push('/expenses');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Manage Expenses
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push('/incomes');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Manage Incomes
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            router.push('/lendings');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 bg-gray-50 font-semibold"
                                    >
                                        Manage Lendings
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            supabase.auth.signOut().then(() => router.replace('/'));
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative">
                <section className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Your Lendings</h2>
                            <p className="text-sm text-gray-600">
                                Track money you have lent to others.
                                <span className="ml-2 font-medium text-gray-900">
                                    Total Outstanding: <span className="text-red-600">₹{lendings.reduce((sum, item) => sum + (item.amount - item.settled_amount), 0).toFixed(2)}</span>
                                </span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                                <input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 p-1"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 p-1"
                                />
                            </div>
                            <button
                                onClick={() => setDrawerOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                aria-label="Add lending"
                            >
                                + Add Lending
                            </button>
                        </div>
                    </div>

                    {lendings.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No lendings records found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {lendings.map((lending) => {
                                        const remaining = lending.amount - lending.settled_amount;
                                        return (
                                            <tr key={lending.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(lending.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {lending.note || '-'}
                                                    <div className="text-xs text-gray-400">from {lending.user_accounts?.account_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    ₹{lending.amount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <span className={remaining > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                                                        ₹{remaining.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lending.status === 'settled'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {lending.status === 'settled' ? 'Settled' : 'Unsettled'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {lending.status !== 'settled' && (
                                                        <button
                                                            onClick={() => openSettleModal(lending)}
                                                            className="text-blue-600 hover:text-blue-900"
                                                        >
                                                            Settle
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>

            {/* ADD LENDING DRAWER */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-black/30"
                        onClick={() => !saving && setDrawerOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Add Lending</h2>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                                disabled={saving}
                            >
                                ✕
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={handleAddLending}>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Date</label>
                                    <input
                                        type="date"
                                        value={addDate}
                                        onChange={(e) => setAddDate(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={addAmount}
                                        onChange={(e) =>
                                            setAddAmount(e.target.value === '' ? '' : Number(e.target.value))
                                        }
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">From Account</label>
                                    <select
                                        value={addAccountId}
                                        onChange={(e) => setAddAccountId(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    >
                                        <option value="" disabled>Select Account</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.account_name} (₹{acc.total_money.toFixed(2)})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Note</label>
                                    <textarea
                                        value={addNote}
                                        onChange={(e) => setAddNote(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                        placeholder="Who did you lend to?"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {error && <p className="text-sm text-red-600">{error}</p>}

                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Lending'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
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

            {/* SETTLE MODAL */}
            {settleModalOpen && selectedLending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/30"
                        onClick={() => !saving && setSettleModalOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="relative w-full max-w-sm bg-white rounded-lg shadow-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Settle Lending</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Total Lent: ₹{selectedLending.amount}<br />
                            Already Settled: ₹{selectedLending.settled_amount}<br />
                            <span className="font-semibold text-gray-900">Remaining: ₹{(selectedLending.amount - selectedLending.settled_amount).toFixed(2)}</span>
                        </p>

                        <form onSubmit={handleSettleLending}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount to settle now</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    max={selectedLending.amount - selectedLending.settled_amount}
                                    value={settleAmount}
                                    onChange={(e) => setSettleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSettleModalOpen(false)}
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                >
                                    {saving ? 'Processing...' : 'Settle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
