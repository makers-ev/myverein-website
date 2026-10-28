'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Download, Eye, EyeOff, FileText, Trash2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';
import { EmptyState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, todayIso } from '@/lib/clubMembers';
import { type PersonalDocument, type PersonalDocuments, clubQuery, documentErrorKey, downloadDocument, formatBytes, retentionState, uploadWithProgress } from '@/lib/documents';
import RetentionChip from './RetentionChip';
import MembershipConfirmationAction from './MembershipConfirmationAction';
import RequestAcknowledgementDialog from './RequestAcknowledgementDialog';
import UploadControl from './UploadControl';

export const DELETE_REASONS = ['wunsch_mitglied', 'falsch_zugeordnet', 'fehlerhaft', 'sonstiges'] as const;
type Reason = (typeof DELETE_REASONS)[number];

interface AccessLogRow {
    at: string;
    action: 'list' | 'download' | 'upload' | 'delete';
    byName: string | null;
    documentTitle: string | null;
}

/**
 * Personal storage of one member (Wave 13 W3/W4): own documents (`memberId = 'me'`), a ward's (guardian) or, for the board with
 * `documents:read_personal`, any member's -- also members without an account. The server decides the relation (`self`, `guardian`,
 * `board`) and answers `404` for everybody else; the UI only follows `relation`, `canDelete` and `canHide`.
 */
