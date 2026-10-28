'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RotateCcw, Trash2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';
import { useConfirm } from '@/components/useConfirm';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, todayIso } from '@/lib/clubMembers';
import { type ArchiveDocument, type DocumentVersionRow, type Folder, atLeast, clubQuery, documentErrorKey, downloadDocument, folderPath, formatBytes, retentionState, uploadWithProgress } from '@/lib/documents';
import RetentionChip from './RetentionChip';
import UploadControl from './UploadControl';

type Detail = ArchiveDocument & { versions: DocumentVersionRow[] };

/** One archive document: versions (download each), new version, rename, move, trash / restore / delete for good (Wave 13 W2). */
export default function DocumentDetailDialog({ clubId, docId, folders, onClose, onChanged }: { clubId: string; docId: string; folders: Folder[]; onClose: () => void; onChanged: () => void }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [doc, setDoc] = useState<Detail | null>(null);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [folderId, setFolderId] = useState<string>('');
    const [busy, setBusy] = useState(false);
    const q = clubQuery(clubId);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const res = await apiFetch<{ data: Detail }>(`/documents/${encodeURIComponent(docId)}?${q}`);
            setDoc(res.data);
            setTitle(res.data.title);
            setFolderId(res.data.folderId ?? '');
        } catch {
            setFailed(true);
        }
    }, [docId, q]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function run(action: () => Promise<unknown>, close = false) {
        setBusy(true);
        setError(null);
        try {
            await action();
            onChanged();
            if (close) onClose();
            else await load();
        } catch (err) {
            setError(t(documentErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    const writable = !!doc && atLeast(doc.level, 'schreiben');
    const managed = !!doc && atLeast(doc.level, 'verwalten');
    const trashed = doc?.status === 'im_papierkorb';
    const movable = folders.filter((f) => atLeast(f.level, 'schreiben'));
    const dirty = !!doc && (title.trim() !== doc.title || folderId !== (doc.folderId ?? ''));

    return (
        <>
            <Modal open size="lg" onClose={onClose} title={doc?.title ?? t('docs.archive.doc')}>
                {failed ? (
                    <LoadError onRetry={() => void load()} />
                ) : !doc ? (
                    <LoadingText />
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{t(doc.kind === 'erzeugt' ? 'docs.archive.kind.erzeugt' : 'docs.archive.kind.hochgeladen')}</span>
                            <span>· {folderPath(folders, doc.folderId).map((f) => f.name).join(' / ') || t('docs.archive.noFolder')}</span>
                            <span>· {formatDate(doc.updatedAt, language)}</span>
                            <RetentionChip state={retentionState(doc, todayIso())} />
                            {trashed && <span className="rounded-full bg-warning/10 px-2 py-0.5 font-semibold text-warning">{t('docs.archive.inTrash')}</span>}
                        </div>

                        {writable && !trashed && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.archive.field.title')}</span>
                                    <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.archive.field.folder')}</span>
                                    <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={inputClass}>
                                        {(doc.level === 'verwalten' || !doc.folderId) && <option value="">{t('docs.archive.noFolder')}</option>}
                                        {movable.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {folderPath(folders, f.id).map((p) => p.name).join(' / ')}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="sm:col-span-2">
                                    <button
                                        type="button"
                                        className={primaryButtonClass}
                                        disabled={busy || !dirty || !title.trim()}
                                        onClick={() => void run(() => apiFetch(`/documents/${encodeURIComponent(doc.id)}?${q}`, { method: 'PATCH', body: { title: title.trim(), folderId: folderId || null } }))}
                                    >
                                        {t('docs.common.save')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <section aria-label={t('docs.archive.versions')}>
                            <h3 className="mb-2 text-sm font-bold text-foreground">{t('docs.archive.versions')}</h3>
                            <ul className="divide-y divide-border rounded-lg border border-border">
                                {[...doc.versions].sort((a, b) => b.versionNo - a.versionNo).map((v) => (
                                    <li key={v.versionNo} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                        <span className="min-w-0">
                                            <span className="font-semibold text-foreground">{t('docs.info.version', { n: v.versionNo })}</span>
                                            {v.versionNo === doc.currentVersion?.versionNo && <span className="ml-2 text-xs text-primary">{t('docs.info.version.current')}</span>}
                                            <span className="block text-xs text-muted-foreground">
                                                {v.originalFilename ?? '—'} · {formatBytes(v.sizeBytes, language)} · {formatDate(v.createdAt, language)}
                                                {v.note ? ` · ${v.note}` : ''}
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            className={secondaryButtonClass}
                                            onClick={() => void run(() => downloadDocument(`/documents/${encodeURIComponent(doc.id)}/download?${q}&versionNo=${v.versionNo}`, v.originalFilename ?? doc.title))}
                                        >
                                            <Download className="h-4 w-4" aria-hidden="true" />
                                            {t('docs.archive.download')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {writable && !trashed && doc.kind === 'hochgeladen' && (
                            <section aria-label={t('docs.archive.newVersion')}>
                                <h3 className="mb-2 text-sm font-bold text-foreground">{t('docs.archive.newVersion')}</h3>
                                <UploadControl
                                    label={t('docs.archive.newVersion.choose')}
                                    onUpload={async (file, onProgress) => {
                                        await uploadWithProgress('POST', `/documents/${encodeURIComponent(doc.id)}/versions?${q}`, {}, file, file.name, onProgress);
                                    }}
                                    onDone={() => {
                                        onChanged();
                                        void load();
                                    }}
                                />
                            </section>
                        )}

                        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                            {writable && trashed && (
                                <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void run(() => apiFetch(`/documents/${encodeURIComponent(doc.id)}/restore?${q}`, { method: 'POST', body: {} }))}>
                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.archive.restore')}
                                </button>
                            )}
                            {writable && !trashed && (
                                <button
                                    type="button"
                                    className={`${secondaryButtonClass} text-destructive`}
                                    disabled={busy}
                                    onClick={async () => {
                                        if (await confirm({ title: t('docs.archive.trash.title'), body: t('docs.archive.trash.body', { title: doc.title }), confirmLabel: t('docs.archive.trash.confirm'), danger: true })) await run(() => apiFetch(`/documents/${encodeURIComponent(doc.id)}?${q}`, { method: 'DELETE' }), true);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.archive.trash.confirm')}
                                </button>
                            )}
                            {managed && trashed && (
                                <button
                                    type="button"
                                    className={`${secondaryButtonClass} text-destructive`}
                                    disabled={busy}
                                    onClick={async () => {
                                        if (await confirm({ title: t('docs.archive.purge.title'), body: t('docs.archive.purge.body', { title: doc.title }), confirmLabel: t('docs.archive.purge.confirm'), danger: true })) await run(() => apiFetch(`/documents/${encodeURIComponent(doc.id)}/permanent?${q}`, { method: 'DELETE' }), true);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.archive.purge.confirm')}
                                </button>
                            )}
                        </div>
                        {error && (
                            <p role="alert" className="text-sm text-destructive">
                                {error}
                            </p>
                        )}
                    </div>
                )}
            </Modal>
            {dialog}
        </>
    );
}
