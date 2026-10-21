'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { NOTICE_MAX, NOTICE_MIN, type PrivacyNotice, type PrivacyNoticeListItem, canDiff, privacyErrorKey } from '@/lib/privacyAdmin';
import { Chip, EmptyState, SectionCard } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';
import DiffView from './DiffView';

/** One older version, loaded on demand (the list has no texts). */
function OldVersion({ clubId, item }: { clubId: string; item: PrivacyNoticeListItem }) {
    const { t, language } = useLanguage();
    const [body, setBody] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    async function toggle(open: boolean) {
        if (!open || body !== null) return;
        try {
            setBody((await apiFetch<{ data: PrivacyNotice }>(`/club-privacy-notices/${encodeURIComponent(item.id)}?clubId=${encodeURIComponent(clubId)}`)).data.body);
        } catch {
            setFailed(true);
        }
    }

    return (
        <details className="rounded-lg border border-border px-3 py-2 text-sm" onToggle={(e) => void toggle((e.currentTarget as HTMLDetailsElement).open)}>
            <summary className="cursor-pointer font-medium text-foreground">
                {t('privacy.history.version', { version: item.version })}
                <span className="ml-2 font-normal text-muted-foreground">{formatDate(item.publishedAt, language)}</span>
            </summary>
            {failed ? (
                <p role="alert" className="mt-2 text-destructive">
                    {t('common.error')}
                </p>
            ) : body === null ? (
                <LoadingText className="mt-2" />
            ) : (
                <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-foreground">{body}</p>
            )}
        </details>
    );
}

/**
 * Privacy notice of the club (Wave 10 W5, `privacy:read`; editing and publishing `privacy:manage`). The notice is information
 * (Art. 13/14), never a consent: members see it on the join page and the board hands it to members without an account. A
 * published version is immutable; a change becomes version + 1. The editor starts from the current text, or from the generated
 * template (club data, contact, retention periods filled in -- a sample, not legal advice, until the legal review).
 */
export default function PrivacyNoticePanel({ clubId, canManage }: { clubId: string; canManage: boolean }) {
    const { t, language } = useLanguage();
    const [current, setCurrent] = useState<PrivacyNotice | null | undefined>(undefined);
    const [versions, setVersions] = useState<PrivacyNoticeListItem[]>([]);
    const [template, setTemplate] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [body, setBody] = useState('');
    const [preview, setPreview] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const query = `clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const [cur, list, draft] = await Promise.all([
                apiFetch<{ data: PrivacyNotice | null }>(`/club-privacy-notices/current?${query}`),
                apiFetch<{ data: PrivacyNoticeListItem[] }>(`/club-privacy-notices?${query}`),
                canManage ? apiFetch<{ data: { body: string } }>(`/club-privacy-notices/draft?${query}`) : Promise.resolve(null),
            ]);
            setCurrent(cur.data);
            setVersions(list.data);
            setTemplate(draft?.data.body ?? null);
            setBody((prev) => (prev === '' ? (cur.data?.body ?? draft?.data.body ?? '') : prev));
        } catch {
            setLoadError(true);
        }
    }, [query, canManage]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function publish() {
        setBusy(true);
        setError(null);
        setNote(null);
        try {
            const res = await apiFetch<{ data: PrivacyNotice }>(`/club-privacy-notices?${query}`, { method: 'POST', body: { body: body.trim() } });
            setNote(t(res.data.id === current?.id ? 'privacy.notice.unchanged' : 'privacy.notice.published', { version: res.data.version }));
            await load();
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    if (loadError)
        return (
            <SectionCard title={t('privacy.notice.title')}>
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            </SectionCard>
        );
    if (current === undefined)
        return (
            <SectionCard title={t('privacy.notice.title')}>
                <LoadingText />
            </SectionCard>
        );

    const trimmed = body.trim();
    const valid = trimmed.length >= NOTICE_MIN && trimmed.length <= NOTICE_MAX;
    const changed = !current || trimmed !== current.body.trim();
    const older = versions.filter((v) => v.id !== current?.id);

    return (
        <SectionCard title={t('privacy.notice.title')}>
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('privacy.notice.intro')}</p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    {current ? (
                        <>
                            <Chip tone="success">{t('privacy.history.version', { version: current.version })}</Chip>
                            {t('privacy.notice.publishedAt', { date: formatDate(current.publishedAt, language) })}
                        </>
                    ) : (
                        <Chip tone="warning">{t('privacy.notice.none')}</Chip>
                    )}
                </p>

                {canManage ? (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {template !== null && (
                                <button type="button" onClick={() => setBody(template)} className={secondaryButtonClass}>
                                    {t('privacy.notice.loadTemplate')}
                                </button>
                            )}
                            <button type="button" aria-pressed={preview} onClick={() => setPreview((v) => !v)} className={secondaryButtonClass}>
                                {t(preview ? 'privacy.notice.edit' : 'privacy.notice.preview')}
                            </button>
                        </div>
                        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t('privacy.notice.templateHint')}</p>
                        {preview ? (
                            <div className="rounded-lg border border-border p-4">
                                <p className="mb-2 text-xs font-semibold text-muted-foreground">{t('privacy.notice.previewHint')}</p>
                                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{trimmed}</p>
                            </div>
                        ) : (
                            <label className="block">
                                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.notice.body')}</span>
                                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} maxLength={NOTICE_MAX} className={`${inputClass} font-mono`} />
                                <span className="mt-1 block text-xs text-muted-foreground">{t('privacy.text.count', { count: trimmed.length, min: NOTICE_MIN, max: NOTICE_MAX })}</span>
                            </label>
                        )}
                        {current && changed && valid && (
                            <div>
                                <p className="mb-1 text-xs font-medium text-muted-foreground">{t('privacy.text.diffTitle', { version: current.version })}</p>
                                {canDiff(current.body, trimmed) ? <DiffView before={current.body} after={trimmed} /> : <p className="text-xs text-muted-foreground">{t('privacy.notice.diffTooLong')}</p>}
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            <button type="button" disabled={busy || !valid || !changed} onClick={() => void publish()} className={primaryButtonClass}>
                                {t('privacy.notice.publish', { version: (current?.version ?? 0) + 1 })}
                            </button>
                            <span className="text-xs text-muted-foreground">{t('privacy.notice.publishHint')}</span>
                        </div>
                    </div>
                ) : current ? (
                    <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm text-foreground">{current.body}</p>
                ) : (
                    <EmptyState icon={<span aria-hidden>§</span>} text={t('privacy.notice.none')} />
                )}

                {note && (
                    <p role="status" className="text-sm text-success">
                        {note}
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}

                {older.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">{t('privacy.notice.versions')}</h3>
                        {older.map((v) => (
                            <OldVersion key={v.id} clubId={clubId} item={v} />
                        ))}
                    </div>
                )}
            </div>
        </SectionCard>
    );
}