export default function MemberDocuments({ clubId, memberId, extra, canAcknowledge = false }: { clubId: string; memberId: string; extra?: React.ReactNode; canAcknowledge?: boolean }) {
    const { t, language } = useLanguage();
    const [res, setRes] = useState<PersonalDocuments | null>(null);
    const [failed, setFailed] = useState(false);
    const [showHidden, setShowHidden] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<PersonalDocument | null>(null);
    const [log, setLog] = useState<AccessLogRow[] | null>(null);
    const [logOpen, setLogOpen] = useState(false);
    const [logFailed, setLogFailed] = useState(false);
    const [reload, setReload] = useState(0);
    const [asking, setAsking] = useState(false);
    const base = `/member-documents/${encodeURIComponent(memberId)}`;
    const q = clubQuery(clubId);

    useEffect(() => {
        let cancelled = false;
        apiFetch<PersonalDocuments>(`${base}?${q}&includeHidden=${showHidden ? 1 : 0}`)
            .then((r) => {
                if (cancelled) return;
                setRes(r);
                setFailed(false);
            })
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, [base, q, showHidden, reload]);

    // A new person (ward switch) starts clean.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRes(null);
        setLog(null);
        setLogOpen(false);
        setError(null);
    }, [memberId]);

    const refresh = useCallback(() => setReload((n) => n + 1), []);
    const relation = res?.relation;
    const ownerSide = relation === 'self' || relation === 'guardian';

    useEffect(() => {
        if (!logOpen || !ownerSide) return;
        let cancelled = false;
        apiFetch<{ data: AccessLogRow[] }>(`${base}/access-log?${q}`)
            .then((r) => {
                if (cancelled) return;
                setLog(r.data);
                setLogFailed(false);
            })
            .catch(() => !cancelled && setLogFailed(true));
        return () => {
            cancelled = true;
        };
    }, [logOpen, ownerSide, base, q]);

    async function act(action: () => Promise<unknown>) {
        setError(null);
        try {
            await action();
            refresh();
        } catch (err) {
            setError(t(documentErrorKey(err)));
        }
    }

    if (failed) return <LoadError onRetry={refresh} />;
    if (!res) return <LoadingText />;

    const today = todayIso();
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">{res.owner.displayName}</p>
                <p className="mt-1">{t(`docs.person.access.${res.relation}`)}</p>
                {relation === 'board' && !res.owner.hasAccount && <p className="mt-1">{t('docs.person.noAccount')}</p>}
            </div>

            {extra}

            <div className="flex flex-wrap gap-2">
                <MembershipConfirmationAction clubId={clubId} clubMemberId={res.owner.clubMemberId} onDone={refresh} />
                {canAcknowledge && relation === 'board' && (
                    <button type="button" className={secondaryButtonClass} onClick={() => setAsking(true)}>
                        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                        {t('docs.ack.request.open')}
                    </button>
                )}
            </div>

            <UploadControl
                multiple
                hint={t(relation === 'board' ? 'docs.person.upload.board' : 'docs.person.upload.own')}
                onUpload={async (file, onProgress) => {
                    await uploadWithProgress('POST', `${base}?${q}`, { title: file.name }, file, file.name, onProgress);
                }}
                onDone={refresh}
            />

            {ownerSide && (
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
                    {t('docs.person.showHidden')}
                </label>
            )}

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            {res.data.length === 0 ? (
                <EmptyState icon={<FileText className="h-6 w-6" aria-hidden="true" />} text={t('docs.person.empty')} />
            ) : (
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                    {res.data.map((d) => (
                        <li key={d.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 ${d.hidden ? 'opacity-60' : ''}`}>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {t(`docs.person.source.${d.source}`)} · {formatBytes(d.sizeBytes, language)} · {formatDate(d.createdAt, language)}
                                    {d.hidden ? ` · ${t('docs.person.hidden')}` : ''}
                                </p>
                            </div>
                            <RetentionChip state={retentionState(d, today)} />
                            <div className="flex flex-wrap gap-2">
                                <button type="button" aria-label={t('docs.archive.downloadNamed', { title: d.title })} className={secondaryButtonClass} onClick={() => void act(() => downloadDocument(`${base}/${encodeURIComponent(d.id)}/download?${q}${showHidden ? '&includeHidden=1' : ''}`, d.originalFilename ?? d.title))}>
                                    <Download className="h-4 w-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">{t('docs.archive.download')}</span>
                                </button>
                                {d.canHide && (
                                    <button type="button" className={secondaryButtonClass} onClick={() => void act(() => apiFetch(`${base}/${encodeURIComponent(d.id)}/${d.hidden ? 'unhide' : 'hide'}?${q}`, { method: 'POST', body: {} }))}>
                                        {d.hidden ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
                                        <span className="hidden sm:inline">{t(d.hidden ? 'docs.person.unhide' : 'docs.person.hide')}</span>
                                    </button>
                                )}
                                {d.canDelete && (
                                    <button type="button" aria-label={t('docs.person.deleteNamed', { title: d.title })} className={`${secondaryButtonClass} text-destructive`} onClick={() => setDeleting(d)}>
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {ownerSide && (
                <div>
                    <button type="button" aria-expanded={logOpen} onClick={() => setLogOpen((o) => !o)} className="text-sm font-bold text-foreground underline-offset-2 hover:underline">
                        {t(logOpen ? 'docs.person.log.hide' : 'docs.person.log.show')}
                    </button>
                    {logOpen && (
                        <div className="mt-2">
                            <p className="mb-2 text-xs text-muted-foreground">{t('docs.person.log.intro')}</p>
                            {logFailed ? (
                                <LoadError onRetry={() => setLogOpen(false)} />
                            ) : !log ? (
                                <LoadingText />
                            ) : log.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('docs.person.log.empty')}</p>
                            ) : (
                                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                                    {log.map((l, i) => (
                                        <li key={`${l.at}-${i}`} className="px-3 py-2 text-foreground">
                                            {formatDate(l.at, language)} · {l.byName ?? '—'} · {t(`docs.person.log.action.${l.action}`)}
                                            {l.documentTitle ? `: ${l.documentTitle}` : ''}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            )}

            {asking && <RequestAcknowledgementDialog clubId={clubId} departments={[]} person={{ id: res.owner.clubMemberId, name: res.owner.displayName }} onClose={() => setAsking(false)} onDone={() => undefined} />}

            {deleting && (
                <DeleteDialog
                    doc={deleting}
                    board={relation === 'board'}
                    onClose={() => setDeleting(null)}
                    onConfirm={async (reason) => {
                        await apiFetch(`${base}/${encodeURIComponent(deleting.id)}?${q}`, { method: 'DELETE', ...(reason ? { body: { reason } } : {}) });
                        setDeleting(null);
                        refresh();
                    }}
                />
            )}
        </div>
    );
}

function DeleteDialog({ doc, board, onClose, onConfirm }: { doc: PersonalDocument; board: boolean; onClose: () => void; onConfirm: (reason: Reason | null) => Promise<void> }) {
    const { t } = useLanguage();
    const [reason, setReason] = useState<Reason>('wunsch_mitglied');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    return (
        <Modal open onClose={onClose} title={t('docs.person.delete.title')}>
            <div className="space-y-3">
                <p className="text-sm text-foreground">{t(board ? 'docs.person.delete.board' : 'docs.person.delete.own', { title: doc.title })}</p>
                {board && (
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.person.delete.reason')}</span>
                        <select value={reason} onChange={(e) => setReason(e.target.value as Reason)} className={inputClass}>
                            {DELETE_REASONS.map((r) => (
                                <option key={r} value={r}>
                                    {t(`docs.person.reason.${r}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    <button type="button" className={secondaryButtonClass} onClick={onClose}>
                        {t('docs.common.cancel')}
                    </button>
                    <button
                        type="button"
                        className={`${primaryButtonClass} bg-destructive`}
                        disabled={busy}
                        onClick={async () => {
                            setBusy(true);
                            setError(null);
                            try {
                                await onConfirm(board ? reason : null);
                            } catch (err) {
                                setError(t(documentErrorKey(err)));
                                setBusy(false);
                            }
                        }}
                    >
                        {t('docs.person.delete.confirm')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
