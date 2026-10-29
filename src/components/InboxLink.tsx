'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { chooseClub, useStoredClubId } from '@/lib/activeClub';
import { INBOX_CHANGED_EVENT, badgeText, loadUnreadCount } from '@/lib/communication';
import { useLanguage } from '@/contexts/LanguageContext';

const POLL_INTERVAL_MS = 60_000;

/**
 * Navbar entry to the club's notice board ("Mitteilungen", Wave 9 W3) with its own unread counter. It sits next to the
 * platform bell (`NotificationBell.tsx`, messages of MyVerein itself) and is labelled differently on purpose: megaphone =
 * messages of your club, bell = notices from the platform. Hidden for accounts without a club. Polls like the bell
 * (ADR-006: no realtime in v1) and refreshes when the inbox page marks something read.
 */
export function InboxLink() {
    const { t } = useLanguage();
    const [clubId, setClubId] = useState<string | null>(null);
    const [count, setCount] = useState(0);
    // Follows the club switcher without a reload.
    const stored = useStoredClubId();

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: { clubId: string }[] }>('/my-clubs')
            .then((res) => {
                if (!cancelled) setClubId(chooseClub(res.data, stored)?.clubId ?? null);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [stored]);

    useEffect(() => {
        if (!clubId) return;
        let cancelled = false;
        const refresh = () => {
            loadUnreadCount(clubId)
                .then((n) => {
                    if (!cancelled) setCount(n);
                })
                .catch(() => undefined);
        };
        refresh();
        const interval = setInterval(refresh, POLL_INTERVAL_MS);
        window.addEventListener('focus', refresh);
        window.addEventListener(INBOX_CHANGED_EVENT, refresh);
        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', refresh);
            window.removeEventListener(INBOX_CHANGED_EVENT, refresh);
        };
    }, [clubId]);

    if (!clubId) return null;

    const label = count > 0 ? t('nav.mitteilungen.unread', { count }) : t('nav.mitteilungen.label');
    return (
        <Link
            href="/mitteilungen"
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={label}
            title={label}
        >
            <Megaphone size={18} />
            {count > 0 && (
                <span aria-hidden className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {badgeText(count)}
                </span>
            )}
        </Link>
    );
}
