'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import AppHeader from '@/components/AppHeader';

const SUPER_USER_ID = '8cbf6392-dee3-48eb-b31f-2d8d787659f0';

type ToastType = 'success' | 'error' | null;

export default function ChangePasswordPage() {
    const router = useRouter();
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);

    const [sessionUserId, setSessionUserId] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Toast state
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<ToastType>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => {
            setToastType(null);
            setToastMessage('');
        }, 4000);
    };

    useEffect(() => {
        const verifySession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.user) {
                router.replace('/');
                return;
            }

            // Only the superuser is allowed on this page
            if (session.user.id !== SUPER_USER_ID) {
                router.replace('/dashboard');
                return;
            }

            setSessionUserId(session.user.id);
            setEmail(session.user.email ?? null);
            setLoading(false);
        };

        verifySession();
    }, [router, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldError('');

        if (newPassword.length < 6) {
            setFieldError('Password must be at least 6 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setFieldError('Passwords do not match. Please try again.');
            return;
        }

        setSubmitting(true);

        const { error } = await supabase.auth.updateUser({ password: newPassword });

        setSubmitting(false);

        if (error) {
            showToast(error.message || 'Failed to update password. Please try again.', 'error');
        } else {
            setNewPassword('');
            setConfirmPassword('');
            showToast('Password updated successfully! Your session remains active.', 'success');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <p className="mt-4 text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader pageTitle="Change Password" userEmail={email} userId={sessionUserId} />

            {/* Toast Notification */}
            {toastType && (
                <div
                    className={`fixed top-6 right-6 z-50 max-w-sm w-full px-5 py-4 rounded-xl shadow-lg flex items-start gap-3 transition-all duration-300 ${
                        toastType === 'success'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                    }`}
                    role="alert"
                >
                    <span className="text-xl leading-none mt-0.5">
                        {toastType === 'success' ? '✓' : '✕'}
                    </span>
                    <p className="text-sm font-medium leading-snug">{toastMessage}</p>
                </div>
            )}

            <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    {/* Page header */}
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 mb-4">
                            <span className="text-2xl">🔑</span>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Enter a new password below. Your session will remain active.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div>
                            <label
                                htmlFor="new-password"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                New Password
                            </label>
                            <input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    setFieldError('');
                                }}
                                required
                                minLength={6}
                                autoComplete="new-password"
                                placeholder="Minimum 6 characters"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="block text-sm font-medium text-gray-700 mb-2"
                            >
                                Confirm New Password
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setFieldError('');
                                }}
                                required
                                autoComplete="new-password"
                                placeholder="Re-enter new password"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                            />
                        </div>

                        {/* Inline field error */}
                        {fieldError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {fieldError}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            id="change-password-submit"
                            disabled={submitting}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Updating...' : 'Update Password'}
                        </button>

                        {/* Cancel */}
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                        >
                            Cancel
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
