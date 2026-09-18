'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Settings as SettingsIcon } from 'lucide-react';

import { authClient } from '@/lib/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { NotificationBell } from '@/components/NotificationBell';

/**
 * Client-side, optimistic auth slot for the Navbar's `guestNav`/`mobileGuestNav`
 * props. Deliberately not the source of truth for access control -- that's
 * `(protected)/layout.tsx`'s server-side session recheck. This only decides
 * what to *show* in the nav, same "optimistic only" principle src/proxy.ts's
 * own comment describes for middleware-level checks.
 */
export function AuthNav() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (isPending) {
        return <div className="h-9 w-20" />;
    }

    if (!session) {
        return (
            <Link
                href="/login-signup"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:brightness-110 transition-colors"
            >
                {t('auth.nav.signin')}
            </Link>
        );
    }

    const displayName = session.user.name ?? session.user.email;

    return (
        <div className="flex items-center gap-1">
            <NotificationBell />
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setIsOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline">{displayName}</span>
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-border bg-card p-2 shadow-lg ring-1 ring-black/5">
                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 rounded px-3 py-2 text-sm text-foreground hover:bg-muted"
                        >
                            <SettingsIcon size={16} />
                            {t('auth.nav.settings')}
                        </Link>
                        <button
                            onClick={async () => {
                                setIsOpen(false);
                                await authClient.signOut();
                                router.push('/');
                                router.refresh();
                            }}
                            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                        >
                            <LogOut size={16} />
                            {t('auth.nav.signout')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
