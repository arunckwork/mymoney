'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

type CategoryStatus = 'active' | 'inactive';
type CategoryType = 'income' | 'expense';

type Category = {
  id: string;
  category_name: string;
  status: CategoryStatus;
  category_type: CategoryType;
};

export default function CategoriesPage() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [nameInput, setNameInput] = useState('');
  const [statusInput, setStatusInput] = useState<CategoryStatus>('active');
  const [typeInput, setTypeInput] = useState<CategoryType>('expense');
  const [typeFilter, setTypeFilter] = useState<'all' | CategoryType>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingStatus, setEditingStatus] = useState<CategoryStatus>('active');
  const [editingType, setEditingType] = useState<CategoryType>('expense');

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    if (!email) return 'UU';
    const prefix = email.split('@')[0] || email;
    return prefix.slice(0, 2).toUpperCase();
  }, [email]);



  const fetchCategories = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_income_expense_categories')
      .select('id, category_name, status, category_type, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setCategories(data as Category[]);
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
      await fetchCategories(session.user.id);
      setLoading(false);
    };

    load();
  }, [router, supabase, fetchCategories]);

  const resetForm = () => {
    setNameInput('');
    setStatusInput('active');
    setTypeInput('expense');
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

    const { error } = await supabase.from('user_income_expense_categories').insert([
      {
        user_id: sessionUserId,
        category_name: nameInput.trim(),
        status: statusInput,
        category_type: typeInput,
      },
    ]);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    resetForm();
    setDrawerOpen(false);
    fetchCategories(sessionUserId);
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.category_name);
    setEditingStatus(category.status);
    setEditingType(category.category_type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingStatus('active');
    setEditingType('expense');
  };

  const handleUpdate = async (categoryId: string) => {
    if (!sessionUserId) return;
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('user_income_expense_categories')
      .update({
        category_name: editingName.trim(),
        status: editingStatus,
        category_type: editingType,
      })
      .eq('id', categoryId)
      .eq('user_id', sessionUserId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    cancelEdit();
    fetchCategories(sessionUserId);
  };

  const handleDelete = async (categoryId: string) => {
    if (!sessionUserId) return;
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('user_income_expense_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', sessionUserId);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    fetchCategories(sessionUserId);
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
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">Categories</h1>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Income and Expense Categories</h2>
              <p className="text-sm text-gray-600">Organize your spending and income buckets.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | CategoryType)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
              <button
                onClick={() => sessionUserId && fetchCategories(sessionUserId)}
                className="text-sm text-green-700 hover:text-green-800 font-medium"
              >
                Refresh
              </button>
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-lg font-bold hover:bg-green-700"
                aria-label="Add category"
              >
                +
              </button>
            </div>
          </div>

          {categories.length === 0 ? (
            <p className="text-sm text-gray-600">
              No categories yet. Use “+” to create your first one.
            </p>
          ) : (
            <div className="space-y-3">
              {categories
                .filter((c) => typeFilter === 'all' || c.category_type === typeFilter)
                .map((category) => {
                  const isEditing = editingId === category.id;
                  return (
                    <div
                      key={category.id}
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
                            <select
                              value={editingType}
                              onChange={(e) => setEditingType(e.target.value as CategoryType)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            >
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                            <select
                              value={editingStatus}
                              onChange={(e) => setEditingStatus(e.target.value as CategoryStatus)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        ) : (
                          <>
                            <p className="text-base font-semibold text-gray-900">
                              {category.category_name}
                            </p>
                            <div className="flex gap-2 text-sm text-gray-700">
                              <span className={`capitalize ${category.category_type === 'income' ? 'text-blue-600' : 'text-orange-600'}`}>
                                {category.category_type}
                              </span>
                              <span>·</span>
                              <span>{category.status}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdate(category.id)}
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
                              onClick={() => startEdit(category)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
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

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => !saving && closeDrawer()}
            aria-hidden="true"
          />
          <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Category</h2>
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
                  <label className="block text-sm font-medium text-gray-700">Category name</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Groceries, Rent, Subscriptions"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        value="expense"
                        checked={typeInput === 'expense'}
                        onChange={(e) => setTypeInput(e.target.value as CategoryType)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-gray-700">Expense</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="type"
                        value="income"
                        checked={typeInput === 'income'}
                        onChange={(e) => setTypeInput(e.target.value as CategoryType)}
                        className="text-green-600 focus:ring-green-500"
                      />
                      <span className="text-gray-700">Income</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as CategoryStatus)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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
                  {saving ? 'Saving...' : 'Add Category'}
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
