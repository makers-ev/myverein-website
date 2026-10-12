'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, DoorOpen, Gavel, KeyRound, Package } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { Chip, EmptyState, errorMessage, type Tone } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import {
    type ClubMember,
    formatDate,
    inputClass,
    isLeftStatus,
    primaryButtonClass,
    secondaryButtonClass,
    todayIso,
} from '@/lib/clubMembers';
import {
    canWithdraw,
    DECIDED_STATUSES,
    EXIT_KINDS,
    type ExitKind,
    type ExitRequest,
    type ExitRequestDetail,
    type ExitStatus,
    type NoticePreview,
    proposedDate,
} from '@/lib/memberLifecycle';

type Bucket = 'pending' | 'decided';
type Dialog = { type: 'review'; id: string } | { type: 'withdraw'; request: ExitRequest } | { type: 'direct' } | null;

const PAGE_SIZE = 25;
const statusTone: Record<ExitStatus, Tone> = { pending: 'warning', approved: 'primary', rejected: 'destructive', withdrawn: 'muted' };
const dangerButtonClass = 'rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50';

/**
 * Board queue of cancellations / exclusions (Wave 7 W4, tab "Austritte", only with `members:write`). Two buckets:
 * "Offen" (`status=pending`) and "Entschieden" (approved / rejected / withdrawn, one status at a time because the
 * backend filters by a single status and pages server-side). Decisions and the direct entry of a cancellation or
 * exclusion go through `/club-exit-requests`; the backend enforces four-eyes, owner and chairperson protection.
 */
