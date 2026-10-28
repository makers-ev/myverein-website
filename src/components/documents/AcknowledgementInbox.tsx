'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileText, ShieldCheck } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { Chip, EmptyState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import type { Tone } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type AckStatus, type AcknowledgementDetail, type MyAcknowledgement, ackErrorKey, dueSoon, sortInbox } from '@/lib/acknowledgements';
import { formatDate, todayIso } from '@/lib/clubMembers';
import { clubQuery, downloadDocument, openPdf } from '@/lib/documents';

export const ACK_TONE: Record<AckStatus, Tone> = { offen: 'warning', bestaetigt: 'success', abgelehnt: 'muted', abgelaufen: 'destructive' };

/** Notice shown wherever a confirmation is given or listed: what the confirmation is (and is not). */
export function AckNotice() {
    const { t } = useLanguage();
    return (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t('docs.ack.notice')}</span>
        </p>
    );
}

/**
 * "Offene Bestätigungen" (Wave 13 W7): what the club asked the signed-in person to confirm, and for a child (guardian) what is asked
 * for the child. `onlyMemberId` narrows the list to one ward (family area). Minors with their own account see the request but the
 * guardian answers (`canAnswer` from the server).
 */
export default function AcknowledgementInbox({ clubId, onlyMemberId, onCount }: { clubId: string; onlyMemberId?: string; onCount?: (open: number) => void }) {
    const { t, language } = useLanguage();
    const [rows, setRows] = useState<MyAcknowledgement[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [answering, setAnswering] = useState<MyAcknowledgement | null>(null);
    const [showDone, setShowDone] = useState(false);
    // The parent passes an inline callback: keep the latest in a ref so it does not retrigger the load.
    const onCountRef = useRef(onCount);
    useEffect(() => {
        onCountRef.current = onCount;
    });

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const res = await apiFetch<{ data: MyAcknowledgement[] }>(`/acknowledgements/mine?${clubQuery(clubId)}&pageSize=100`);
            const list = onlyMemberId ? res.data.filter((r) => r.clubMemberId === onlyMemberId) : res.data;
            setRows(sortInbox(list));
            onCountRef.current?.(list.filter((r) => r.status === 'offen').length);
        } catch {
            setFailed(true);
        }
    }, [clubId, onlyMemberId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (failed) return <LoadError onRetry={() => void load()} />;
    if (!rows) return <LoadingText />;

    const open = rows.filter((r) => r.status === 'offen');
    const done = rows.filter((r) => r.status !== 'offen');
    const today = todayIso();

    const renderRow = (r: MyAcknowledgement) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.documentTitle}</p>
                <p className="text-xs text-muted-foreground">
                    {r.relation === 'guardian' ? `${t('docs.ack.forPerson', { name: r.personName })} · ` : ''}
                    {r.status === 'offen' && r.dueAt ? t('docs.ack.due', { date: formatDate(r.dueAt, language) }) : r.respondedAt ? formatDate(r.respondedAt, language) : formatDate(r.requestedAt, language)}
                </p>
            </div>
            {r.status === 'offen' && dueSoon(r.dueAt, today) && <Chip tone="warning">{t('docs.ack.dueSoon')}</Chip>}
            <Chip tone={ACK_TONE[r.status]}>{t(`docs.ack.status.${r.status}`)}</Chip>
            {r.status === 'offen' && (
                <button type="button" className={r.canAnswer ? primaryButtonClass : secondaryButtonClass} onClick={() => setAnswering(r)} aria-label={t('docs.ack.openNamed', { title: r.documentTitle })}>
                    {t(r.canAnswer ? 'docs.ack.answer' : 'docs.ack.view')}
                </button>
            )}
        </li>
    );

    return (
        <div className="space-y-4">
            <AckNotice />
            {open.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />} text={t(rows.length === 0 ? 'docs.ack.empty' : 'docs.ack.allDone')} />
            ) : (
                <section aria-label={t('docs.ack.open')}>
                    <h3 className="mb-2 text-sm font-bold text-foreground">{t('docs.ack.openCount', { count: open.length })}</h3>
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card">{open.map(renderRow)}</ul>
                </section>
            )}
            {done.length > 0 && (
                <section>
                    <button type="button" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)} className="text-sm font-bold text-foreground underline-offset-2 hover:underline">
                        {t(showDone ? 'docs.ack.hideDone' : 'docs.ack.showDone', { count: done.length })}
                    </button>
                    {showDone && <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">{done.map(renderRow)}</ul>}
                </section>
            )}
            {answering && (
                <AnswerDialog
                    clubId={clubId}
                    row={answering}
                    onClose={() => setAnswering(null)}
                    onAnswered={() => {
                        setAnswering(null);
                        void load();
                    }}
                />
            )}
        </div>
    );
}

