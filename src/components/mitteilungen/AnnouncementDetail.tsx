'use client';

import { useCallback, useEffect, useState } from 'react';

import { Modal } from '@/components/Modal';
import { Chip } from '@/components/standorte/ui';
import { apiFetch } from '@/lib/api-client';
import { formatBerlinDateTime } from '@/lib/keyHistory';
import { dangerBtn, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { inputClass } from '@/lib/clubMembers';
import {
    type Announcement,
    type CommunicationGate,
    type DeliveriesResponse,
    aggregateDeliveries,
    announcementActions,
    announcementsPath,
    communicationErrorKey,
    loadDeliveries,
    statusLabelKey,
} from '@/lib/communication';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/components/useConfirm';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';

const RECIPIENT_PAGE_SIZE = 50;
const RECIPIENT_STATUSES = ['sent', 'queued', 'sending', 'failed', 'bounced', 'skipped_no_address', 'skipped_optout', 'skipped'];

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
    return (
        <div className="rounded-lg border border-border bg-background p-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${tone ?? 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function DeliveryStatus({ clubId, announcement, gate, onResent }: { clubId: string; announcement: Announcement; gate: CommunicationGate; onResent: () => void }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const actions = announcementActions(announcement);
    const withList = gate.canSeeRecipients;
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const key = `${announcement.id}|${status}|${page}|${reload}`;
    const [result, setResult] = useState<{ key: string; data: DeliveriesResponse } | { key: string; error: true } | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadDeliveries(clubId, announcement.id, { page, pageSize: RECIPIENT_PAGE_SIZE, status: status || undefined, withList })
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

    async function resend() {
        if (!(await confirm({ title: t('mitteilungen.delivery.resend.title'), body: t('mitteilungen.delivery.resend.body'), confirmLabel: t('mitteilungen.delivery.resend') }))) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await apiFetch<{ data: { requeued: number } }>(announcementsPath(clubId, `/${announcement.id}/resend-failed`), { method: 'POST' });
            setMessage({ ok: true, text: t('mitteilungen.delivery.resend.done', { count: res.data.requeued }) });
            setReload((n) => n + 1);
            onResent();
        } catch (err) {
            setMessage({ ok: false, text: t(communicationErrorKey(err)) });
        } finally {
            setBusy(false);
        }
    }

    if (!current) return <LoadingText />;
    if ('error' in current) return <LoadError onRetry={() => setReload((n) => n + 1)} />;

    const { summary, recipients, pagination } = current.data;
    const agg = aggregateDeliveries(summary);
    const pages = pagination ? Math.max(1, Math.ceil(pagination.total / RECIPIENT_PAGE_SIZE)) : 1;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">{t('mitteilungen.delivery.title')}</h3>
            {summary.recipients === 0 ? (
                <p className="text-sm text-muted-foreground">{t('mitteilungen.delivery.empty')}</p>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Stat label={t('mitteilungen.delivery.delivered')} value={agg.delivered} />
                        <Stat label={t('mitteilungen.delivery.read')} value={agg.read} tone="text-success" />
                        <Stat label={t('mitteilungen.delivery.failed')} value={agg.failed} tone={agg.failed > 0 ? 'text-destructive' : undefined} />
                        <Stat label={t('mitteilungen.delivery.unreachable')} value={agg.unreachable} tone={agg.unreachable > 0 ? 'text-warning' : undefined} />
                    </div>
                    <p className="text-xs text-muted-foreground">{t('mitteilungen.delivery.recipients', { count: summary.recipients })}</p>
                    {Object.entries(summary.byChannel).length > 0 && (
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            {Object.entries(summary.byChannel).map(([channel, stats]) => (
                                <li key={channel}>
                                    <span className="font-medium text-foreground">{t(`mitteilungen.channel.${channel}`)}</span>: {t('mitteilungen.delivery.channelLine', { total: stats.total, read: stats.read })}
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}

            {gate.canSeeRecipients && actions.resend && agg.failed > 0 && (
                <button type="button" onClick={() => void resend()} disabled={busy} className={primaryBtn}>
                    {t('mitteilungen.delivery.resend')}
                </button>
            )}
            {message && (
                <p role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-success' : 'text-destructive'}`}>
                    {message.text}
                </p>
            )}

            {withList ? (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground">{t('mitteilungen.delivery.list')}</h4>
                        <select
                            value={status}
                            aria-label={t('mitteilungen.delivery.filter')}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                            }}
                            className={`${inputClass} !w-auto`}
                        >
                            <option value="">{t('mitteilungen.delivery.filter.all')}</option>
                            {RECIPIENT_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {t(`mitteilungen.delivery.status.${s}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {!recipients || recipients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('mitteilungen.delivery.list.empty')}</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2 font-semibold">{t('mitteilungen.delivery.col.name')}</th>
                                        <th className="px-3 py-2 font-semibold">{t('mitteilungen.delivery.col.channel')}</th>
                                        <th className="px-3 py-2 font-semibold">{t('mitteilungen.delivery.col.status')}</th>
                                        <th className="px-3 py-2 font-semibold">{t('mitteilungen.delivery.col.read')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {recipients.map((r) => (
                                        <tr key={r.id}>
                                            <td className="px-3 py-2 text-foreground">{r.name ?? '—'}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{t(`mitteilungen.channel.${r.channel}`)}</td>
                                            <td className="px-3 py-2">
                                                <Chip tone={r.status === 'sent' ? 'success' : r.status === 'failed' || r.status === 'bounced' ? 'destructive' : r.status.startsWith('skipped') ? 'warning' : 'muted'}>
                                                    {t(`mitteilungen.delivery.status.${r.status}`)}
                                                </Chip>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{r.readAt ? formatBerlinDateTime(r.readAt, language) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {pages > 1 && (
                        <div className="flex items-center justify-between">
                            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={secondaryBtn}>
                                {t('mitteilungen.pager.prev')}
                            </button>
                            <span className="text-xs text-muted-foreground">{t('mitteilungen.pager.page', { page, pages })}</span>
                            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={secondaryBtn}>
                                {t('mitteilungen.pager.next')}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">{t('mitteilungen.delivery.aggregateOnly')}</p>
            )}
            {dialog}
        </div>
    );
}

/**
 * Detail of one announcement (W2): text, state, delivery and read status as an aggregate for every author and the
 * per-recipient list (with filter and "resend failed") only with `announcements:write`. Edit/delete for drafts, cancel for
 * scheduled ones, withdraw for sent ones.
 */
export default function AnnouncementDetail({
    clubId,
    gate,
    announcement,
    onClose,
    onChanged,
    onEdit,
}: {
    clubId: string;
    gate: CommunicationGate;
    announcement: Announcement;
    onClose: () => void;
    onChanged: () => void;
    onEdit: (a: Announcement) => void;
}) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const actions = announcementActions(announcement);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(
        async (action: () => Promise<void>) => {
            setBusy(true);
            setError(null);
            try {
                await action();
                onChanged();
            } catch (err) {
                setError(t(communicationErrorKey(err)));
            } finally {
                setBusy(false);
            }
        },
        [onChanged, t],
    );

    async function cancelScheduled() {
        if (!(await confirm({ title: t('mitteilungen.cancel.title'), body: t('mitteilungen.cancel.body', { title: announcement.title }), confirmLabel: t('mitteilungen.cancel.confirm'), danger: true }))) return;
        await run(async () => {
            await apiFetch(announcementsPath(clubId, `/${announcement.id}/cancel`), { method: 'POST' });
        });
    }

    async function withdraw() {
        if (!(await confirm({ title: t('mitteilungen.withdraw.title'), body: t('mitteilungen.withdraw.body'), confirmLabel: t('mitteilungen.withdraw.confirm'), danger: true }))) return;
        await run(async () => {
            await apiFetch(announcementsPath(clubId, `/${announcement.id}`), { method: 'PATCH', body: { withdraw: true } });
        });
    }

    async function remove() {
        if (!(await confirm({ title: t('mitteilungen.delete.title'), body: t('mitteilungen.delete.body', { title: announcement.title }), confirmLabel: t('mitteilungen.delete.confirm'), danger: true }))) return;
        await run(async () => {
            await apiFetch(announcementsPath(clubId, `/${announcement.id}`), { method: 'DELETE' });
        });
    }

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title={announcement.title}
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                        {actions.edit && (
                            <button type="button" disabled={busy} onClick={() => onEdit(announcement)} className={secondaryBtn}>
                                {t('mitteilungen.detail.edit')}
                            </button>
                        )}
                        {actions.cancel && (
                            <button type="button" disabled={busy} onClick={() => void cancelScheduled()} className={dangerBtn}>
                                {t('mitteilungen.cancel.action')}
                            </button>
                        )}
                        {actions.withdraw && (
                            <button type="button" disabled={busy} onClick={() => void withdraw()} className={dangerBtn}>
                                {t('mitteilungen.withdraw.action')}
                            </button>
                        )}
                        {actions.delete && (
                            <button type="button" disabled={busy} onClick={() => void remove()} className={dangerBtn}>
                                {t('mitteilungen.delete.action')}
                            </button>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className={secondaryBtn}>
                        {t('common.close')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={announcement.status === 'sent' && !announcement.withdrawn ? 'success' : announcement.status === 'cancelled' ? 'destructive' : announcement.status === 'scheduled' ? 'primary' : 'muted'}>{t(statusLabelKey(announcement))}</Chip>
                    {announcement.urgent && <Chip tone="destructive">{t('mitteilungen.option.urgent')}</Chip>}
                    {announcement.pinned && <Chip tone="primary">{t('mitteilungen.badge.pinned')}</Chip>}
                    {announcement.channels.map((c) => (
                        <Chip key={c} tone="muted">
                            {t(`mitteilungen.channel.${c}`)}
                        </Chip>
                    ))}
                </div>
                <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                    {announcement.authorName && (
                        <div>
                            <dt className="inline">{t('mitteilungen.detail.author')}: </dt>
                            <dd className="inline text-foreground">{announcement.authorName}</dd>
                        </div>
                    )}
                    {announcement.sentAt && (
                        <div>
                            <dt className="inline">{t('mitteilungen.detail.sentAt')}: </dt>
                            <dd className="inline text-foreground">{formatBerlinDateTime(announcement.sentAt, language)}</dd>
                        </div>
                    )}
                    {announcement.status === 'scheduled' && announcement.publishAt && (
                        <div>
                            <dt className="inline">{t('mitteilungen.detail.publishAt')}: </dt>
                            <dd className="inline text-foreground">{formatBerlinDateTime(announcement.publishAt, language)}</dd>
                        </div>
                    )}
                    {announcement.expiresAt && (
                        <div>
                            <dt className="inline">{t('mitteilungen.detail.expiresAt')}: </dt>
                            <dd className="inline text-foreground">{formatBerlinDateTime(announcement.expiresAt, language)}</dd>
                        </div>
                    )}
                </dl>
                <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-foreground">{announcement.body}</p>
                {announcement.status === 'scheduled' && <p className="text-xs text-muted-foreground">{t('mitteilungen.detail.scheduled.hint')}</p>}
                {actions.showDeliveries && <DeliveryStatus clubId={clubId} announcement={announcement} gate={gate} onResent={() => undefined} />}
                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
            {dialog}
        </Modal>
    );
}
