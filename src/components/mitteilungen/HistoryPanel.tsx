'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

import { Chip, EmptyState, type Tone } from '@/components/standorte/ui';
import { formatBerlinDateTime } from '@/lib/keyHistory';
import { secondaryButtonClass, inputClass } from '@/lib/clubMembers';
import { type Announcement, type AnnouncementStatus, type CommunicationGate, type HistoryPage, loadHistory, statusLabelKey } from '@/lib/communication';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import AnnouncementDetail from './AnnouncementDetail';

const PAGE_SIZE = 25;
const STATUS_TONE: Record<AnnouncementStatus, Tone> = { draft: 'muted', scheduled: 'primary', sending: 'warning', sent: 'success', cancelled: 'destructive' };
const STATUSES: AnnouncementStatus[] = ['draft', 'scheduled', 'sent', 'cancelled'];

/** When an announcement went / goes out, in the form that fits its state. */
function whenText(a: Announcement, language: string, t: (k: string, p?: Record<string, string | number>) => string): string {
    if (a.status === 'scheduled' && a.publishAt) return t('mitteilungen.history.when.scheduled', { date: formatBerlinDateTime(a.publishAt, language) });
    if (a.sentAt) return t('mitteilungen.history.when.sent', { date: formatBerlinDateTime(a.sentAt, language) });
    return t('mitteilungen.history.when.created', { date: formatBerlinDateTime(a.createdAt, language) });
}

/**
 * History (W2): sent, scheduled, draft and cancelled announcements. Club-wide authors see the whole club, the department
 * scope only its own announcements (the backend filters). A row opens the detail with delivery/read status.
 */
export default function HistoryPanel({
    clubId,
    gate,
    reloadToken,
    onEdit,
}: {
    clubId: string;
    gate: CommunicationGate;
    reloadToken: number;
    onEdit: (a: Announcement) => void;
}) {
    const { t, language } = useLanguage();
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [local, setLocal] = useState(0);
    const [result, setResult] = useState<{ key: string; data: HistoryPage } | { key: string; error: true } | null>(null);
    const [open, setOpen] = useState<Announcement | null>(null);

    const key = `${clubId}|${status}|${page}|${reloadToken}|${local}`;

    useEffect(() => {
        let cancelled = false;
        loadHistory(clubId, { status: status || undefined, page, pageSize: PAGE_SIZE })
            .then((data) => {
                if (!cancelled) setResult({ key, data });
            })
            .catch(() => {
                if (!cancelled) setResult({ key, error: true });
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const current = result && result.key === key ? result : null;
    const reload = useCallback(() => setLocal((n) => n + 1), []);
    const pages = current && 'data' in current ? Math.max(1, Math.ceil(current.data.pagination.total / PAGE_SIZE)) : 1;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    {t('mitteilungen.history.filter')}
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        className={`${inputClass} !w-auto`}
                    >
                        <option value="">{t('mitteilungen.history.filter.all')}</option>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {t(`mitteilungen.status.${s}`)}
                            </option>
                        ))}
                    </select>
                </label>
                {!gate.writeAll && <p className="text-xs text-muted-foreground">{t('mitteilungen.history.ownOnly')}</p>}
            </div>

            {!current ? (
                <LoadingText />
            ) : 'error' in current ? (
                <LoadError onRetry={reload} />
            ) : current.data.items.length === 0 ? (
                <EmptyState icon={<Megaphone className="h-6 w-6" aria-hidden />} text={t(status ? 'mitteilungen.history.empty.filtered' : 'mitteilungen.history.empty')} />
            ) : (
                <>
                    <ul className="space-y-2">
                        {current.data.items.map((a) => (
                            <li key={a.id}>
                                <button
                                    type="button"
                                    onClick={() => setOpen(a)}
                                    className="flex w-full flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50"
                                >
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground">{a.title}</span>
                                        <Chip tone={a.status === 'sent' && a.withdrawn ? 'muted' : STATUS_TONE[a.status]}>{t(statusLabelKey(a))}</Chip>
                                        {a.urgent && <Chip tone="destructive">{t('mitteilungen.option.urgent')}</Chip>}
                                        {a.pinned && <Chip tone="primary">{t('mitteilungen.badge.pinned')}</Chip>}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {whenText(a, language, t)}
                                        {a.authorName ? ` · ${a.authorName}` : ''}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {pages > 1 && (
                        <div className="flex items-center justify-between">
                            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={secondaryButtonClass}>
                                {t('mitteilungen.pager.prev')}
                            </button>
                            <span className="text-xs text-muted-foreground">{t('mitteilungen.pager.page', { page, pages })}</span>
                            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={secondaryButtonClass}>
                                {t('mitteilungen.pager.next')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {open && (
                <AnnouncementDetail
                    clubId={clubId}
                    gate={gate}
                    announcement={open}
                    onClose={() => setOpen(null)}
                    onChanged={() => {
                        setOpen(null);
                        reload();
                    }}
                    onEdit={(a) => {
                        setOpen(null);
                        onEdit(a);
                    }}
                />
            )}
        </div>
    );
}
