'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

import { authClient, backendUrl } from '@/lib/auth-client';

const POLL_INTERVAL_MS = 30_000;

/** Bell + unread badge for the signed-in nav slot (`AuthNav.tsx`) -- polls on an interval and on window focus rather than a websocket/SSE connection (ADR-006: polling, no realtime in v1). */
export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function refresh() {
            const { data } = await authClient.$fetch<{ data: { count: number } }>(`${backendUrl}/notifications/unread-count`);
            if (!cancelled && data) setUnreadCount(data.data.count);
        }

        void refresh();
        const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
        window.addEventListener('focus', refresh);
        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', refresh);
        };
    }, []);

    return (
        <Link
            href="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Notifications"
        >
            <Bell size={18} />
            {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
