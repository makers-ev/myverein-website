'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Download, FileText, Folder as FolderIcon, FolderPlus, Lock, Pencil, Search, Trash2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';
import { useConfirm } from '@/components/useConfirm';
import { EmptyState, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDate, todayIso } from '@/lib/clubMembers';
import { type ArchiveDocument, type DocLevel, type Folder, type FolderNode, atLeast, buildFolderTree, clubQuery, documentErrorKey, downloadDocument, folderPath, formatBytes, retentionState, uploadWithProgress } from '@/lib/documents';
import type { DocumentsGate } from '@/lib/documentAccess';
import DocumentDetailDialog from './DocumentDetailDialog';
import FolderPermissionsDialog from './FolderPermissionsDialog';
import RetentionChip from './RetentionChip';
import UploadControl from './UploadControl';

const PAGE_SIZE = 25;

interface FoldersResponse {
    data: Folder[];
    rootLevel: DocLevel | null;
    maxDepth: number;
}

/** `null` = documents without a folder (board only). */
type Selection = string | null;

function TreeNode({ node, selected, onSelect, depth }: { node: FolderNode; selected: Selection; onSelect: (id: string) => void; depth: number }) {
    return (
        <li>
            <button
                type="button"
                aria-current={selected === node.id ? 'true' : undefined}
                onClick={() => onSelect(node.id)}
                style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
                className={`flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-sm ${selected === node.id ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'}`}
            >
                <FolderIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{node.name}</span>
            </button>
            {node.children.length > 0 && (
                <ul>
                    {node.children.map((c) => (
                        <TreeNode key={c.id} node={c} selected={selected} onSelect={onSelect} depth={depth + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
}

/** Archive "Dokumente" (Wave 13 W2): folder tree, search, upload, versions, trash and folder rights. */
export default function DocumentArchive({ clubId, gate, departments, initial }: { clubId: string; gate: DocumentsGate; departments: { id: string; name: string }[]; initial: FoldersResponse }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [folders, setFolders] = useState<Folder[]>(initial.data);
    const [rootLevel, setRootLevel] = useState<DocLevel | null>(initial.rootLevel);
    const maxDepth = initial.maxDepth;
    const tree = useMemo(() => buildFolderTree(folders), [folders]);
    const [selected, setSelected] = useState<Selection>(() => (initial.rootLevel ? null : (buildFolderTree(initial.data)[0]?.id ?? null)));
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [trash, setTrash] = useState(false);
    const [page, setPage] = useState(1);
    const [docs, setDocs] = useState<{ data: ArchiveDocument[]; total: number } | null>(null);
    const [failed, setFailed] = useState(false);
    const [openDoc, setOpenDoc] = useState<string | null>(null);
    const [folderDialog, setFolderDialog] = useState<{ mode: 'create' | 'rename'; parentId: string | null } | null>(null);
    const [permFolder, setPermFolder] = useState<Folder | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reload, setReload] = useState(0);
    const [notice, setNotice] = useState<string | null>(null);

    const current = selected ? (folders.find((f) => f.id === selected) ?? null) : null;
    const level: DocLevel | null = selected ? (current?.level ?? null) : rootLevel;
    const canUpload = atLeast(level, 'schreiben') && !trash && !search;
    const canManageFolder = !!current && atLeast(current.level, 'verwalten');
    const canCreateFolder = canManageFolder && folderPath(folders, selected).length < maxDepth;

    const reloadFolders = useCallback(async () => {
        const res = await apiFetch<FoldersResponse>(`/documents/folders?${clubQuery(clubId)}`);
        setFolders(res.data);
        setRootLevel(res.rootLevel);
    }, [clubId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(q.trim());
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [q]);

    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams({ clubId, page: String(page), pageSize: String(PAGE_SIZE), status: trash ? 'im_papierkorb' : 'aktiv' });
        if (search) params.set('q', search);
        else if (selected) params.set('folderId', selected);
        apiFetch<{ data: ArchiveDocument[]; total: number }>(`/documents?${params}`)
            .then((res) => {
                if (cancelled) return;
                setDocs({ data: res.data, total: res.total });
                setFailed(false);
            })
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, [clubId, selected, search, trash, page, reload]);

    function refresh() {
        setReload((n) => n + 1);
    }

    async function removeFolder(folder: Folder) {
        if (!(await confirm({ title: t('docs.archive.folder.delete.title'), body: t('docs.archive.folder.delete.body', { name: folder.name }), confirmLabel: t('docs.archive.folder.delete.confirm'), danger: true }))) return;
        setError(null);
        try {
            await apiFetch(`/documents/folders/${encodeURIComponent(folder.id)}?${clubQuery(clubId)}`, { method: 'DELETE' });
            setSelected(folder.parentId);
            await reloadFolders();
        } catch (err) {
            setError(t(documentErrorKey(err)));
        }
    }

    async function emptyTrash() {
        if (!(await confirm({ title: t('docs.archive.emptyTrash.title'), body: t('docs.archive.emptyTrash.body'), confirmLabel: t('docs.archive.emptyTrash.confirm'), danger: true }))) return;
        setError(null);
        try {
            const res = await apiFetch<{ data: { removed: number; kept: number } }>(`/documents/trash/empty?${clubQuery(clubId)}`, { method: 'POST', body: {} });
            setError(null);
            setNotice(t('docs.archive.emptyTrash.done', { removed: res.data.removed, kept: res.data.kept }));
            refresh();
        } catch (err) {
            setError(t(documentErrorKey(err)));
        }
    }

    const crumbs = selected ? folderPath(folders, selected) : [];
    const today = todayIso();
    const totalPages = docs ? Math.max(1, Math.ceil(docs.total / PAGE_SIZE)) : 1;

    return (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
            <aside aria-label={t('docs.archive.folders')} className="rounded-xl border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-foreground">{t('docs.archive.folders')}</h2>
                </div>
                <ul>
                    {rootLevel && (
                        <li>
                            <button type="button" aria-current={selected === null ? 'true' : undefined} onClick={() => setSelected(null)} className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm ${selected === null ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'}`}>
                                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {t('docs.archive.noFolder')}
                            </button>
                        </li>
                    )}
                    {tree.map((n) => (
                        <TreeNode key={n.id} node={n} selected={selected} onSelect={setSelected} depth={0} />
                    ))}
                </ul>
                {(rootLevel === 'verwalten' || gate.manage) && (
                    <button type="button" onClick={() => setFolderDialog({ mode: 'create', parentId: null })} className={`${secondaryButtonClass} mt-3 w-full justify-center`}>
                        <FolderPlus className="h-4 w-4" aria-hidden="true" />
                        {t('docs.archive.folder.newRoot')}
                    </button>
                )}
            </aside>

            <section className="min-w-0 space-y-3" aria-label={t('docs.archive.documents')}>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-48 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('docs.archive.search')} aria-label={t('docs.archive.search')} className={`${inputClass} pl-9`} />
                    </div>
                    {atLeast(level, 'schreiben') && (
                        <button type="button" aria-pressed={trash} onClick={() => { setTrash((v) => !v); setPage(1); }} className={`${secondaryButtonClass} ${trash ? 'border-primary text-primary' : ''}`}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            {t('docs.archive.trash')}
                        </button>
                    )}
                    {trash && gate.manage && (
                        <button type="button" onClick={() => void emptyTrash()} className={`${secondaryButtonClass} text-destructive`}>
                            {t('docs.archive.emptyTrash')}
                        </button>
                    )}
                </div>

                {!search && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <nav aria-label={t('docs.archive.path')} className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                            <span>{crumbs.length === 0 ? t('docs.archive.noFolder') : ''}</span>
                            {crumbs.map((c, i) => (
                                <span key={c.id} className="flex items-center gap-1">
                                    {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                                    <span className={i === crumbs.length - 1 ? 'font-semibold text-foreground' : ''}>{c.name}</span>
                                </span>
                            ))}
                        </nav>
                        <div className="flex flex-wrap gap-2">
                            {canCreateFolder && (
                                <button type="button" className={secondaryButtonClass} onClick={() => setFolderDialog({ mode: 'create', parentId: selected })}>
                                    <FolderPlus className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.archive.folder.newSub')}
                                </button>
                            )}
                            {canManageFolder && current && (
                                <>
                                    <button type="button" className={secondaryButtonClass} disabled={!!current.systemKey} onClick={() => setFolderDialog({ mode: 'rename', parentId: current.id })}>
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                        {t('docs.archive.folder.rename')}
                                    </button>
                                    {gate.manage && (
                                        <button type="button" className={secondaryButtonClass} onClick={() => setPermFolder(current)}>
                                            <Lock className="h-4 w-4" aria-hidden="true" />
                                            {t('docs.archive.folder.rights')}
                                        </button>
                                    )}
                                    <button type="button" className={`${secondaryButtonClass} text-destructive`} disabled={!!current.systemKey} onClick={() => void removeFolder(current)}>
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        {t('docs.archive.folder.delete')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {canUpload && (
                    <UploadControl
                        multiple
                        onUpload={async (file, onProgress) => {
                            await uploadWithProgress('POST', `/documents?${clubQuery(clubId)}`, { folderId: selected ?? undefined, title: file.name }, file, file.name, onProgress);
                        }}
                        onDone={refresh}
                    />
                )}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                {notice && (
                    <p role="status" className="text-sm text-success">
                        {notice}
                    </p>
                )}

                {failed ? (
                    <LoadError onRetry={refresh} />
                ) : !docs ? (
                    <LoadingText />
                ) : docs.data.length === 0 ? (
                    <EmptyState icon={<FileText className="h-6 w-6" aria-hidden="true" />} text={t(search ? 'docs.archive.empty.search' : trash ? 'docs.archive.empty.trash' : atLeast(level, 'schreiben') ? 'docs.archive.empty.write' : 'docs.archive.empty')} />
                ) : (
                    <>
                        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                            {docs.data.map((d) => (
                                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                                    <button type="button" onClick={() => setOpenDoc(d.id)} className="min-w-0 flex-1 text-left">
                                        <span className="block truncate text-sm font-medium text-foreground">{d.title}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {d.currentVersion ? `${formatBytes(d.currentVersion.sizeBytes, language)} · ` : ''}
                                            {formatDate(d.updatedAt, language)}
                                            {d.kind === 'erzeugt' ? ` · ${t('docs.archive.kind.erzeugt')}` : ''}
                                            {search && d.folderId ? ` · ${folderPath(folders, d.folderId).map((f) => f.name).join(' / ')}` : ''}
                                        </span>
                                    </button>
                                    <RetentionChip state={retentionState(d, today)} />
                                    {d.currentVersion && d.status === 'aktiv' && (
                                        <button type="button" aria-label={t('docs.archive.downloadNamed', { title: d.title })} className={secondaryButtonClass} onClick={() => void downloadDocument(`/documents/${encodeURIComponent(d.id)}/download?${clubQuery(clubId)}`, d.currentVersion?.originalFilename ?? d.title).catch((err) => setError(t(documentErrorKey(err))))}>
                                            <Download className="h-4 w-4" aria-hidden="true" />
                                            <span className="hidden sm:inline">{t('docs.archive.download')}</span>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <button type="button" className={secondaryButtonClass} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    {t('docs.common.prev')}
                                </button>
                                <span>{t('docs.common.page', { page, total: totalPages })}</span>
                                <button type="button" className={secondaryButtonClass} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                    {t('docs.common.next')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {openDoc && <DocumentDetailDialog clubId={clubId} docId={openDoc} folders={folders} onClose={() => setOpenDoc(null)} onChanged={refresh} />}
            {folderDialog && (
                <FolderNameDialog
                    clubId={clubId}
                    mode={folderDialog.mode}
                    folder={folderDialog.mode === 'rename' ? current : null}
                    parentId={folderDialog.mode === 'create' ? folderDialog.parentId : null}
                    onClose={() => setFolderDialog(null)}
                    onDone={(id) => {
                        setFolderDialog(null);
                        void reloadFolders().then(() => id && setSelected(id));
                    }}
                />
            )}
            {permFolder && <FolderPermissionsDialog clubId={clubId} folderId={permFolder.id} folderName={permFolder.name} departments={departments} onClose={() => setPermFolder(null)} />}
            {dialog}
        </div>
    );
}

function FolderNameDialog({ clubId, mode, folder, parentId, onClose, onDone }: { clubId: string; mode: 'create' | 'rename'; folder: Folder | null; parentId: string | null; onClose: () => void; onDone: (id: string | null) => void }) {
    const { t } = useLanguage();
    const [name, setName] = useState(folder?.name ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const invalid = !name.trim() || name.includes('/') || name.includes('\\');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (invalid) return;
        setBusy(true);
        setError(null);
        try {
            if (mode === 'create') {
                const res = await apiFetch<{ data: { id: string } }>(`/documents/folders?${clubQuery(clubId)}`, { method: 'POST', body: { name: name.trim(), ...(parentId ? { parentId } : {}) } });
                onDone(res.data.id);
            } else if (folder) {
                await apiFetch(`/documents/folders/${encodeURIComponent(folder.id)}?${clubQuery(clubId)}`, { method: 'PATCH', body: { name: name.trim() } });
                onDone(folder.id);
            }
        } catch (err) {
            setError(err instanceof ApiError && err.status === 409 && !(err.details as { code?: unknown } | undefined)?.code ? t('docs.archive.folder.duplicate') : t(documentErrorKey(err)));
            setBusy(false);
        }
    }

    return (
        <Modal open onClose={onClose} title={t(mode === 'create' ? 'docs.archive.folder.new' : 'docs.archive.folder.rename')}>
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.archive.folder.name')}</span>
                    <input autoFocus value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </label>
                {name.includes('/') && <p className="text-xs text-destructive">{t('docs.archive.folder.slash')}</p>}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                <div className="flex justify-end gap-2">
                    <button type="button" className={secondaryButtonClass} onClick={onClose}>
                        {t('docs.common.cancel')}
                    </button>
                    <button type="submit" className={primaryButtonClass} disabled={busy || invalid}>
                        {t('docs.common.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