function AnswerDialog({ clubId, row, onClose, onAnswered }: { clubId: string; row: MyAcknowledgement; onClose: () => void; onAnswered: () => void }) {
    const { t } = useLanguage();
    const q = clubQuery(clubId);
    const [detail, setDetail] = useState<AcknowledgementDetail | null>(null);
    const [failed, setFailed] = useState(false);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: AcknowledgementDetail }>(`/acknowledgements/${encodeURIComponent(row.id)}?${q}`)
            .then((res) => !cancelled && setDetail(res.data))
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, [row.id, q]);

    async function viewDocument() {
        setError(null);
        try {
            const path = `/acknowledgements/${encodeURIComponent(row.id)}/document?${q}`;
            if (detail?.mimeType === 'application/pdf') await openPdf(path);
            else await downloadDocument(path, row.documentTitle);
        } catch (err) {
            setError(t(ackErrorKey(err)));
        }
    }

    async function decide(decision: 'bestaetigt' | 'abgelehnt') {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/acknowledgements/${encodeURIComponent(row.id)}/confirm?${q}`, { method: 'POST', body: { decision, ...(row.requiresReauth ? { password } : {}) } });
            onAnswered();
        } catch (err) {
            setError(t(ackErrorKey(err)));
            setBusy(false);
        }
    }

    const canAnswer = row.canAnswer && !!detail?.canAnswer;
    return (
        <Modal
            open
            onClose={onClose}
            title={row.documentTitle}
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className={secondaryButtonClass} onClick={onClose}>
                        {t('docs.gen.close')}
                    </button>
                    {canAnswer && (
                        <>
                            <button type="button" className={secondaryButtonClass} disabled={busy || (row.requiresReauth && !password)} onClick={() => void decide('abgelehnt')}>
                                {t('docs.ack.decline')}
                            </button>
                            <button type="button" className={primaryButtonClass} disabled={busy || (row.requiresReauth && !password)} onClick={() => void decide('bestaetigt')}>
                                {t('docs.ack.confirm')}
                            </button>
                        </>
                    )}
                </div>
            }
        >
            {failed ? (
                <LoadError onRetry={onClose} />
            ) : !detail ? (
                <LoadingText />
            ) : (
                <div className="space-y-3">
                    {row.relation === 'guardian' && <p className="text-sm font-medium text-foreground">{t('docs.ack.forPerson', { name: row.personName })}</p>}
                    <button type="button" className={secondaryButtonClass} onClick={() => void viewDocument()}>
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {t('docs.ack.readDocument', { version: row.versionNo })}
                    </button>
                    {!row.isCurrentVersion && <p className="text-xs text-warning">{t('docs.ack.oldVersion')}</p>}
                    <blockquote className="rounded-lg border-l-4 border-primary bg-muted/50 px-3 py-2 text-sm text-foreground">{detail.wording}</blockquote>
                    {!row.canAnswer && (
                        <p className="text-sm text-muted-foreground">{t(row.status === 'offen' ? 'docs.ack.guardianAnswers' : 'docs.ack.closed')}</p>
                    )}
                    {canAnswer && row.requiresReauth && (
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.ack.password')}</span>
                            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                            <span className="mt-1 block text-xs text-muted-foreground">{t('docs.ack.passwordHint')}</span>
                        </label>
                    )}
                    <AckNotice />
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}
