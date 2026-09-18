'use client';

import { useEffect, useState } from 'react';
import { Mail, MailOpen, Trash2 } from 'lucide-react';

import { authClient, backendUrl } from '@/lib/auth-client';
import { useLanguage } from '@/contexts/LanguageContext';

interface NotificationItem {
    id: string;
    kind: 'system' | 'admin';
    translationKey: string | null;
    paramsJson: Record<string, unknown> | null;
    translations: Record<string, { title: string; body: string }> | null;
    deletable: boolean;
    read: boolean;
    createdAt: string;
}

type Tab = 'unread' | 'read';

/**
 * Resolves a notification's display title/body for the current language.
 * `translations` (ADR-009 jsonb column, keyed by language code) wins
 * whenever it's set -- always true for an `admin` notification, and true for
 * a `system` one only once an admin has overridden its `notification_template`
 * row (see the backend's `admin-notification-templates.ts`). Falls back to
 * the English entry if the active language has no override yet, same
 * per-key English fallback `t()` uses. A `system` notification with no
 * override at all has `translations: null`, so it falls back to rendering
 * `translationKey`/`paramsJson` through `t()` instead.
 */
function useNotificationText(n: NotificationItem) {
    const { t, language } = useLanguage();
    const override = n.translations?.[language] ?? n.translations?.en;
    if (override) {
        return { title: override.title, body: override.body };
    }
    return {
        title: t(`${n.translationKey}.title`, n.paramsJson as Record<string, string | number> | undefined),
        body: t(`${n.translationKey}.body`, n.paramsJson as Record<string, string | number> | undefined),
    };
}

function NotificationCard({ n, onChange }: { n: NotificationItem; onChange: () => void }) {
    const { t } = useLanguage();
    const { title, body } = useNotificationText(n);

    async function handleToggleRead() {
        await authClient.$fetch(`${backendUrl}/notifications/${n.id}/${n.read ? 'unread' : 'read'}`, { method: 'POST' });
        onChange();
    }

    async function handleDelete() {
        if (!confirm(t('notifications.deleteConfirm'))) return;
        await authClient.$fetch(`${backendUrl}/notifications/${n.id}`, { method: 'DELETE' });
        onChange();
    }

    return (
        <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        onClick={() => void handleToggleRead()}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label={t(n.read ? 'notifications.action.markUnread' : 'notifications.action.markRead')}
                    >
                        {n.read ? <MailOpen size={16} /> : <Mail size={16} />}
                    </button>
                    {n.deletable && (
                        <button
                            onClick={() => void handleDelete()}
                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label={t('notifications.action.delete')}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{body}</p>
            <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString('de-DE', { timeZone: 'UTC' })}
            </p>
        </div>
    );
}

export default function NotificationsPageContent() {
    const { t } = useLanguage();
    const [tab, setTab] = useState<Tab>('unread');
    const [items, setItems] = useState<NotificationItem[] | null>(null);

    async function refresh() {
        setItems(null);
        const { data } = await authClient.$fetch<{ data: NotificationItem[] }>(`${backendUrl}/notifications?filter=${tab}`);
        setItems(data?.data ?? []);
    }

    useEffect(() => {
        // Fetching from the backend on tab change is a legitimate
        // sync-with-external-system effect, not a render-time derivation.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    return (
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('notifications.page.title')}</h1>

            <div className="mt-6 flex gap-2 border-b border-border">
                {(['unread', 'read'] as const).map((value) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                            tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {t(`notifications.tab.${value}`)}
                    </button>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                {items === null ? (
                    <p className="text-sm text-muted-foreground">…</p>
                ) : items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(`notifications.empty.${tab}`)}</p>
                ) : (
                    items.map((n) => <NotificationCard key={n.id} n={n} onChange={() => void refresh()} />)
                )}
            </div>
        </div>
    );
}
