'use client';

import { GenerateAction } from '@/components/documents/GenerateDialog';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Download, Trash2 } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import {
    type AgendaItem,
    type DeliverySummaryRow,
    type InvitationPreview,
    MAJORITY_TOPICS,
    VOTE_KINDS,
    assemblyErrorKey,
    deliveryReasonKey,
    deliveryTotals,
    missingFromError,
    periodFromError,
    sendBlocker,
} from '@/lib/assembly';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';
import { formatDate } from '@/lib/clubMembers';
import { useLanguage } from '@/contexts/LanguageContext';
import { dangerBtn, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { ErrorText, Notice, formatWhen } from '@/components/assembly/shared';

interface InvitationRow {
    id: string;
    version: number;
    kind: 'einladung' | 'nachtrag';
    sentAt: string;
    recipientCount: number;
    exceptionReason: string | null;
    summary: DeliverySummaryRow[];
}

interface DeliveryRow {
    id: string;
    clubMemberId: string | null;
    displayName: string | null;
    channel: string;
    status: string;
    errorCode: string | null;
    statusAt: string | null;
    postedAt: string | null;
}

/** Structured agenda (TOPs with vote kind and majority topic). Announced items are locked: they change only through a Nachtrag. */
function AgendaEditor({ clubId, meetingId, canEdit }: { clubId: string; meetingId: string; canEdit: boolean }) {
    const { t } = useLanguage();
    const [items, setItems] = useState<AgendaItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [voteKind, setVoteKind] = useState<(typeof VOTE_KINDS)[number]>('none');
    const [topic, setTopic] = useState<(typeof MAJORITY_TOPICS)[number]>('allgemein');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { confirm, dialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: AgendaItem[] }>(`/meetings/${meetingId}/agenda-items?clubId=${clubId}`);
            setItems(res.data);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [clubId, meetingId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    function add(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        void run(async () => {
            await apiFetch(`/meetings/${meetingId}/agenda-items?clubId=${clubId}`, {
                method: 'POST',
                body: { title: title.trim(), ...(description.trim() ? { description: description.trim() } : {}), voteKind, topic: voteKind === 'election' ? 'wahl' : topic },
            });
            setTitle('');
            setDescription('');
            setVoteKind('none');
            setTopic('allgemein');
        });
    }

    if (failed && !items) return <LoadError onRetry={() => void load()} />;
    if (!items) return <LoadingText />;

    return (
        <SectionCard title={t('assembly.agenda.title')}>
            <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{t('assembly.agenda.hint')}</p>
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('assembly.agenda.empty')}</p>
                ) : (
                    <ol className="space-y-2">
                        {items.map((item, i) => (
                            <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                                <span className="mt-0.5 w-6 shrink-0 text-sm font-bold text-muted-foreground">{item.position}.</span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                    {item.description && <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">{item.description}</p>}
                                    <p className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span>{t(`assembly.voteKind.${item.voteKind}`)}</span>
                                        {item.voteKind !== 'none' && <span>· {t(`assembly.topic.${item.topic}`)}</span>}
                                        <span className={`rounded-full px-2 py-0.5 font-semibold ${item.announced ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>{t(item.announced ? 'assembly.agenda.announced' : 'assembly.agenda.draft')}</span>
                                    </p>
                                </div>
                                {canEdit && !item.announced && (
                                    <div className="flex shrink-0 gap-1">
                                        <button type="button" disabled={busy || i === 0} aria-label={t('assembly.agenda.up')} onClick={() => void run(() => apiFetch(`/meetings/${meetingId}/agenda-items/${item.id}?clubId=${clubId}`, { method: 'PATCH', body: { position: item.position - 1 } }))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40">
                                            <ArrowUp className="h-4 w-4" aria-hidden />
                                        </button>
                                        <button type="button" disabled={busy || i === items.length - 1} aria-label={t('assembly.agenda.down')} onClick={() => void run(() => apiFetch(`/meetings/${meetingId}/agenda-items/${item.id}?clubId=${clubId}`, { method: 'PATCH', body: { position: item.position + 1 } }))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40">
                                            <ArrowDown className="h-4 w-4" aria-hidden />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            aria-label={`${t('assembly.agenda.delete')}: ${item.title}`}
                                            onClick={async () => {
                                                if (await confirm({ title: t('assembly.agenda.delete'), body: item.title, confirmLabel: t('assembly.agenda.delete'), danger: true })) {
                                                    void run(() => apiFetch(`/meetings/${meetingId}/agenda-items/${item.id}?clubId=${clubId}`, { method: 'DELETE' }));
                                                }
                                            }}
                                            className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-40"
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ol>
                )}
                {error && <ErrorText>{error}</ErrorText>}
                {canEdit && (
                    <form onSubmit={add} className="space-y-3 border-t border-border pt-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="ag-title" className={labelClass}>
                                    {t('assembly.agenda.itemTitle')} *
                                </label>
                                <input id="ag-title" type="text" required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="ag-desc" className={labelClass}>
                                    {t('assembly.agenda.itemDescription')}
                                </label>
                                <textarea id="ag-desc" rows={2} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="ag-kind" className={labelClass}>
                                    {t('assembly.agenda.voteKind')}
                                </label>
                                <select id="ag-kind" value={voteKind} onChange={(e) => setVoteKind(e.target.value as (typeof VOTE_KINDS)[number])} className={inputClass}>
                                    {VOTE_KINDS.map((k) => (
                                        <option key={k} value={k}>
                                            {t(`assembly.voteKind.${k}`)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {voteKind === 'resolution' && (
                                <div>
                                    <label htmlFor="ag-topic" className={labelClass}>
                                        {t('assembly.agenda.topic')}
                                    </label>
                                    <select id="ag-topic" value={topic} onChange={(e) => setTopic(e.target.value as (typeof MAJORITY_TOPICS)[number])} className={inputClass}>
                                        {MAJORITY_TOPICS.map((k) => (
                                            <option key={k} value={k}>
                                                {t(`assembly.topic.${k}`)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <button type="submit" disabled={busy || !title.trim()} className={primaryBtn}>
                            {t('assembly.agenda.add')}
                        </button>
                    </form>
                )}
            </div>
            {dialog}
        </SectionCard>
    );
}

function Tile({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border border-border bg-background px-3 py-2 text-center">
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

/** One sent invitation with the proof of delivery: counts per status, the delivery rows per recipient and the post list. */
function InvitationProof({ clubId, meetingId, invitation, canSensitive, onChanged }: { clubId: string; meetingId: string; invitation: InvitationRow; canSensitive: boolean; onChanged: () => void }) {
    const { t, language } = useLanguage();
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<DeliveryRow[] | null>(null);
    const [filter, setFilter] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const totals = deliveryTotals(invitation.summary);
    const postQueued = invitation.summary.filter((r) => r.channel === 'post' && r.status === 'queued').reduce((n, r) => n + r.count, 0);

    const loadRows = useCallback(
        async (status: string) => {
            try {
                const res = await apiFetch<{ data: { deliveries: DeliveryRow[] } }>(`/meetings/${meetingId}/invitations/${invitation.id}?clubId=${clubId}&limit=500${status ? `&status=${status}` : ''}`);
                setRows(res.data.deliveries);
                setError(null);
            } catch (err) {
                setError(t(assemblyErrorKey(err)));
            }
        },
        [clubId, meetingId, invitation.id, t],
    );

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (open) void loadRows(filter);
    }, [open, filter, loadRows]);

    async function downloadPostList() {
        setBusy(true);
        setError(null);
        try {
            const { blob, filename } = await fetchFileBlob(`/meetings/${meetingId}/invitations/${invitation.id}/post-list.csv?clubId=${clubId}`, `einladung-${invitation.version}-postliste.csv`, { accept: 'text/csv' });
            saveBlob(blob, filename);
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    async function markPosted() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/invitations/${invitation.id}/deliveries/mark-posted?clubId=${clubId}`, { method: 'POST', body: {} });
            onChanged();
            if (open) await loadRows(filter);
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <li className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                    {t(invitation.kind === 'nachtrag' ? 'assembly.invite.history.nachtrag' : 'assembly.invite.history.einladung', { version: invitation.version })} · {formatWhen(invitation.sentAt, language)}
                </p>
                <div className="flex flex-wrap gap-2">
                    <GenerateAction clubId={clubId} templateId="versammlung-einladung" label={t('docs.gen.invitation.action')} title={t('docs.gen.invitation.title')} intro={t('docs.gen.invitation.intro')} params={{ meetingId, version: invitation.version }} target={{ kind: 'archive' }} className={`${secondaryBtn} !px-3 !py-1.5`} />
                    <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${secondaryBtn} !px-3 !py-1.5`}>
                        {t(open ? 'assembly.invite.proof.hide' : 'assembly.invite.proof.show')}
                    </button>
                </div>
            </div>
            {invitation.exceptionReason && <p className="mt-1 text-xs text-warning">{t('assembly.invite.exceptionNote', { reason: invitation.exceptionReason })}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Tile label={t('assembly.invite.proof.recipients')} value={invitation.recipientCount} />
                <Tile label={t('assembly.delivery.sent')} value={totals.sent ?? 0} />
                <Tile label={t('assembly.delivery.queued')} value={totals.queued ?? 0} />
                <Tile label={t('assembly.delivery.manual_posted')} value={totals.manual_posted ?? 0} />
                <Tile label={t('assembly.delivery.problem')} value={(totals.failed ?? 0) + (totals.bounced ?? 0)} />
            </div>
            {error && (
                <div className="mt-2">
                    <ErrorText>{error}</ErrorText>
                </div>
            )}
            {open && (
                <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-end gap-2">
                        <div>
                            <label htmlFor={`dl-filter-${invitation.id}`} className={labelClass}>
                                {t('assembly.invite.proof.filter')}
                            </label>
                            <select id={`dl-filter-${invitation.id}`} value={filter} onChange={(e) => setFilter(e.target.value)} className={inputClass}>
                                <option value="">{t('assembly.invite.proof.all')}</option>
                                {['queued', 'sent', 'failed', 'bounced', 'manual_posted'].map((s) => (
                                    <option key={s} value={s}>
                                        {t(`assembly.delivery.${s}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {canSensitive && postQueued > 0 && (
                            <button type="button" disabled={busy} onClick={() => void downloadPostList()} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                                <Download className="h-4 w-4" aria-hidden />
                                {t('assembly.invite.postList')}
                            </button>
                        )}
                        {postQueued > 0 && (
                            <button type="button" disabled={busy} onClick={() => void markPosted()} className={secondaryBtn}>
                                {t('assembly.invite.markPosted', { count: postQueued })}
                            </button>
                        )}
                    </div>
                    {postQueued > 0 && !canSensitive && <p className="text-xs text-muted-foreground">{t('assembly.invite.postList.noAccess')}</p>}
                    {rows === null ? (
                        <LoadingText />
                    ) : rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('assembly.invite.proof.empty')}</p>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <caption className="sr-only">{t('assembly.invite.proof.title')}</caption>
                                <thead>
                                    <tr className="border-b border-border text-xs text-muted-foreground">
                                        <th scope="col" className="py-1 pr-3">{t('assembly.col.name')}</th>
                                        <th scope="col" className="py-1 pr-3">{t('assembly.col.channel')}</th>
                                        <th scope="col" className="py-1">{t('assembly.col.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.id} className="border-b border-border/50">
                                            <td className="py-1 pr-3 text-foreground">{r.displayName ?? '—'}</td>
                                            <td className="py-1 pr-3 text-muted-foreground">{t(`assembly.channel.${r.channel}`)}</td>
                                            <td className="py-1 text-foreground">
                                                {t(`assembly.delivery.${r.status}`)}
                                                {r.errorCode && <span className="ml-1 text-xs text-muted-foreground">({t(deliveryReasonKey(r.errorCode))})</span>}
                                                {r.postedAt && <span className="ml-1 text-xs text-muted-foreground">{formatDate(r.postedAt, language)}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}

/**
 * Planning of the general assembly (Wave 11 W2): structured agenda, live check of the invitation period, recipient overview
 * (e-mail / account message / letter), sending with an optional documented exception, Nachtrag and the proof of delivery.
 */
export default function AssemblyPlanning({ clubId, meetingId, status, canSensitive, onOpenRules }: { clubId: string; meetingId: string; status: string; canSensitive: boolean; onOpenRules?: () => void }) {
    const { t, language } = useLanguage();
    const [preview, setPreview] = useState<InvitationPreview | null>(null);
    const [previewFailed, setPreviewFailed] = useState(false);
    const [invitations, setInvitations] = useState<InvitationRow[] | null>(null);
    const [audience, setAudience] = useState<'all_members' | 'voting_members'>('all_members');
    const [message, setMessage] = useState('');
    const [reason, setReason] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sentOk, setSentOk] = useState(false);
    const [agendaKey, setAgendaKey] = useState(0);
    const { confirm, dialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            const [p, inv] = await Promise.all([
                apiFetch<{ data: InvitationPreview }>(`/meetings/${meetingId}/invitations/preview?clubId=${clubId}&audience=${audience}`),
                apiFetch<{ data: InvitationRow[] }>(`/meetings/${meetingId}/invitations?clubId=${clubId}`),
            ]);
            setPreview(p.data);
            setInvitations(inv.data);
            setPreviewFailed(false);
        } catch {
            setPreviewFailed(true);
        }
    }, [clubId, meetingId, audience]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (previewFailed && !preview) return <LoadError onRetry={() => void load()} />;
    if (!preview || !invitations) return <LoadingText />;

    const blocker = sendBlocker(preview);
    const tooLate = blocker === 'too_late';
    const needsReason = tooLate;
    const canSend = status === 'geplant' && (blocker === null || (tooLate && reason.trim().length >= 5));
    const latestDay = preview.period.latestSendDay;

    async function send() {
        if (!preview) return;
        const ok = await confirm({
            title: t(preview.kind === 'nachtrag' ? 'assembly.invite.confirm.nachtrag' : 'assembly.invite.confirm.title'),
            body: t('assembly.invite.confirm.body', { total: preview.recipients.total, email: preview.recipients.email, inapp: preview.recipients.inapp, post: preview.recipients.post }),
            confirmLabel: t('assembly.invite.send'),
        });
        if (!ok) return;
        setSending(true);
        setError(null);
        setSentOk(false);
        try {
            await apiFetch(`/meetings/${meetingId}/invitations?clubId=${clubId}`, {
                method: 'POST',
                body: { audience, ...(message.trim() ? { message: message.trim() } : {}), ...(needsReason && reason.trim() ? { exceptionReason: reason.trim() } : {}) },
            });
            setMessage('');
            setReason('');
            setSentOk(true);
            setAgendaKey((k) => k + 1);
            await load();
        } catch (err) {
            const period = periodFromError(err);
            const missing = missingFromError(err);
            setError(
                period?.earliestMeetingDay
                    ? t('assembly.invite.err.period', { date: formatDate(period.earliestMeetingDay, language) })
                    : missing.length > 0
                      ? `${t(assemblyErrorKey(err))} ${missing.map((m) => t(`assembly.rule.${m}`)).join(', ')}`
                      : t(assemblyErrorKey(err)),
            );
            await load();
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="space-y-4">
            <AgendaEditor key={agendaKey} clubId={clubId} meetingId={meetingId} canEdit={status === 'geplant' || status === 'terminfindung'} />

            <SectionCard title={t('assembly.invite.title')}>
                <div className="space-y-3">
                    <Notice>{t('assembly.invite.assumption')}</Notice>

                    {preview.missingRules.length > 0 && (
                        <Notice tone="warning">
                            <p className="font-semibold">{t('assembly.invite.rulesMissing')}</p>
                            <ul className="mt-1 list-disc pl-5">
                                {preview.missingRules.map((m) => (
                                    <li key={m}>{t(`assembly.rule.${m}`)}</li>
                                ))}
                            </ul>
                            {onOpenRules ? (
                                <button type="button" onClick={onOpenRules} className="mt-2 text-sm font-medium text-primary underline">
                                    {t('assembly.invite.openRules')}
                                </button>
                            ) : (
                                <Link href="/verein" className="mt-2 inline-block text-sm font-medium text-primary underline">
                                    {t('assembly.invite.openRules')}
                                </Link>
                            )}
                        </Notice>
                    )}

                    {status !== 'geplant' && <Notice>{t('assembly.invite.notPlanned')}</Notice>}
                    {blocker === 'no_date' && <Notice tone="warning">{t('assembly.invite.noDate')}</Notice>}
                    {blocker === 'agenda_required' && <Notice tone="warning">{t('assembly.invite.agendaRequired')}</Notice>}
                    {blocker === 'nothing_new' && <Notice>{t('assembly.invite.nothingNew')}</Notice>}
                    {tooLate && (
                        <Notice tone="warning">
                            <p className="font-semibold">{t('assembly.invite.tooLate', { required: preview.period.requiredDays ?? 0, available: preview.period.daysAvailable ?? 0 })}</p>
                            <p className="mt-1">
                                {preview.period.earliestMeetingDay && t('assembly.invite.earliestMeeting', { date: formatDate(preview.period.earliestMeetingDay, language) })}{' '}
                                {latestDay && t('assembly.invite.latestSend', { date: formatDate(latestDay, language) })}
                            </p>
                        </Notice>
                    )}
                    {preview.period.ok && preview.period.latestSendDay && (
                        <p className="text-sm text-success">{t('assembly.invite.periodOk', { date: formatDate(preview.period.latestSendDay, language) })}</p>
                    )}

                    <div>
                        <p className={labelClass}>{t('assembly.invite.recipients')}</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <Tile label={t('assembly.invite.recipients.total')} value={preview.recipients.total} />
                            <Tile label={t('assembly.invite.recipients.email')} value={preview.recipients.email} />
                            <Tile label={t('assembly.invite.recipients.inapp')} value={preview.recipients.inapp} />
                            <Tile label={t('assembly.invite.recipients.post')} value={preview.recipients.post} />
                        </div>
                        {preview.recipients.sharedAddress > 0 && <p className="mt-1 text-xs text-muted-foreground">{t('assembly.invite.recipients.shared', { count: preview.recipients.sharedAddress })}</p>}
                        {preview.recipients.post > 0 && <p className="mt-1 text-xs text-muted-foreground">{t('assembly.invite.recipients.postHint')}</p>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="inv-audience" className={labelClass}>
                                {t('assembly.invite.audience')}
                            </label>
                            <select id="inv-audience" value={audience} onChange={(e) => setAudience(e.target.value as 'all_members' | 'voting_members')} className={inputClass}>
                                <option value="all_members">{t('assembly.invite.audience.all')}</option>
                                <option value="voting_members">{t('assembly.invite.audience.voting')}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="inv-message" className={labelClass}>
                            {t('assembly.invite.message')}
                        </label>
                        <textarea id="inv-message" rows={3} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass} />
                    </div>
                    {tooLate && (
                        <div>
                            <label htmlFor="inv-reason" className={labelClass}>
                                {t('assembly.invite.exception')} *
                            </label>
                            <textarea id="inv-reason" rows={2} minLength={5} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby="inv-reason-hint" className={inputClass} />
                            <p id="inv-reason-hint" className="mt-1 text-xs text-muted-foreground">
                                {t('assembly.invite.exception.hint')}
                            </p>
                        </div>
                    )}
                    {error && <ErrorText>{error}</ErrorText>}
                    {sentOk && (
                        <p role="status" className="text-sm text-success">
                            {t('assembly.invite.sent')}
                        </p>
                    )}
                    <button type="button" disabled={!canSend || sending} onClick={() => void send()} className={tooLate ? dangerBtn : primaryBtn}>
                        {t(preview.kind === 'nachtrag' ? 'assembly.invite.sendNachtrag' : tooLate ? 'assembly.invite.sendException' : 'assembly.invite.send')}
                    </button>
                </div>
            </SectionCard>

            <SectionCard title={t('assembly.invite.proof.title')}>
                {invitations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('assembly.invite.proof.none')}</p>
                ) : (
                    <ul className="space-y-2">
                        {[...invitations].reverse().map((inv) => (
                            <InvitationProof key={inv.id} clubId={clubId} meetingId={meetingId} invitation={inv} canSensitive={canSensitive} onChanged={() => void load()} />
                        ))}
                    </ul>
                )}
            </SectionCard>
            {dialog}
        </div>
    );
}
