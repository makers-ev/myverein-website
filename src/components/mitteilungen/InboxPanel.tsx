'use client';

import { useCallback, useEffect, useState } from 'react';
import { Inbox, Pin } from 'lucide-react';

import { Chip, EmptyState } from '@/components/standorte/ui';
import { formatBerlinDateTime } from '@/lib/keyHistory';
import { secondaryButtonClass } from '@/lib/clubMembers';
import { type InboxItem, type Pagination, loadInbox, markInboxRead, notifyInboxChanged, safeCtaHref } from '@/lib/communication';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';

const PAGE_SIZE = 20;

function InboxCard({ item, expanded, onToggle }: { item: InboxItem; expanded: boolean; onToggle: () => void }) {
    const { t, language } = useLanguage();
    const unread = !item.readAt;
    const href = safeCtaHref(item.ctaUrl);
    return (
        <li
            className={`rounded-xl border p-3 ${
                item.urgent ? 'border-destructive/50 bg-destructive/5' : unread ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
            }`}
        >
            <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full flex-col gap-1 text-left">
                <span className="flex flex-wrap items-center gap-2">
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                    {item.pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" aria-label={t('mitteilungen.badge.pinned')} />}
                    <span className={`text-sm text-foreground ${unread ? 'font-bold' : 'font-semibold'}`}>{item.title}</span>
                    {item.urgent && <Chip tone="destructive">{t('mitteilungen.option.urgent')}</Chip>}
                    {item.kind === 'system' && <Chip tone="muted">{t('mitteilungen.inbox.system')}</Chip>}
                    {unread && <span className="sr-only">{t('mitteilungen.inbox.unread')}</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                    {item.authorName ? `${item.authorName} · ` : ''}
                    {item.sentAt ? formatBerlinDateTime(item.sentAt, language) : ''}
                </span>
                {!expanded && <span className="line-clamp-2 text-sm text-muted-foreground">{item.body}</span>}
            </button>
            {expanded && (
                <div className="mt-2 space-y-2">
                    <p className="whitespace-pre-line text-sm text-foreground">{item.body}</p>
                    {href && (
                        <a href={href} className="inline-block text-sm font-medium text-primary hover:underline" {...(href.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
                            {item.ctaLabel || t('mitteilungen.inbox.open')}
                        </a>
                    )}
                </div>
            )}
        </li>
    );
}

/**
 * Club notice board / inbox of the signed-in member (W3): the announcements addressed to them plus the club's system
 * messages, pinned first, urgent highlighted, unread marked. Opening a message marks it read (`read_at`). The member
 * only ever sees their own deliveries; nothing here depends on a permission.
 */
export default function InboxPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [items, setItems] = useState<InboxItem[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [page, setPage] = useState(1);
    const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
    const [loadingMore, setLoadingMore] = useState(false);
    const [reload, setReload] = useState(0);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // First page for a filter/club/reload; later pages are appended by "load more".
    useEffect(() => {
        let cancelled = false;
        loadInbox(clubId, { page: 1, pageSize: PAGE_SIZE, unreadOnly })
            .then((res) => {
                if (cancelled) return;
                setItems(res.items);
                setPagination(res.pagination);
                setPage(1);
                setState('ready');
            })
            .catch(() => {
                if (!cancelled) setState('error');
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, unreadOnly, reload]);

    const retry = useCallback(() => {
        setState('loading');
        setReload((n) => n + 1);
    }, []);

    async function loadMore() {
        setLoadingMore(true);
        try {
            const res = await loadInbox(clubId, { page: page + 1, pageSize: PAGE_SIZE, unreadOnly });
            setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p.id === n.id))]);
            setPagination(res.pagination);
            setPage((p) => p + 1);
        } catch {
            setState('error');
        } finally {
            setLoadingMore(false);
        }
    }

    function toggle(item: InboxItem) {
        const opening = expandedId !== item.id;
        setExpandedId(opening ? item.id : null);
        if (opening && !item.readAt) {
            // Optimistic: mark read right away, the counter follows; a failed call simply leaves it unread on the next load.
            setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)));
            markInboxRead(clubId, item.id)
                .then(() => notifyInboxChanged())
                .catch(() => setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, readAt: null } : n))));
        }
    }

    const hasMore = pagination ? items.length < pagination.total : false;

    return (
        <div className="space-y-4">
            <div role="group" aria-label={t('mitteilungen.inbox.filter')} className="inline-flex rounded-lg border border-border p-0.5">
                {([false, true] as const).map((only) => (
                    <button
                        key={String(only)}
                        type="button"
                        aria-pressed={unreadOnly === only}
                        onClick={() => {
                            setState('loading');
                            setUnreadOnly(only);
                        }}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium ${unreadOnly === only ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {t(only ? 'mitteilungen.inbox.filter.unread' : 'mitteilungen.inbox.filter.all')}
                    </button>
                ))}
            </div>

            {state === 'loading' ? (
                <LoadingText />
            ) : state === 'error' ? (
                <LoadError onRetry={retry} />
            ) : items.length === 0 ? (
                <EmptyState icon={<Inbox className="h-6 w-6" aria-hidden />} text={t(unreadOnly ? 'mitteilungen.inbox.empty.unread' : 'mitteilungen.inbox.empty')} />
            ) : (
                <>
                    <ul className="space-y-2">
                        {items.map((item) => (
                            <InboxCard key={item.id} item={item} expanded={expandedId === item.id} onToggle={() => toggle(item)} />
                        ))}
                    </ul>
                    {hasMore && (
                        <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className={secondaryButtonClass}>
                            {t('mitteilungen.inbox.more')}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
