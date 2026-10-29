'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, History, Pencil, Trash2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';
import { useConfirm } from '@/components/useConfirm';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, todayIso } from '@/lib/clubMembers';
import { type ClubInfoDetail, type ClubInfoVersionRow, SLUG_PATTERN, clubQuery, documentErrorKey, downloadDocument, formatBytes, isHttpUrl, slugify } from '@/lib/documents';
import AttachmentPicker from './AttachmentPicker';
import Markdown from './Markdown';

const MAX_MARKDOWN = 100000;

type Mode = 'read' | 'edit' | 'history';

interface VersionDetail {
    versionNo: number;
    title: string;
    contentMarkdown: string | null;
    externalUrl: string | null;
    validFrom: string | null;
    hasAttachment: boolean;
    note: string | null;
    createdAt: string;
    current: boolean;
}

/**
 * Club document (Satzung, Beitragsordnung, ...): reader for every member, editor and version history with restore for
 * `club_info:write` (Wave 13 W1). `slug === null` creates a new document. Markdown is rendered sanitised.
 */
export default function ClubInfoDialog({ clubId, slug, canWrite, existingSlugs = [], onClose, onChanged }: { clubId: string; slug: string | null; canWrite: boolean; existingSlugs?: string[]; onClose: () => void; onChanged: () => void }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [current, setCurrent] = useState<string | null>(slug);
    const [mode, setMode] = useState<Mode>(slug ? 'read' : 'edit');
    const [detail, setDetail] = useState<ClubInfoDetail | null>(null);
    const [failed, setFailed] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!current) return;
        setFailed(false);
        try {
            const res = await apiFetch<{ data: ClubInfoDetail }>(`/club-info/${encodeURIComponent(current)}?${clubQuery(clubId)}`);
            setDetail(res.data);
        } catch {
            setFailed(true);
        }
    }, [clubId, current]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function download() {
        if (!current) return;
        setError(null);
        try {
            await downloadDocument(`/club-info/${encodeURIComponent(current)}/attachment?${clubQuery(clubId)}`, `${current}.pdf`);
        } catch (err) {
            setError(t(documentErrorKey(err)));
        }
    }

    async function remove() {
        if (!detail || !current) return;
        if (!(await confirm({ title: t('docs.info.delete.title'), body: t('docs.info.delete.body', { title: detail.title }), confirmLabel: t('docs.info.delete.confirm'), danger: true }))) return;
        try {
            await apiFetch(`/club-info/${encodeURIComponent(current)}?${clubQuery(clubId)}`, { method: 'DELETE' });
            onChanged();
            onClose();
        } catch (err) {
            setError(t(documentErrorKey(err)));
        }
    }

    const title = mode === 'edit' && !current ? t('docs.info.new') : (detail?.title ?? t('docs.info.loading'));

    return (
        <>
            <Modal open size="lg" onClose={onClose} title={title}>
                {mode === 'edit' ? (
                    <Editor
                        clubId={clubId}
                        existingSlugs={existingSlugs}
                        detail={current ? detail : null}
                        waiting={!!current && !detail && !failed}
                        onCancel={() => (current ? setMode('read') : onClose())}
                        onSaved={(saved, unchanged) => {
                            setNotice(unchanged ? t('docs.info.unchanged') : t('docs.info.saved'));
                            setCurrent(saved.slug);
                            setDetail(saved);
                            setMode('read');
                            onChanged();
                        }}
                    />
                ) : failed ? (
                    <LoadError onRetry={() => void load()} />
                ) : !detail ? (
                    <LoadingText />
                ) : mode === 'history' ? (
                    <VersionHistory clubId={clubId} detail={detail} canWrite={canWrite} onBack={() => setMode('read')} onRestored={(d, unchanged) => { setDetail(d); setNotice(unchanged ? t('docs.info.unchanged') : t('docs.info.restored')); setMode('read'); onChanged(); }} />
                ) : (
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            {canWrite && (
                                <button type="button" className={secondaryButtonClass} onClick={() => setMode('edit')}>
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.info.edit')}
                                </button>
                            )}
                            <button type="button" className={secondaryButtonClass} onClick={() => setMode('history')}>
                                <History className="h-4 w-4" aria-hidden="true" />
                                {t('docs.info.versions')}
                            </button>
                            {canWrite && (
                                <button type="button" className={`${secondaryButtonClass} text-destructive`} onClick={() => void remove()}>
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.info.delete')}
                                </button>
                            )}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                            {detail.validFrom ? t('docs.info.validFrom', { date: formatDate(detail.validFrom, language) }) : t('docs.info.noValidFrom')} · {t('docs.info.version', { n: detail.currentVersion })} · {t('docs.info.updated', { date: formatDate(detail.updatedAt, language) })}
                        </p>
                        {notice && (
                            <p role="status" className="mt-2 text-sm text-success">
                                {notice}
                            </p>
                        )}
                        {detail.contentMarkdown ? (
                            <Markdown source={detail.contentMarkdown} className="mt-3" />
                        ) : !detail.attachment && !detail.externalUrl ? (
                            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{t('docs.info.empty', { title: detail.title })}</p>
                        ) : null}
                        {detail.attachment && (
                            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                                <button type="button" className={primaryButtonClass} onClick={() => void download()}>
                                    <Download className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.info.attachment.download')}
                                </button>
                                <span className="text-xs text-muted-foreground">
                                    {detail.attachment.title} · {formatBytes(detail.attachment.sizeBytes, language)}
                                </span>
                            </div>
                        )}
                        {detail.externalUrl && isHttpUrl(detail.externalUrl) && (
                            <p className="mt-4 text-sm">
                                <a href={detail.externalUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-primary underline">
                                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                    {t('docs.info.external')}
                                </a>
                            </p>
                        )}
                        {error && (
                            <p role="alert" className="mt-3 text-sm text-destructive">
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

function Editor({ clubId, existingSlugs, detail, waiting, onCancel, onSaved }: { clubId: string; existingSlugs: string[]; detail: ClubInfoDetail | null; waiting: boolean; onCancel: () => void; onSaved: (saved: ClubInfoDetail, unchanged: boolean) => void }) {
    const { t } = useLanguage();
    const isNew = !detail;
    const [title, setTitle] = useState(detail?.title ?? '');
    const [slug, setSlug] = useState(detail?.slug ?? '');
    const [slugTouched, setSlugTouched] = useState(false);
    const [markdown, setMarkdown] = useState(detail?.contentMarkdown ?? '');
    const [validFrom, setValidFrom] = useState(detail?.validFrom ?? '');
    const [externalUrl, setExternalUrl] = useState(detail?.externalUrl ?? '');
    const [note, setNote] = useState('');
    const [attachment, setAttachment] = useState<{ id: string; title: string } | null>(detail?.attachment ? { id: detail.attachment.documentId, title: detail.attachment.title } : null);
    const [preview, setPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (waiting) return <LoadingText />;

    const problem =
        !title.trim() ? 'docs.info.err.title' : isNew && !SLUG_PATTERN.test(slug) ? 'docs.info.err.slug' : isNew && existingSlugs.includes(slug) ? 'docs.info.err.slugTaken' : markdown.length > MAX_MARKDOWN ? 'docs.info.err.tooLong' : externalUrl.trim() && !isHttpUrl(externalUrl.trim()) ? 'docs.info.err.url' : null;

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (problem) return;
        setSaving(true);
        setError(null);
        try {
            // PUT replaces the page: every field is sent, an empty one clears it.
            const res = await apiFetch<{ data: ClubInfoDetail; unchanged?: boolean }>(`/club-info/${encodeURIComponent(slug)}?${clubQuery(clubId)}`, {
                method: 'PUT',
                body: {
                    title: title.trim(),
                    contentMarkdown: markdown.trim() ? markdown : null,
                    externalUrl: externalUrl.trim() || null,
                    validFrom: validFrom || null,
                    documentId: attachment?.id ?? null,
                    note: note.trim() || null,
                },
            });
            onSaved(res.data, !!res.unchanged);
        } catch (err) {
            setError(t(documentErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={(e) => void save(e)} className="space-y-3">
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.info.field.title')} *</span>
                <input
                    value={title}
                    maxLength={200}
                    required
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if (isNew && !slugTouched) setSlug(slugify(e.target.value));
                    }}
                    className={inputClass}
                />
            </label>
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.info.field.slug')}</span>
                <input
                    value={slug}
                    maxLength={60}
                    readOnly={!isNew}
                    onChange={(e) => {
                        setSlug(e.target.value.toLowerCase());
                        setSlugTouched(true);
                    }}
                    className={`${inputClass} ${isNew ? '' : 'opacity-70'}`}
                    aria-describedby="docs-slug-hint"
                />
                <span id="docs-slug-hint" className="mt-1 block text-xs text-muted-foreground">
                    {t(isNew ? 'docs.info.field.slug.hint' : 'docs.info.field.slug.fixed')}
                </span>
            </label>
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.info.field.validFrom')}</span>
                <input type="date" value={validFrom} max="2100-12-31" onChange={(e) => setValidFrom(e.target.value)} className={inputClass} />
                <span className="mt-1 block text-xs text-muted-foreground">{t('docs.info.field.validFrom.hint', { today: formatDate(todayIso(), 'de') })}</span>
            </label>
            <div>
                <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="docs-info-md" className="text-xs font-medium text-muted-foreground">
                        {t('docs.info.field.content')}
                    </label>
                    <div role="group" aria-label={t('docs.info.field.content')} className="inline-flex rounded-lg border border-border p-0.5">
                        {([false, true] as const).map((value) => (
                            <button key={String(value)} type="button" aria-pressed={preview === value} onClick={() => setPreview(value)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${preview === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                {t(value ? 'docs.info.preview' : 'docs.info.write')}
                            </button>
                        ))}
                    </div>
                </div>
                {preview ? (
                    <div className="min-h-40 rounded-lg border border-border p-3">{markdown.trim() ? <Markdown source={markdown} /> : <p className="text-sm text-muted-foreground">{t('docs.info.preview.empty')}</p>}</div>
                ) : (
                    <textarea id="docs-info-md" value={markdown} rows={12} onChange={(e) => setMarkdown(e.target.value)} className={`${inputClass} font-mono`} />
                )}
                <p className="mt-1 text-xs text-muted-foreground">{t('docs.info.field.content.hint', { count: markdown.length, max: MAX_MARKDOWN })}</p>
            </div>
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.info.field.url')}</span>
                <input type="url" value={externalUrl} placeholder="https://" onChange={(e) => setExternalUrl(e.target.value)} className={inputClass} />
            </label>
            <AttachmentPicker clubId={clubId} value={attachment?.id ?? null} valueTitle={attachment?.title ?? null} onChange={(id, tt) => setAttachment(id ? { id, title: tt ?? '' } : null)} />
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.info.field.note')}</span>
                <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            </label>
            {(problem || error) && (
                <p role="alert" className="text-sm text-destructive">
                    {problem ? t(problem) : error}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <button type="button" className={secondaryButtonClass} onClick={onCancel} disabled={saving}>
                    {t('docs.common.cancel')}
                </button>
                <button type="submit" className={primaryButtonClass} disabled={saving || !!problem}>
                    {t('docs.common.save')}
                </button>
            </div>
        </form>
    );
}

function VersionHistory({ clubId, detail, canWrite, onBack, onRestored }: { clubId: string; detail: ClubInfoDetail; canWrite: boolean; onBack: () => void; onRestored: (d: ClubInfoDetail, unchanged: boolean) => void }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [rows, setRows] = useState<ClubInfoVersionRow[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState<VersionDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const base = `/club-info/${encodeURIComponent(detail.slug)}/versions`;

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const res = await apiFetch<{ data: ClubInfoVersionRow[] }>(`${base}?${clubQuery(clubId)}`);
            setRows(res.data);
        } catch {
            setFailed(true);
        }
    }, [base, clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function show(n: number) {
        setError(null);
        try {
            const res = await apiFetch<{ data: VersionDetail }>(`${base}/${n}?${clubQuery(clubId)}`);
            setOpen(res.data);
        } catch (err) {
            setError(t(documentErrorKey(err)));
        }
    }

    async function restore(n: number) {
        if (!(await confirm({ title: t('docs.info.restore.title'), body: t('docs.info.restore.body', { n }), confirmLabel: t('docs.info.restore.confirm') }))) return;
        try {
            const res = await apiFetch<{ data: ClubInfoDetail; unchanged?: boolean }>(`${base}/${n}/restore?${clubQuery(clubId)}`, { method: 'POST', body: {} });
            onRestored(res.data, !!res.unchanged);
        } catch (err) {
            setError(t(documentErrorKey(err)));
        }
    }

    return (
        <div>
            <button type="button" className={secondaryButtonClass} onClick={open ? () => setOpen(null) : onBack}>
                {t('docs.common.back')}
            </button>
            {failed ? (
                <LoadError className="mt-3" onRetry={() => void load()} />
            ) : !rows ? (
                <LoadingText className="mt-3" />
            ) : open ? (
                <div className="mt-3">
                    <h3 className="text-sm font-bold text-foreground">{t('docs.info.version', { n: open.versionNo })}: {open.title}</h3>
                    <p className="text-xs text-muted-foreground">
                        {formatDate(open.createdAt, language)}
                        {open.note ? ` · ${open.note}` : ''}
                    </p>
                    {open.contentMarkdown ? <Markdown source={open.contentMarkdown} className="mt-2" /> : <p className="mt-2 text-sm text-muted-foreground">{t('docs.info.version.noContent')}</p>}
                    {canWrite && !open.current && (
                        <button type="button" className={`${primaryButtonClass} mt-3`} onClick={() => void restore(open.versionNo)}>
                            {t('docs.info.restore')}
                        </button>
                    )}
                </div>
            ) : (
                <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                    {rows.map((v) => (
                        <li key={v.versionNo} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="min-w-0 text-foreground">
                                <span className="font-semibold">{t('docs.info.version', { n: v.versionNo })}</span> · {v.title}
                                {v.current && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{t('docs.info.version.current')}</span>}
                                <span className="block text-xs text-muted-foreground">
                                    {formatDate(v.createdAt, language)}
                                    {v.createdByName ? ` · ${v.createdByName}` : ''}
                                    {v.validFrom ? ` · ${t('docs.info.validFrom', { date: formatDate(v.validFrom, language) })}` : ''}
                                    {v.note ? ` · ${v.note}` : ''}
                                </span>
                            </span>
                            <span className="flex gap-2">
                                <button type="button" className={secondaryButtonClass} onClick={() => void show(v.versionNo)}>
                                    {t('docs.info.version.show')}
                                </button>
                                {canWrite && !v.current && (
                                    <button type="button" className={secondaryButtonClass} onClick={() => void restore(v.versionNo)}>
                                        {t('docs.info.restore')}
                                    </button>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
            {dialog}
        </div>
    );
}
