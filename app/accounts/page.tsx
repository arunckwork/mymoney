'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

type AccountStatus = 'primary' | 'secondary';

type Account = {
  id: string;
  account_name: string;
  total_money: number;
  status: AccountStatus;
};

export default function AccountsPage() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState<number | ''>('');
  const [statusInput, setStatusInput] = useState<AccountStatus>('secondary');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingAmount, setEditingAmount] = useState<number | ''>('');
  const [editingStatus, setEditingStatus] = useState<AccountStatus>('secondary');
  const [saving, setSaving] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  /* Transfer State */
  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState<number | ''>('');
  const [transferType, setTransferType] = useState<'create' | 'transfer' | null>(null);

  const initials = useMemo(() => {
    if (!email) return 'UU';
    const prefix = email.split('@')[0] || email;
    return prefix.slice(0, 2).toUpperCase();
  }, [email]);



  const fetchAccounts = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('id, account_name, total_money, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setAccounts(data as Account[]);
    setError('');
  }, [supabase]);

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
      await fetchAccounts(session.user.id);
      setLoading(false);
    };

    load();
  }, [router, supabase, fetchAccounts]);

  const resetForm = () => {
    setNameInput('');
    setAmountInput('');
    setStatusInput('secondary');
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

    const { error } = await supabase.from('user_accounts').insert([
      {
        user_id: sessionUserId,
        account_name: nameInput.trim(),
        total_money: Number(amountInput || 0),
        status: statusInput,
      },
    ]);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    resetForm();
    setDrawerOpen(false);
    fetchAccounts(sessionUserId);
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setEditingName(account.account_name);
    setEditingAmount(account.total_money);
    setEditingStatus(account.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingAmount('');
    setEditingStatus('secondary');
  };

  const handleUpdate = async (accountId: string) => {
    if (!sessionUserId) return;
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('user_accounts')
      .update({
        account_name: editingName.trim(),
        total_money: Number(editingAmount || 0),
        status: editingStatus,
      })
      .eq('id', accountId)
      .eq('user_id', sessionUserId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    cancelEdit();
    fetchAccounts(sessionUserId);
  };

  const handleDelete = async (accountId: string) => {
    if (!sessionUserId) return;
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('user_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', sessionUserId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    fetchAccounts(sessionUserId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

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
          <p className="mt-4 text-gray-600">Loading accounts...</p>
        </div>
      </div>
    );
  }


  const openTransferDrawer = () => {
    setTransferFrom('');
    setTransferTo('');
    setTransferAmount('');
    setError('');

    // Set default From/To if accounts available
    const primary = accounts.find(a => a.status === 'primary') || accounts[0];
    const secondary = accounts.find(a => a.id !== primary?.id);

    if (primary) setTransferFrom(primary.id);
    if (secondary) setTransferTo(secondary.id);
    else if (accounts.length > 1 && primary) {
      // Fallback to first non-primary
      const other = accounts.find(a => a.id !== primary.id);
      if (other) setTransferTo(other.id);
    }

    setTransferDrawerOpen(true);
  };

  const closeTransferDrawer = () => {
    setTransferDrawerOpen(false);
    setTransferFrom('');
    setTransferTo('');
    setTransferAmount('');
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUserId) return;
    if (transferFrom === transferTo) {
      setError('Source and destination accounts cannot be the same.');
      return;
    }

    setSaving(true);
    setError('');

    const { error } = await supabase.rpc('transfer_funds', {
      p_source_account_id: transferFrom,
      p_destination_account_id: transferTo,
      p_amount: Number(transferAmount),
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    closeTransferDrawer();
    fetchAccounts(sessionUserId);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Accounts</h1>
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
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Manage Lendings
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Your Accounts</h2>
              <p className="text-sm text-gray-600">View, edit, or remove your accounts.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openTransferDrawer}
                className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 mr-2"
              >
                Transfer Funds
              </button>
              <button
                onClick={() => sessionUserId && fetchAccounts(sessionUserId)}
                className="text-sm text-green-700 hover:text-green-800 font-medium"
              >
                Refresh
              </button>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-lg font-bold hover:bg-green-700"
                aria-label="Add account"
              >
                +
              </button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <p className="text-sm text-gray-600">
              No accounts yet. Use “+ Add” to create your first one.
            </p>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const isEditing = editingId === account.id;
                return (
                  <div
                    key={account.id}
                    className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-1">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingAmount}
                            onChange={(e) =>
                              setEditingAmount(e.target.value === '' ? '' : Number(e.target.value))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                          />
                          <select
                            value={editingStatus}
                            onChange={(e) => setEditingStatus(e.target.value as AccountStatus)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                          >
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                          </select>
                        </div>
                      ) : (
                        <>
                          <p className="text-base font-semibold text-gray-900">
                            {account.account_name}
                          </p>
                          <p className="text-sm text-gray-700">
                            ₹{account.total_money.toFixed(2)} · {account.status}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdate(account.id)}
                            disabled={saving}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(account)}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(account.id)}
                            disabled={saving}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* CREATE Account Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => !saving && closeDrawer()}
            aria-hidden="true"
          />
          <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Account</h2>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Account name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="Savings, Checking, etc."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Total money</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountInput}
                    onChange={(e) =>
                      setAmountInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as AccountStatus)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Add Account'}
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

      {/* TRANSFER Funds Drawer */}
      {transferDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => !saving && closeTransferDrawer()}
            aria-hidden="true"
          />
          <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Transfer Funds</h2>
              <button
                onClick={closeTransferDrawer}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
                disabled={saving}
              >
                ✕
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleTransfer}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">From Account</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Select Source</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} (₹{acc.total_money.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">To Account</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Select Destination</option>
                    {accounts.filter(a => a.id !== transferFrom).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} (₹{acc.total_money.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transferAmount}
                    onChange={(e) =>
                      setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Processing...' : 'Transfer'}
                </button>
                <button
                  type="button"
                  onClick={closeTransferDrawer}
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
