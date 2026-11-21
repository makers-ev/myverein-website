'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import PublicClubView from '@/components/publicClub/PublicClubView';
import { SectionCard, Toggle } from '@/components/standorte/ui';
import { ErrorState, Skeleton } from '@/components/ui';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { mediaErrorKey } from '@/lib/mediaUpload';
import { changedDraft, EDITOR_PATH, type EditorData, isLive, normalizeEditorData, previewClub, type ProfileDraft, type PublicNamed, safeHttpUrl } from '@/lib/publicClub';
import { UI_BTN_DANGER_OUTLINE, UI_BTN_PRIMARY, UI_BTN_SECONDARY, UI_INPUT, UI_LABEL } from '@/lib/uiClasses';
import { url as siteUrl } from '../../../project.config.json';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Empty input is `null`; everything else is kept as typed. */
const orNull = (v: string): string | null => (v.trim() ? v : null);

function detailsCode(err: unknown): string | null {
    const code = err instanceof ApiError ? (err.details as { code?: unknown } | undefined)?.code : undefined;
    return typeof code === 'string' ? code : null;
}

/** Translation key for a failed save / publish call. */
export function editorErrorKey(err: unknown): string {
    const code = detailsCode(err);
    if (code === 'contact_consent_required') return 'pcEditor.consent.required';
    if (code === 'unknown_image') return 'pcEditor.error.image';
    if (code === 'unknown_department' || code === 'unknown_calendar') return 'pcEditor.error.reference';
    if (err instanceof ApiError && (err.status === 400 || err.status === 422)) return 'pcEditor.invalid';
    return 'pcEditor.saveError';
}

