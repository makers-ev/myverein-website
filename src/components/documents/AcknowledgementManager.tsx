'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { BellRing, Download, ListChecks, Plus } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { Chip, EmptyState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type AckStatus, type AckSummary, type ManagedAcknowledgement, ackErrorKey, answeredPercent } from '@/lib/acknowledgements';
import { formatDate, todayIso } from '@/lib/clubMembers';
import { PROOF_SOURCE_MAX } from '@/lib/consents';
import { clubQuery, downloadDocument } from '@/lib/documents';
import { ACK_TONE, AckNotice } from './AcknowledgementInbox';
import { GenerateAction } from './GenerateDialog';
import RequestAcknowledgementDialog from './RequestAcknowledgementDialog';

const STATUSES: AckStatus[] = ['offen', 'bestaetigt', 'abgelehnt', 'abgelaufen'];
const PAGE_SIZE = 50;

interface Overview {
    data: ManagedAcknowledgement[];
    summary: AckSummary;
    total: number;
}

/**
 * Overview of the requested confirmations for the people who manage the documents (Wave 13 W7): status per person, "Erinnern",
 * the evidence export (CSV and PDF protocol) and the paper proof for adults without an account.
 */
export default function AcknowledgementManager({ clubId, departments }: { clubId: string; departments: { id: string; name: string }[] }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const q = clubQuery(clubId);
    const [docId, setDocId] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [view, setView] = useState<Overview | null>(null);
    const [known, setKnown] = useState<Map<string, string>>(new Map());
    const [failed, setFailed] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [requesting, setRequesting] = useState(false);
    const [paper, setPaper] = useState<ManagedAcknowledgement | null>(null);
    const [reload, setReload] = useState(0);
    const filterId = useId();

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const params = new URLSearchParams({ clubId, page: String(page), pageSize: String(PAGE_SIZE) });
            if (docId) params.set('documentId', docId);
            if (status) params.set('status', status);
            const res = await apiFetch<Overview>(`/acknowledgements?${params.toString()}`);
            setView(res);
            setKnown((prev) => {
                const next = new Map(prev);
                for (const r of res.data) next.set(r.documentId, r.documentTitle);
                return next;
            });
        } catch {
            setFailed(true);
        }
    }, [clubId, docId, status, page]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load, reload]);

    const refresh = () => setReload((n) => n + 1);

    async function remind() {
        if (!docId) return;
        if (!(await confirm({ title: t('docs.ack.mgr.remind'), body: t('docs.ack.mgr.remind.body'), confirmLabel: t('docs.ack.mgr.remind') }))) return;
        try {
            const res = await apiFetch<{ data: { reminded: number } }>(`/acknowledgements/remind?${q}`, { method: 'POST', body: { documentId: docId } });
            setMessage({ text: t('docs.ack.mgr.reminded', { count: res.data.reminded }), error: false });
        } catch (err) {
            setMessage({ text: t(ackErrorKey(err)), error: true });
        }
    }

    async function exportCsv() {
        try {
            await downloadDocument(`/acknowledgements/export.csv?${q}&documentId=${encodeURIComponent(docId)}`, 'bestaetigungen.csv');
        } catch (err) {
            setMessage({ text: t(ackErrorKey(err)), error: true });
        }
    }

    const titleOf = (id: string) => known.get(id) ?? '';
    const totalPages = view ? Math.max(1, Math.ceil(view.total / PAGE_SIZE)) : 1;

    return (
        <section aria-label={t('docs.ack.mgr.title')} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold text-foreground">{t('docs.ack.mgr.title')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t('docs.ack.mgr.intro')}</p>
                </div>
                <button type="button" className={primaryButtonClass} onClick={() => setRequesting(true)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('docs.ack.request.open')}
                </button>
            </div>
            <AckNotice />

            <div className="flex flex-wrap gap-3">
                <label className="block min-w-48" htmlFor={`${filterId}-doc`}>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.ack.mgr.document')}</span>
                    <select
                        id={`${filterId}-doc`}
                        value={docId}
                        onChange={(e) => {
                            setDocId(e.target.value);
                            setPage(1);
                        }}
                        className={inputClass}
                    >
                        <option value="">{t('docs.ack.mgr.allDocuments')}</option>
                        {[...known.entries()].map(([id, title]) => (
                            <option key={id} value={id}>
                                {title}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block min-w-40" htmlFor={`${filterId}-status`}>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.ack.mgr.status')}</span>
                    <select
                        id={`${filterId}-status`}
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            setPage(1);
                        }}
                        className={inputClass}
                    >
                        <option value="">{t('docs.ack.mgr.allStatuses')}</option>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {t(`docs.ack.status.${s}`)}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {message && (
                <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-destructive' : 'text-foreground'}`}>
                    {message.text}
                </p>
            )}

            {failed ? (
                <LoadError onRetry={refresh} />
            ) : !view ? (
                <LoadingText />
            ) : view.total === 0 && !docId && !status ? (
                <EmptyState icon={<ListChecks className="h-6 w-6" aria-hidden="true" />} text={t('docs.ack.mgr.empty')} />
            ) : (
                <>
                    <div className="rounded-xl border border-border bg-card p-3">
                        <div className="flex flex-wrap gap-2">
                            {STATUSES.map((s) => (
                                <Chip key={s} tone={ACK_TONE[s]}>
                                    {t(`docs.ack.status.${s}`)}: {view.summary[s]}
                                </Chip>
                            ))}
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={answeredPercent(view.summary)} aria-valuemin={0} aria-valuemax={100} aria-label={t('docs.ack.mgr.progress')}>
                            <div className="h-full bg-primary" style={{ width: `${answeredPercent(view.summary)}%` }} />
                        </div>
                        {docId && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" className={secondaryButtonClass} onClick={() => void remind()}>
                                    <BellRing className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.ack.mgr.remind')}
                                </button>
                                <button type="button" className={secondaryButtonClass} onClick={() => void exportCsv()}>
                                    <Download className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.ack.mgr.csv')}
                                </button>
                                <GenerateAction clubId={clubId} templateId="bestaetigungsprotokoll" label={t('docs.ack.mgr.protocol')} title={t('docs.ack.mgr.protocol')} intro={t('docs.ack.mgr.protocol.intro')} params={{ documentId: docId }} target={{ kind: 'archive' }} />
                            </div>
                        )}
                    </div>

                    {view.data.length === 0 ? (
                        <EmptyState icon={<ListChecks className="h-6 w-6" aria-hidden="true" />} text={t('docs.ack.mgr.noRows')} />
                    ) : (
                        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                            {view.data.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">{r.personName}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {!docId && `${titleOf(r.documentId)} · `}v{r.versionNo}
                                            {r.dueAt && r.status === 'offen' ? ` · ${t('docs.ack.due', { date: formatDate(r.dueAt, language) })}` : ''}
                                            {r.respondedAt ? ` · ${formatDate(r.respondedAt, language)}` : ''}
                                            {r.givenBy ? ` · ${t(`docs.ack.givenBy.${r.givenBy}`)}${r.actedByName ? ` (${r.actedByName})` : ''}` : ''}
                                            {r.givenBy === 'board_paper' && r.proofDate ? ` · ${formatDate(r.proofDate, language)}, ${r.proofSource ?? ''}` : ''}
                                        </p>
                                    </div>
                                    <Chip tone={ACK_TONE[r.status]}>{t(`docs.ack.status.${r.status}`)}</Chip>
                                    {(r.status === 'offen' || r.status === 'abgelaufen') && (
                                        <button type="button" className={secondaryButtonClass} onClick={() => setPaper(r)} aria-label={t('docs.ack.paper.openNamed', { name: r.personName })}>
                                            {t('docs.ack.paper.open')}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <button type="button" className={secondaryButtonClass} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                {t('docs.ack.mgr.prev')}
                            </button>
                            <span>{t('docs.ack.mgr.page', { page, pages: totalPages })}</span>
                            <button type="button" className={secondaryButtonClass} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                {t('docs.ack.mgr.next')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {requesting && <RequestAcknowledgementDialog clubId={clubId} departments={departments} onClose={() => setRequesting(false)} onDone={refresh} />}
            {paper && (
                <PaperProofDialog
                    clubId={clubId}
                    row={paper}
                    onClose={() => setPaper(null)}
                    onDone={() => {
                        setPaper(null);
                        refresh();
                    }}
                />
            )}
            {dialog}
        </section>
    );
}

function PaperProofDialog({ clubId, row, onClose, onDone }: { clubId: string; row: ManagedAcknowledgement; onClose: () => void; onDone: () => void }) {
    const { t } = useLanguage();
    const id = useId();
    const today = todayIso();
    const [decision, setDecision] = useState<'bestaetigt' | 'abgelehnt'>('bestaetigt');
    const [proofDate, setProofDate] = useState(today);
    const [proofSource, setProofSource] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(proofDate) && proofDate <= today && proofSource.trim().length > 0;

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/acknowledgements/${encodeURIComponent(row.id)}/paper?${clubQuery(clubId)}`, { method: 'POST', body: { decision, proofDate, proofSource: proofSource.trim() } });
            onDone();
        } catch (err) {
            setError(t(ackErrorKey(err)));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={t('docs.ack.paper.title', { name: row.personName })}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" className={secondaryButtonClass} onClick={onClose}>
                        {t('docs.common.cancel')}
                    </button>
                    <button type="button" className={primaryButtonClass} disabled={busy || !valid} onClick={() => void submit()}>
                        {t('docs.ack.paper.submit')}
                    </button>
                </div>
            }
        >
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t('docs.ack.paper.intro', { title: row.documentTitle })}</p>
                <fieldset>
                    <legend className="mb-1 text-xs font-medium text-muted-foreground">{t('docs.ack.paper.decision')}</legend>
                    <div className="flex gap-4">
                        {(['bestaetigt', 'abgelehnt'] as const).map((d) => (
                            <label key={d} className="flex items-center gap-2 text-sm text-foreground">
                                <input type="radio" name={`${id}-decision`} checked={decision === d} onChange={() => setDecision(d)} />
                                {t(`docs.ack.status.${d}`)}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <label className="block" htmlFor={`${id}-date`}>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.ack.paper.date')}</span>
                    <input id={`${id}-date`} type="date" max={today} value={proofDate} onChange={(e) => setProofDate(e.target.value)} className={inputClass} required />
                </label>
                <label className="block" htmlFor={`${id}-source`}>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.ack.paper.source')}</span>
                    <input id={`${id}-source`} value={proofSource} maxLength={PROOF_SOURCE_MAX} onChange={(e) => setProofSource(e.target.value)} placeholder={t('docs.ack.paper.sourcePlaceholder')} className={inputClass} required />
                </label>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
    );
}