export default function ExitQueuePanel({
    clubId,
    ownMemberId,
    ownClubMemberId,
    canProtectedExit,
    onChanged,
}: {
    clubId: string;
    /** Better Auth member id of the caller: the requester never decides their own request. */
    ownMemberId: string | null;
    /** `club_members.id` of the caller: the board cannot exclude or record an exit for itself here. */
    ownClubMemberId: string | null;
    onChanged: () => void;
    canProtectedExit: boolean;
}) {
    const { t, language } = useLanguage();
    const [bucket, setBucket] = useState<Bucket>('pending');
    const [decidedStatus, setDecidedStatus] = useState<ExitStatus>('approved');
    const [kind, setKind] = useState<ExitKind | ''>('');
    const [page, setPage] = useState(1);
    const [state, setState] = useState<{ rows: ExitRequest[]; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dialog, setDialog] = useState<Dialog>(null);
    const [version, setVersion] = useState(0);
    const requestId = useRef(0);

    const status: ExitStatus = bucket === 'pending' ? 'pending' : decidedStatus;

    const load = useCallback(async () => {
        const id = ++requestId.current;
        setError(null);
        try {
            const query = new URLSearchParams({ clubId, status, page: String(page), pageSize: String(PAGE_SIZE) });
            if (kind) query.set('kind', kind);
            const res = await apiFetch<{ data: ExitRequest[]; total: number }>(`/club-exit-requests?${query.toString()}`);
            if (id === requestId.current) setState({ rows: res.data, total: res.total });
        } catch (err) {
            if (id === requestId.current) setError(errorMessage(err, t));
        }
        // Language switches must not refetch; the error text of a failed load is replaced by the next load anyway.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, status, page, kind]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load, version]);

    function refresh() {
        setVersion((v) => v + 1);
        onChanged();
    }

    function changeBucket(next: Bucket) {
        setBucket(next);
        setPage(1);
        setState(null);
    }

    const today = todayIso();
    const pages = state ? Math.max(1, Math.ceil(state.total / PAGE_SIZE)) : 1;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div role="group" aria-label={t('verein.exit.queue.bucket')} className="flex rounded-lg border border-border p-0.5">
                    {(['pending', 'decided'] as const).map((b) => (
                        <button
                            key={b}
                            type="button"
                            aria-pressed={bucket === b}
                            onClick={() => changeBucket(b)}
                            className={`rounded-md px-3 py-1 text-sm font-medium ${bucket === b ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
                        >
                            {t(`verein.exit.queue.${b}`)}
                        </button>
                    ))}
                </div>
                {bucket === 'decided' && (
                    <select
                        aria-label={t('verein.exit.queue.statusFilter')}
                        value={decidedStatus}
                        onChange={(e) => {
                            setDecidedStatus(e.target.value as ExitStatus);
                            setPage(1);
                            setState(null);
                        }}
                        className={`${inputClass} !w-auto`}
                    >
                        {DECIDED_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {t(`verein.exit.status.${s}`)}
                            </option>
                        ))}
                    </select>
                )}
                <select
                    aria-label={t('verein.exit.queue.kindFilter')}
                    value={kind}
                    onChange={(e) => {
                        setKind(e.target.value as ExitKind | '');
                        setPage(1);
                        setState(null);
                    }}
                    className={`${inputClass} !w-auto`}
                >
                    <option value="">{t('verein.exit.queue.kind.all')}</option>
                    {EXIT_KINDS.map((k) => (
                        <option key={k} value={k}>
                            {t(`verein.exit.kind.${k}`)}
                        </option>
                    ))}
                </select>
                <button type="button" onClick={() => setDialog({ type: 'direct' })} className={`ml-auto ${primaryButtonClass}`}>
                    <Gavel className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
                    {t('verein.exit.direct.open')}
                </button>
            </div>

            {error ? (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}{' '}
                    <button type="button" onClick={() => setVersion((v) => v + 1)} className="font-semibold underline">
                        {t('verein.common.retry')}
                    </button>
                </div>
            ) : state === null ? (
                <p role="status" className="text-sm text-muted-foreground">
                    {t('verein.exit.queue.loading')}
                </p>
            ) : state.rows.length === 0 ? (
                <EmptyState icon={<DoorOpen className="h-6 w-6" aria-hidden="true" />} text={t(bucket === 'pending' ? 'verein.exit.queue.empty.pending' : 'verein.exit.queue.empty.decided')} />
            ) : (
                <ul className="space-y-2">
                    {state.rows.map((r) => (
                        <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground">{r.memberName ?? '—'}</span>
                                <Chip tone={r.kind === 'exclusion' ? 'destructive' : 'primary'}>{t(`verein.exit.kind.${r.kind}`)}</Chip>
                                <Chip tone={statusTone[r.status]}>{t(`verein.exit.status.${r.status}`)}</Chip>
                                {!r.hasAccount && <Chip tone="muted">{t('verein.exit.noAccount')}</Chip>}
                                <div className="ml-auto flex flex-wrap gap-2">
                                    {r.status === 'pending' && (
                                        <button type="button" onClick={() => setDialog({ type: 'review', id: r.id })} className={secondaryButtonClass}>
                                            {t('verein.exit.review')}
                                        </button>
                                    )}
                                    {canWithdraw(r, today) && (
                                        <button type="button" onClick={() => setDialog({ type: 'withdraw', request: r })} className={secondaryButtonClass}>
                                            {t('verein.exit.withdraw')}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                                <div>
                                    {t('verein.exit.requestedOn')}: {formatDate(r.requestedOn, language)}
                                </div>
                                {r.status === 'pending' && r.kind === 'cancellation' && (
                                    <>
                                        <div>
                                            {t('verein.exit.desired')}: {formatDate(r.desiredEffectiveOn, language)}
                                        </div>
                                        <div>
                                            {t('verein.exit.earliest')}: {formatDate(r.earliestEffectiveOn, language)}
                                        </div>
                                    </>
                                )}
                                {r.effectiveOn && (
                                    <div>
                                        {t('verein.exit.effectiveOn')}: {formatDate(r.effectiveOn, language)}
                                    </div>
                                )}
                                {r.reason && (
                                    <div className="sm:col-span-2">
                                        {t('verein.exit.reason')}: {r.reason}
                                    </div>
                                )}
                                {r.decisionNote && (
                                    <div className="sm:col-span-2">
                                        {t('verein.exit.decisionNote')}: {r.decisionNote}
                                    </div>
                                )}
                            </dl>
                        </li>
                    ))}
                </ul>
            )}

            {state && state.total > PAGE_SIZE && (
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <button type="button" aria-label={t('verein.exit.queue.prev')} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded p-1 hover:bg-muted disabled:opacity-40">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>{t('verein.exit.queue.page', { page, pages })}</span>
                    <button type="button" aria-label={t('verein.exit.queue.next')} disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded p-1 hover:bg-muted disabled:opacity-40">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}

            {dialog?.type === 'review' && (
                <ReviewDialog
                    clubId={clubId}
                    id={dialog.id}
                    ownMemberId={ownMemberId}
                    onClose={() => setDialog(null)}
                    onDone={() => {
                        setDialog(null);
                        refresh();
                    }}
                />
            )}
            {dialog?.type === 'withdraw' && (
                <BoardWithdrawDialog
                    clubId={clubId}
                    request={dialog.request}
                    onClose={() => setDialog(null)}
                    onDone={() => {
                        setDialog(null);
                        refresh();
                    }}
                />
            )}
            {dialog?.type === 'direct' && (
                <DirectExitDialog
                    clubId={clubId}
                    canProtectedExit={canProtectedExit}
                    ownClubMemberId={ownClubMemberId}
                    onClose={() => setDialog(null)}
                    onDone={() => {
                        setDialog(null);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}

/** Return checklist: open loans and key entries of the member's account (computed live by the backend). */
function Checklist({ detail }: { detail: ExitRequestDetail }) {
    const { t, language } = useLanguage();
    const list = detail.checklist;
    return (
        <section aria-labelledby="exit-checklist" className="mt-4 rounded-lg border border-border p-3">
            <h3 id="exit-checklist" className="text-sm font-bold text-foreground">
                {t('verein.exit.checklist.title')}
            </h3>
            {!detail.hasAccount ? (
                <p className="mt-1 text-xs text-muted-foreground">{t('verein.exit.checklist.noAccount')}</p>
            ) : list.isEmpty ? (
                <p className="mt-1 text-xs text-success">{t('verein.exit.checklist.empty')}</p>
            ) : (
                <>
                    <p className="mt-1 text-xs text-muted-foreground">{t('verein.exit.checklist.hint')}</p>
                    {list.openLoans.length > 0 && (
                        <div className="mt-2">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <Package className="h-3.5 w-3.5" aria-hidden="true" /> {t('verein.exit.checklist.loans')}
                            </h4>
                            <ul className="mt-1 space-y-1 text-sm text-foreground">
                                {list.openLoans.map((l) => (
                                    <li key={l.id} className="flex flex-wrap items-center gap-2">
                                        <span>{l.itemName}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {t('verein.exit.checklist.since', { date: formatDate(l.borrowedAt, language) })}
                                        </span>
                                        {l.overdue && <Chip tone="destructive">{t('verein.exit.checklist.overdue')}</Chip>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {list.keys.length > 0 && (
                        <div className="mt-2">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> {t('verein.exit.checklist.keys')}
                            </h4>
                            <ul className="mt-1 space-y-1 text-sm text-foreground">
                                {list.keys.map((k) => (
                                    <li key={k.id}>{k.locationName}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

function ReviewDialog({
    clubId,
    id,
    ownMemberId,
    onClose,
    onDone,
}: {
    clubId: string;
    id: string;
    ownMemberId: string | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const { t, language } = useLanguage();
    const [detail, setDetail] = useState<ExitRequestDetail | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mode, setMode] = useState<'approve' | 'reject'>('approve');
    const [date, setDate] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: ExitRequestDetail }>(`/club-exit-requests/${id}?clubId=${clubId}`)
            .then((res) => {
                if (cancelled) return;
                setDetail(res.data);
                setDate(proposedDate(res.data) ?? todayIso());
            })
            .catch((err: unknown) => {
                if (!cancelled) setLoadError(errorMessage(err, t));
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, id, attempt]);

    const own = !!detail && ownMemberId !== null && detail.requestedBy === ownMemberId;
    const cancellation = detail?.kind === 'cancellation';
    const dateInvalid = !!detail && !!date && (cancellation ? date < (detail.earliestEffectiveOn ?? '') : date > todayIso());
    const noteMissing = mode === 'reject' && !note.trim();

    async function submit() {
        if (!detail) return;
        setBusy(true);
        setError(null);
        try {
            if (mode === 'approve') {
                await apiFetch(`/club-exit-requests/${id}/approve?clubId=${clubId}`, {
                    method: 'POST',
                    body: { ...(date ? { effectiveOn: date } : {}), ...(note.trim() ? { note: note.trim() } : {}) },
                });
            } else {
                await apiFetch(`/club-exit-requests/${id}/reject?clubId=${clubId}`, { method: 'POST', body: { note: note.trim() } });
            }
            onDone();
        } catch (err) {
            setError(errorMessage(err, t));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            size="lg"
            onClose={busy ? () => {} : onClose}
            title={detail ? t('verein.exit.review.title', { name: detail.memberName ?? '—' }) : t('verein.exit.review')}
            footer={
                detail && !own ? (
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                            {t('verein.roles.add.cancel')}
                        </button>
                        <button
                            type="button"
                            onClick={() => void submit()}
                            disabled={busy || noteMissing || (mode === 'approve' && dateInvalid)}
                            className={mode === 'approve' ? primaryButtonClass : dangerButtonClass}
                        >
                            {mode === 'approve' ? t('verein.exit.approve') : t('verein.exit.reject')}
                        </button>
                    </div>
                ) : undefined
            }
        >
            {loadError ? (
                <p role="alert" className="text-sm text-destructive">
                    {loadError}{' '}
                    <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => {
                            setLoadError(null);
                            setAttempt((n) => n + 1);
                        }}
                    >
                        {t('verein.common.retry')}
                    </button>
                </p>
            ) : !detail ? (
                <p role="status" className="text-sm text-muted-foreground">
                    {t('verein.exit.queue.loading')}
                </p>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip tone={detail.kind === 'exclusion' ? 'destructive' : 'primary'}>{t(`verein.exit.kind.${detail.kind}`)}</Chip>
                        <span className="text-sm text-muted-foreground">
                            {t('verein.exit.requestedOn')}: {formatDate(detail.requestedOn, language)}
                        </span>
                    </div>
                    <dl className="mt-3 space-y-1 text-sm text-foreground">
                        {cancellation && (
                            <>
                                <div>
                                    {t('verein.exit.desired')}: {formatDate(detail.desiredEffectiveOn, language)}
                                </div>
                                <div>
                                    {t('verein.exit.earliest')}: {formatDate(detail.earliestEffectiveOn, language)}
                                </div>
                            </>
                        )}
                        {detail.reason && (
                            <div>
                                {t('verein.exit.reason')}: {detail.reason}
                            </div>
                        )}
                    </dl>

                    <Checklist detail={detail} />

                    {own ? (
                        <p role="status" className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                            {t('verein.exit.selfApproval')}
                        </p>
                    ) : (
                        <>
                            <fieldset className="mt-4">
                                <legend className="text-xs font-semibold text-muted-foreground">{t('verein.exit.decision')}</legend>
                                <div className="mt-1 flex gap-2">
                                    {(['approve', 'reject'] as const).map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            aria-pressed={mode === m}
                                            onClick={() => setMode(m)}
                                            className={`rounded-full border px-3 py-1 text-sm ${mode === m ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'}`}
                                        >
                                            {t(`verein.exit.decision.${m}`)}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            {mode === 'approve' && (
                                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                                    {t('verein.exit.effectiveOn')}
                                    <input
                                        type="date"
                                        value={date}
                                        min={cancellation ? (detail.earliestEffectiveOn ?? undefined) : undefined}
                                        max={cancellation ? undefined : todayIso()}
                                        onChange={(e) => setDate(e.target.value)}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                    <span className="mt-1 block text-xs font-normal">
                                        {cancellation ? t('verein.exit.effectiveOn.hint') : t('verein.exit.effectiveOn.exclusionHint')}
                                    </span>
                                </label>
                            )}
                            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                                {mode === 'reject' ? t('verein.exit.note.required') : t('verein.exit.note')}
                                <textarea value={note} maxLength={1000} rows={3} onChange={(e) => setNote(e.target.value)} className={`mt-1 ${inputClass}`} />
                            </label>
                        </>
                    )}
                    {error && (
                        <p role="alert" className="mt-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </>
            )}
        </Modal>
    );
}

function BoardWithdrawDialog({ clubId, request, onClose, onDone }: { clubId: string; request: ExitRequest; onClose: () => void; onDone: () => void }) {
    const { t, language } = useLanguage();
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/club-exit-requests/${request.id}/withdraw?clubId=${clubId}`, { method: 'POST', body: note.trim() ? { note: note.trim() } : {} });
            onDone();
        } catch (err) {
            setError(errorMessage(err, t));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('verein.exit.withdraw.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button type="button" onClick={() => void submit()} disabled={busy} className={primaryButtonClass}>
                        {t('verein.exit.withdraw.submit')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">
                {request.status === 'pending'
                    ? t('verein.exit.withdraw.board.pending', { name: request.memberName ?? '—' })
                    : t('verein.exit.withdraw.board.scheduled', { name: request.memberName ?? '—', date: formatDate(request.effectiveOn, language) })}
            </p>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                {t('verein.exit.note')}
                <textarea value={note} maxLength={1000} rows={2} onChange={(e) => setNote(e.target.value)} className={`mt-1 ${inputClass}`} />
            </label>
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}

/** Direct entry by the board: a cancellation received on paper / by mail, or an exclusion (reason required). */
function DirectExitDialog({
    clubId,
    canProtectedExit,
    ownClubMemberId,
    onClose,
    onDone,
}: {
    clubId: string;
    canProtectedExit: boolean;
    ownClubMemberId: string | null;
    onClose: () => void;
    onDone: () => void;
}) {
    const { t } = useLanguage();
    const [kind, setKind] = useState<ExitKind>('cancellation');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ClubMember[] | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selected, setSelected] = useState<ClubMember | null>(null);
    const [earliest, setEarliest] = useState<string | null>(null);
    const [date, setDate] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: NoticePreview }>(`/club-exit-requests/preview?clubId=${clubId}`)
            .then((res) => {
                if (!cancelled) setEarliest(res.data.earliestEffectiveOn);
            })
            .catch(() => {
                // Without the preview the date field is simply left empty: the backend then uses the earliest date itself.
            });
        return () => {
            cancelled = true;
        };
    }, [clubId]);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResults(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(() => {
            setSearchError(null);
            apiFetch<{ data: ClubMember[] }>(`/club-members?clubId=${clubId}&q=${encodeURIComponent(q)}&pageSize=8&sort=name`)
                .then((res) => {
                    if (!cancelled) setResults(res.data.filter((m) => !isLeftStatus(m.effectiveStatus) && m.id !== ownClubMemberId));
                })
                .catch((err: unknown) => {
                    if (!cancelled) setSearchError(errorMessage(err, t));
                });
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, clubId, ownClubMemberId]);

    const exclusion = kind === 'exclusion';
    const today = todayIso();
    const dateInvalid = !!date && (exclusion ? date > today : !!earliest && date < earliest);
    const canSubmit = !!selected && !busy && !dateInvalid && (!exclusion || reason.trim().length > 0);

    async function submit() {
        if (!selected) return;
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/club-exit-requests?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    clubMemberId: selected.id,
                    kind,
                    ...(reason.trim() ? { reason: reason.trim() } : {}),
                    ...(date ? { effectiveOn: date } : {}),
                },
            });
            onDone();
        } catch (err) {
            setError(errorMessage(err, t));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            size="lg"
            onClose={busy ? () => {} : onClose}
            title={t('verein.exit.direct.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button type="button" onClick={() => void submit()} disabled={!canSubmit} className={exclusion ? dangerButtonClass : primaryButtonClass}>
                        {exclusion ? t('verein.exit.direct.submit.exclusion') : t('verein.exit.direct.submit.cancellation')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-muted-foreground">{t('verein.exit.direct.body')}</p>

            <fieldset className="mt-4">
                <legend className="text-xs font-semibold text-muted-foreground">{t('verein.exit.direct.kind')}</legend>
                <div className="mt-1 flex gap-2">
                    {EXIT_KINDS.map((k) => (
                        <button
                            key={k}
                            type="button"
                            aria-pressed={kind === k}
                            onClick={() => {
                                setKind(k);
                                setDate('');
                            }}
                            className={`rounded-full border px-3 py-1 text-sm ${kind === k ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'}`}
                        >
                            {t(`verein.exit.kind.${k}`)}
                        </button>
                    ))}
                </div>
            </fieldset>

            <div className="mt-4">
                {selected ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                        <span className="font-medium text-foreground">{selected.name ?? '—'}</span>
                        <button type="button" onClick={() => setSelected(null)} className="text-xs font-semibold text-primary underline">
                            {t('verein.exit.direct.change')}
                        </button>
                    </div>
                ) : (
                    <>
                        <label className="block text-xs font-semibold text-muted-foreground">
                            {t('verein.exit.direct.member')}
                            <input
                                type="search"
                                value={query}
                                autoComplete="off"
                                placeholder={t('verein.exit.direct.search')}
                                onChange={(e) => setQuery(e.target.value)}
                                className={`mt-1 ${inputClass}`}
                            />
                        </label>
                        {searchError && (
                            <p role="alert" className="mt-1 text-xs text-destructive">
                                {searchError}
                            </p>
                        )}
                        {results && results.length === 0 && <p className="mt-1 text-xs text-muted-foreground">{t('verein.exit.direct.noResults')}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">{t('verein.exit.direct.selfHint')}</p>
                        {results && results.length > 0 && (
                            <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
                                {results.map((m) => (
                                    <li key={m.id}>
                                        <button type="button" onClick={() => setSelected(m)} className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted">
                                            {m.name ?? '—'}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>

            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                {t('verein.exit.effectiveOn')}
                <input
                    type="date"
                    value={date}
                    min={exclusion ? undefined : (earliest ?? undefined)}
                    max={exclusion ? today : undefined}
                    onChange={(e) => setDate(e.target.value)}
                    className={`mt-1 ${inputClass}`}
                />
                <span className="mt-1 block text-xs font-normal">
                    {exclusion ? t('verein.exit.effectiveOn.exclusionHint') : t('verein.exit.direct.dateHint')}
                </span>
            </label>

            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                {exclusion ? t('verein.exit.direct.reason.required') : t('verein.exit.dialog.reason')}
                <textarea value={reason} maxLength={2000} rows={3} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${inputClass}`} />
            </label>

            {!canProtectedExit && <p className="mt-3 text-xs text-muted-foreground">{t('verein.exit.direct.protectedHint')}</p>}
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}
