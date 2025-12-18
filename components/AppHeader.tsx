'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

type AppHeaderProps = {
    pageTitle: string;
    userEmail: string | null;
};

export default function AppHeader({ pageTitle, userEmail }: AppHeaderProps) {
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const supabase = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    );

    const initials = useMemo(() => {
        if (!userEmail) return 'UU';
        const prefix = userEmail.split('@')[0] || userEmail;
        return prefix.slice(0, 2).toUpperCase();
    }, [userEmail]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/');
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

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
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
    );
}
