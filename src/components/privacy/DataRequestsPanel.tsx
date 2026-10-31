'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type DataSubjectRequest, REQUEST_KINDS, REQUEST_STATUSES, deadlineTone, isOpenRequest, privacyErrorKey } from '@/lib/privacyAdmin';
import { Chip, EmptyState, SectionCard } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';
import MemberPrivacyDialog from './MemberPrivacyDialog';

const PAGE_SIZE = 25;

/** "12 days left" / "3 days overdue" for an open request; nothing for a closed one. */
function DeadlineChip({ r }: { r: DataSubjectRequest }) {
    const { t } = useLanguage();
    if (!isOpenRequest(r)) return null;
    const days = r.daysLeft ?? 0;
    return <Chip tone={deadlineTone(r)}>{r.overdue || days < 0 ? t('privacy.requests.overdue', { count: Math.abs(days) }) : t('privacy.requests.daysLeft', { count: days })}</Chip>;
}

function Actions({ clubId, request, onChanged }: { clubId: string; request: DataSubjectRequest; onChanged: () => void }) {
    const { t } = useLanguage();
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function patch(status: 'in_progress' | 'done' | 'rejected') {
        if (status === 'rejected' && !reason.trim()) {
            setError(t('privacy.requests.reasonRequired'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/data-subject-requests/${encodeURIComponent(request.id)}?clubId=${encodeURIComponent(clubId)}`, { method: 'PATCH', body: { status, ...(status === 'rejected' ? { result: reason.trim() } : {}) } });
            onChanged();
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    if (!isOpenRequest(request)) return null;
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {request.status === 'open' && (
                    <button type="button" disabled={busy} onClick={() => void patch('in_progress')} className={secondaryButtonClass}>
                        {t('privacy.requests.start')}
                    </button>
                )}
                <button type="button" disabled={busy} onClick={() => void patch('done')} className={secondaryButtonClass}>
                    {t('privacy.requests.done')}
                </button>
                <button type="button" disabled={busy} onClick={() => setRejecting((v) => !v)} className={secondaryButtonClass}>
                    {t('privacy.requests.reject')}
                </button>
            </div>
            {rejecting && (
                <div className="space-y-2">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.requests.reason')}</span>
                        <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} className={inputClass} />
                    </label>
                    <p className="text-xs text-muted-foreground">{t('privacy.requests.reasonHint')}</p>
                    <button type="button" disabled={busy} onClick={() => void patch('rejected')} className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                        {t('privacy.requests.rejectConfirm')}
                    </button>
                </div>
            )}
            {error && (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}

/**
 * Data subject requests of the club (Wave 10 W5, `privacy:read`; processing `privacy:manage`): access, erasure and rectification
 * requests with the one-month deadline as a traffic light (green, yellow up to 14 days, red up to 3 days or overdue). Soonest
 * deadline first. A request is opened in the member file (export, erasure plan) and then closed here; a rejection needs a
 * reason without personal data.
 */
export default function DataRequestsPanel({ clubId, permissions }: { clubId: string; permissions: readonly string[] }) {
    const { t, language } = useLanguage();
    const canManage = permissions.includes('privacy:manage');
    const [status, setStatus] = useState('');
    const [kind, setKind] = useState('');
    const [overdue, setOverdue] = useState(false);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<{ data: DataSubjectRequest[]; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<DataSubjectRequest | null>(null);

    const load = useCallback(async () => {
        setError(null);
        const params = new URLSearchParams({ clubId, page: String(page), pageSize: String(PAGE_SIZE) });
        if (status) params.set('status', status);
        if (kind) params.set('kind', kind);
        if (overdue) params.set('overdue', 'true');
        try {
            setResult(await apiFetch<{ data: DataSubjectRequest[]; total: number }>(`/data-subject-requests?${params.toString()}`));
        } catch (err) {
            setResult(null);
            setError(t(privacyErrorKey(err)));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, page, status, kind, overdue]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const pages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

    return (
        <SectionCard title={t('privacy.requests.title')}>
            <p className="mb-3 text-sm text-muted-foreground">{t('privacy.requests.intro')}</p>
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.requests.status')}</span>
                    <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClass}>
                        <option value="">{t('privacy.requests.all')}</option>
                        {REQUEST_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {t(`privacy.request.status.${s}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.requests.kind')}</span>
                    <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className={inputClass}>
                        <option value="">{t('privacy.requests.all')}</option>
                        {REQUEST_KINDS.map((k) => (
                            <option key={k} value={k}>
                                {t(`privacy.request.kind.${k}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
                    <input type="checkbox" checked={overdue} onChange={(e) => { setOverdue(e.target.checked); setPage(1); }} />
                    {t('privacy.requests.onlyOverdue')}
                </label>
            </div>

            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : !result ? (
                <LoadingText />
            ) : result.data.length === 0 ? (
                <EmptyState icon={<span aria-hidden>✓</span>} text={t('privacy.requests.empty')} />
            ) : (
                <ul className="space-y-3">
                    {result.data.map((r) => (
                        <li key={r.id} className="rounded-lg border border-border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">{r.memberName ?? t('privacy.requests.erasedMember')}</span>
                                <span className="flex flex-wrap items-center gap-1.5">
                                    <Chip tone="primary">{t(`privacy.request.kind.${r.kind}`)}</Chip>
                                    <Chip tone={isOpenRequest(r) ? 'warning' : r.status === 'done' ? 'success' : 'muted'}>{t(`privacy.request.status.${r.status}`)}</Chip>
                                    <DeadlineChip r={r} />
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('privacy.requests.dates', { received: formatDate(r.receivedAt, language), due: formatDate(r.dueAt, language) })}
                                {r.completedAt ? ` · ${t('privacy.requests.completed', { date: formatDate(r.completedAt, language) })}` : ''}
                            </p>
                            {r.result && <p className="mt-1 text-sm text-foreground">{r.result}</p>}
                            <div className="mt-2 space-y-2">
                                {r.memberName && (
                                    <button type="button" onClick={() => setFile(r)} className="text-sm font-medium text-primary underline">
                                        {t('privacy.requests.openFile')}
                                    </button>
                                )}
                                {canManage && <Actions clubId={clubId} request={r} onChanged={() => void load()} />}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {pages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                    <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={secondaryButtonClass}>
                        {t('privacy.paging.prev')}
                    </button>
                    <span className="text-muted-foreground">{t('privacy.paging.of', { page, pages, total: result?.total ?? 0 })}</span>
                    <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className={secondaryButtonClass}>
                        {t('privacy.paging.next')}
                    </button>
                </div>
            )}

            {file && (
                <MemberPrivacyDialog
                    clubId={clubId}
                    clubMemberId={file.clubMemberId}
                    name={file.memberName ?? '—'}
                    permissions={permissions}
                    onClose={() => {
                        setFile(null);
                        void load();
                    }}
                    onErased={() => void load()}
                />
            )}
        </SectionCard>
    );
}