function CheckList({ legend, hint, items, selected, onChange, empty }: { legend: string; hint?: string; items: PublicNamed[]; selected: string[]; onChange: (ids: string[]) => void; empty: string }) {
    return (
        <fieldset>
            <legend className="text-sm font-semibold text-foreground">{legend}</legend>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
            {items.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
            ) : (
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {items.map((item) => (
                        <li key={item.id}>
                            <label className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                                <input type="checkbox" className="h-4 w-4" checked={selected.includes(item.id)} onChange={(e) => onChange(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
                                {item.name}
                            </label>
                        </li>
                    ))}
                </ul>
            )}
        </fieldset>
    );
}

/** Logo / cover: upload through the board's media route (`POST /club-public-profile/images`), the returned key goes into the draft. */
function ImageField({ label, id, clubId, url, onChange, onError }: { label: string; id: string; clubId: string; url: string | null; onChange: (value: { key: string | null; url: string | null }) => void; onError: (message: string) => void }) {
    const { t } = useLanguage();
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    async function pick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setBusy(true);
        try {
            const body = new FormData();
            body.append('file', file);
            const res = await apiFetch<{ data: { key: string; url: string } }>(`${EDITOR_PATH}/images?clubId=${encodeURIComponent(clubId)}`, { method: 'POST', body });
            onChange({ key: res.data.key, url: safeHttpUrl(res.data.url) });
        } catch (err) {
            onError(t(mediaErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div>
            <span className={UI_LABEL}>{label}</span>
            <div className="flex flex-wrap items-center gap-3">
                {url && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed preview URL delivered by the media layer
                    <img src={url} alt={t('pcEditor.image.alt')} width={96} height={96} className="h-16 w-24 rounded-lg border border-hairline object-contain" referrerPolicy="no-referrer" />
                )}
                <input ref={input} id={id} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void pick(e)} disabled={busy} />
                <label htmlFor={id} className={`${UI_BTN_SECONDARY} cursor-pointer ${busy ? 'opacity-50' : ''}`}>
                    {t(busy ? 'pcEditor.image.busy' : url ? 'pcEditor.image.replace' : 'pcEditor.image.choose')}
                </label>
                {url && (
                    <button type="button" disabled={busy} onClick={() => onChange({ key: null, url: null })} className={UI_BTN_SECONDARY}>
                        {t('pcEditor.image.remove')}
                    </button>
                )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('pcEditor.image.hint')}</p>
        </div>
    );
}

/**
 * Editor of the public club page in "Einstellungen" (Wave 15 W2, `public_profile:write`; the backend checks it again). The page is off by
 * default. The board releases each part on its own (a part is released by filling it or choosing it), sees a preview of the draft built
 * by the same component as the public page, saves the draft and publishes or withdraws separately. Only changed fields are sent;
 * publishing needs a saved draft, and contact details need an explicit confirmation (backend `contact_consent_required`).
 */
export default function PublicProfilePanel({ clubId, clubName, departments }: { clubId: string; clubName: string; departments: PublicNamed[] }) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [data, setData] = useState<EditorData | null>(null);
    const [draft, setDraft] = useState<ProfileDraft | null>(null);
    const [calendars, setCalendars] = useState<PublicNamed[] | null>(null);
    const [calendarsFailed, setCalendarsFailed] = useState(false);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    const apply = useCallback((d: EditorData) => {
        setData(d);
        setDraft(d.draft);
    }, []);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const res = await apiFetch<{ data: unknown }>(`${EDITOR_PATH}?clubId=${encodeURIComponent(clubId)}`);
            const parsed = normalizeEditorData(res.data);
            if (parsed) apply(parsed);
            else setLoadError(new Error('unexpected response'));
        } catch (err) {
            setLoadError(err);
        }
        try {
            const res = await apiFetch<{ data: { id: string; name: string }[] }>(`/calendars?clubId=${encodeURIComponent(clubId)}`);
            setCalendars(res.data.map((c) => ({ id: c.id, name: c.name })));
            setCalendarsFailed(false);
        } catch {
            setCalendarsFailed(true);
        }
    }, [clubId, apply]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const preview = useMemo(() => (data && draft ? previewClub(draft, { slug: data.slug, name: clubName, departments }) : null), [data, draft, clubName, departments]);

    if (loadError) {
        return (
            <SectionCard title={t('pcEditor.title')}>
                <ErrorState error={loadError instanceof ApiError ? loadError : undefined} onRetry={() => void load()} />
            </SectionCard>
        );
    }
    if (!data || !draft || !preview) {
        return (
            <SectionCard title={t('pcEditor.title')}>
                <Skeleton lines={4} />
            </SectionCard>
        );
    }

    const changes = changedDraft(data.draft, draft);
    const dirty = Object.keys(changes).length > 0;
    const emailInvalid = !!draft.contactEmail?.trim() && !EMAIL.test(draft.contactEmail.trim());
    const websiteInvalid = !!draft.website?.trim() && safeHttpUrl(draft.website.trim()) === null;
    const invalid = emailInvalid || websiteInvalid;
    const hasContact = !!(draft.contactEmail?.trim() || draft.contactPhone?.trim());
    const live = isLive(data);
    const pageUrl = `${siteUrl}${data.publicPath}`;
    const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

    async function request(method: 'PUT' | 'POST', suffix: string, body?: unknown): Promise<EditorData> {
        const res = await apiFetch<{ data: unknown }>(`${EDITOR_PATH}${suffix}?clubId=${encodeURIComponent(clubId)}`, { method, ...(body !== undefined ? { body } : {}) });
        const parsed = normalizeEditorData(res.data);
        if (!parsed) throw new Error('unexpected response');
        return parsed;
    }

    async function run(action: () => Promise<EditorData>, okKey: string, keepDraft = false) {
        setBusy(true);
        setStatus(null);
        try {
            const next = await action();
            if (keepDraft) setData(next);
            else apply(next);
            setStatus({ ok: true, text: t(okKey) });
        } catch (err) {
            setStatus({ ok: false, text: t(editorErrorKey(err)) });
        } finally {
            setBusy(false);
        }
    }

    const save = (e: React.FormEvent) => {
        e.preventDefault();
        if (!dirty || invalid) return;
        void run(() => request('PUT', '', changes), 'pcEditor.saved');
    };

    async function publish() {
        if (dirty || invalid) return;
        if (hasContact && !consent) {
            setStatus({ ok: false, text: t('pcEditor.consent.required') });
            return;
        }
        if (!(await confirm({ title: t('pcEditor.publish.confirm.title'), body: t('pcEditor.publish.confirm.body'), confirmLabel: t('pcEditor.publish') }))) return;
        await run(() => request('POST', '/publish', { enable: true, ...(hasContact ? { contactConsentConfirmed: true } : {}) }), 'pcEditor.published.ok');
    }

    async function unpublish() {
        if (!(await confirm({ title: t('pcEditor.unpublish.confirm.title'), body: t('pcEditor.unpublish.confirm.body'), confirmLabel: t('pcEditor.unpublish'), danger: true }))) return;
        await run(() => request('POST', '/unpublish'), 'pcEditor.unpublished.ok');
    }

    // The visibility switch is a club setting of its own (applies at once, independent of the draft).
    async function setDiscoverable(value: boolean) {
        await run(() => request('PUT', '/settings', { discoverable: value }), 'pcEditor.discoverable.saved', true);
    }

    const publishLabel = live ? 'pcEditor.publish.update' : 'pcEditor.publish';
    const canPublish = !busy && !dirty && !invalid && (!live || data.hasUnpublishedChanges);

    return (
        <SectionCard
            title={t('pcEditor.title')}
            action={
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${live ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}`}>
                    {t(live ? 'pcEditor.status.published' : 'pcEditor.status.draft')}
                </span>
            }
        >
            <p className="text-sm text-muted-foreground">{t('pcEditor.intro')}</p>
            <div className="mt-3 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-foreground">
                <p className="font-semibold">{t('pcEditor.privacy.title')}</p>
                <p className="mt-0.5">{t('pcEditor.privacy.body')}</p>
            </div>
            {live && (
                <p className="mt-3 text-sm text-foreground">
                    {t('pcEditor.url')}:{' '}
                    <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary-text hover:underline">
                        {pageUrl}
                    </a>
                    {data.hasUnpublishedChanges && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-foreground">{t('pcEditor.status.changes')}</span>}
                </p>
            )}

            <form onSubmit={save} className="mt-5 space-y-5" noValidate>
                <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-foreground">{t('pcEditor.fields.title')}</legend>
                    <div>
                        <label htmlFor="pce-tagline" className={UI_LABEL}>
                            {t('pcEditor.tagline')}
                        </label>
                        <input id="pce-tagline" value={draft.tagline ?? ''} maxLength={160} onChange={(e) => set('tagline', orNull(e.target.value))} className={UI_INPUT} />
                    </div>
                    <div>
                        <label htmlFor="pce-description" className={UI_LABEL}>
                            {t('pcEditor.description')}
                        </label>
                        <textarea id="pce-description" rows={4} maxLength={5000} value={draft.description ?? ''} onChange={(e) => set('description', orNull(e.target.value))} aria-describedby="pce-description-hint" className={UI_INPUT} />
                        <p id="pce-description-hint" className="mt-1 text-xs text-muted-foreground">
                            {t('pcEditor.description.hint')}
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="pce-city" className={UI_LABEL}>
                                {t('pcEditor.city')}
                            </label>
                            <input id="pce-city" value={draft.city ?? ''} maxLength={80} onChange={(e) => set('city', orNull(e.target.value))} className={UI_INPUT} />
                        </div>
                        <div>
                            <label htmlFor="pce-address" className={UI_LABEL}>
                                {t('pcEditor.address')}
                            </label>
                            <input id="pce-address" value={draft.address ?? ''} maxLength={300} onChange={(e) => set('address', orNull(e.target.value))} aria-describedby="pce-address-hint" className={UI_INPUT} />
                            <p id="pce-address-hint" className="mt-1 text-xs text-muted-foreground">
                                {t('pcEditor.address.hint')}
                            </p>
                        </div>
                        <div>
                            <label htmlFor="pce-email" className={UI_LABEL}>
                                {t('pcEditor.contactEmail')}
                            </label>
                            <input id="pce-email" type="email" value={draft.contactEmail ?? ''} maxLength={200} aria-invalid={emailInvalid} onChange={(e) => set('contactEmail', orNull(e.target.value))} className={UI_INPUT} />
                        </div>
                        <div>
                            <label htmlFor="pce-phone" className={UI_LABEL}>
                                {t('pcEditor.contactPhone')}
                            </label>
                            <input id="pce-phone" type="tel" value={draft.contactPhone ?? ''} maxLength={40} onChange={(e) => set('contactPhone', orNull(e.target.value))} className={UI_INPUT} />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="pce-website" className={UI_LABEL}>
                                {t('pcEditor.website')}
                            </label>
                            <input id="pce-website" type="url" inputMode="url" value={draft.website ?? ''} maxLength={200} placeholder="https://" aria-invalid={websiteInvalid} onChange={(e) => set('website', orNull(e.target.value))} className={UI_INPUT} />
                        </div>
                    </div>
                    {invalid && (
                        <p role="alert" className="text-sm text-destructive">
                            {t('pcEditor.invalid')}
                        </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ImageField label={t('pcEditor.logo')} id="pce-logo" clubId={clubId} url={draft.logoUrl} onChange={(v) => setDraft((d) => (d ? { ...d, logoKey: v.key, logoUrl: v.url } : d))} onError={(text) => setStatus({ ok: false, text })} />
                        <ImageField label={t('pcEditor.cover')} id="pce-cover" clubId={clubId} url={draft.coverUrl} onChange={(v) => setDraft((d) => (d ? { ...d, coverKey: v.key, coverUrl: v.url } : d))} onError={(text) => setStatus({ ok: false, text })} />
                    </div>
                </fieldset>

                <CheckList legend={t('pcEditor.departments')} items={departments} selected={draft.departmentIds} onChange={(ids) => set('departmentIds', ids)} empty={t('pcEditor.departments.none')} />
                {calendarsFailed ? (
                    <p role="alert" className="text-sm text-destructive">
                        {t('pcEditor.calendars.error')}
                    </p>
                ) : (
                    <CheckList legend={t('pcEditor.calendars')} hint={t('pcEditor.calendars.hint')} items={calendars ?? []} selected={draft.eventCalendarIds} onChange={(ids) => set('eventCalendarIds', ids)} empty={t('pcEditor.calendars.none')} />
                )}

                <div className="space-y-3">
                    <div>
                        <Toggle checked={draft.showSponsors} onChange={(v) => set('showSponsors', v)} label={t('pcEditor.showSponsors')} describedBy="pce-sponsors-hint" />
                        <p id="pce-sponsors-hint" className="ml-14 mt-1 text-xs text-muted-foreground">
                            {t('pcEditor.showSponsors.hint')}
                        </p>
                    </div>
                    <div>
                        <Toggle
                            checked={draft.leadFormEnabled}
                            onChange={(v) => {
                                set('leadFormEnabled', v);
                                if (!v) set('trialTrainingEnabled', false);
                            }}
                            label={t('pcEditor.inquiryEnabled')}
                            describedBy="pce-inquiry-hint"
                        />
                        <p id="pce-inquiry-hint" className="ml-14 mt-1 text-xs text-muted-foreground">
                            {t('pcEditor.inquiryEnabled.hint')}
                        </p>
                    </div>
                    {draft.leadFormEnabled && (
                        <div className="ml-14">
                            <Toggle checked={draft.trialTrainingEnabled} onChange={(v) => set('trialTrainingEnabled', v)} label={t('pcEditor.trialTraining')} />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={busy || !dirty || invalid} className={UI_BTN_PRIMARY}>
                        {t('pcEditor.save')}
                    </button>
                </div>

                <div className="space-y-3 border-t border-hairline pt-4">
                    {hasContact && (
                        <label className="flex items-start gap-2 text-sm text-foreground">
                            <input type="checkbox" className="mt-1 h-4 w-4" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                            <span>{t('pcEditor.consent')}</span>
                        </label>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" disabled={!canPublish} onClick={() => void publish()} className={UI_BTN_SECONDARY}>
                            {t(publishLabel)}
                        </button>
                        {data.publishedAt !== null && (
                            <button type="button" disabled={busy} onClick={() => void unpublish()} className={UI_BTN_DANGER_OUTLINE}>
                                {t('pcEditor.unpublish')}
                            </button>
                        )}
                        {dirty && <p className="text-xs text-muted-foreground">{t('pcEditor.unsaved')}</p>}
                    </div>
                    {status && (
                        <p role={status.ok ? 'status' : 'alert'} className={`text-sm ${status.ok ? 'text-success' : 'text-destructive'}`}>
                            {status.text}
                        </p>
                    )}
                </div>
            </form>

            <div className="mt-6 border-t border-hairline pt-4">
                <Toggle checked={data.discoverable} onChange={(v) => void setDiscoverable(v)} disabled={busy} label={t('pcEditor.discoverable')} describedBy="pce-discoverable-hint" />
                <p id="pce-discoverable-hint" className="ml-14 mt-1 text-xs text-muted-foreground">
                    {t('pcEditor.discoverable.hint')}
                </p>
            </div>

            <div className="mt-6 border-t border-hairline pt-4">
                <h3 className="text-sm font-semibold text-foreground">{t('pcEditor.preview')}</h3>
                <p className="text-xs text-muted-foreground">{t('pcEditor.preview.hint')}</p>
                <p className="text-xs text-muted-foreground">{t('pcEditor.preview.note')}</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-hairline bg-background">
                    <PublicClubView club={preview} preview />
                </div>
            </div>
            {dialog}
        </SectionCard>
    );
}
