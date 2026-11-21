'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { UI_BTN_DANGER_OUTLINE, UI_BTN_ICON, UI_LABEL } from '@/lib/uiClasses';
import {
    SPONSOR_LIMITS,
    SPONSOR_VISIBILITIES,
    contactChanges,
    contactPayload,
    createPayload,
    emptyContact,
    emptyForm,
    formFromSponsor,
    formProblem,
    logoErrorKey,
    logoFormData,
    logoProblem,
    setPrimary,
    sponsorErrorKey,
    sponsorPatch,
    type ContactDraft,
    type Sponsor,
    type SponsorForm,
} from '@/lib/sponsors';

/** What happened on save: `partial` = the sponsor itself was stored but a later step (contact, logo) failed. */
export type SponsorSaveResult = { kind: 'created' | 'saved' | 'deleted' } | { kind: 'partial'; errorKey: string };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className="space-y-3 rounded-xl bg-muted/40 p-4">
            <legend className="px-1 text-sm font-bold text-foreground">{title}</legend>
            {children}
        </fieldset>
    );
}

/**
 * Create / edit dialog of a sponsor (W1). `sponsor === null` creates. Without `canWrite` (`sponsors:read` only) every field is
 * read-only. The logo is chosen here and uploaded after the sponsor is stored, through the media layer (`PUT /sponsors/:id/logo`).
 */
export default function SponsorFormDialog({
    clubId,
    sponsor,
    canWrite,
    onClose,
    onDone,
}: {
    clubId: string;
    sponsor: Sponsor | null;
    canWrite: boolean;
    onClose: () => void;
    onDone: (result: SponsorSaveResult) => void;
}) {
    const { t } = useLanguage();
    const uid = useId();
    const isEdit = sponsor !== null;
    const original = useMemo(() => (sponsor ? formFromSponsor(sponsor) : emptyForm()), [sponsor]);
    const [form, setForm] = useState<SponsorForm>(original);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [removeLogo, setRemoveLogo] = useState(false);
    const [logoError, setLogoError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const { confirm, dialog } = useConfirm();
    const readOnly = !canWrite;
    const problem = formProblem(form);

    // Local preview of the chosen file (a browser-local blob, never a stored link).
    useEffect(() => {
        if (!logoFile) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(logoFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [logoFile]);

    const set = <K extends keyof SponsorForm>(key: K, value: SponsorForm[K]) => {
        setError(null);
        setForm((f) => ({ ...f, [key]: value }));
    };
    const setContact = (i: number, patch: Partial<ContactDraft>) => set('contacts', form.contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)));

    function chooseLogo(file: File | undefined) {
        if (!file) return;
        const p = logoProblem(file);
        setLogoError(p ? t(p) : null);
        if (p) return;
        setLogoFile(file);
        setRemoveLogo(false);
    }

    const dirty = !isEdit || Object.keys(sponsorPatch(original, form)).length > 0 || (() => {
        const c = contactChanges(original.contacts, form.contacts);
        return c.create.length + c.update.length + c.remove.length > 0;
    })() || logoFile !== null || removeLogo;

    async function save() {
        if (busy || problem || readOnly) return;
        setBusy(true);
        setError(null);
        const q = `clubId=${encodeURIComponent(clubId)}`;
        let id = sponsor?.id ?? null;
        try {
            if (!isEdit) {
                const res = await apiFetch<{ data: Sponsor }>(`/sponsors?${q}`, { method: 'POST', body: createPayload(form) });
                id = res.data.id;
            } else {
                const patch = sponsorPatch(original, form);
                if (Object.keys(patch).length > 0) await apiFetch(`/sponsors/${id}?${q}`, { method: 'PATCH', body: patch });
            }
        } catch (err) {
            // Nothing was stored yet: stay open so the board can correct the input.
            setError(t(sponsorErrorKey(err)));
            setBusy(false);
            return;
        }
        // The sponsor itself is stored. Later steps report as "partial" instead of losing the dialog state silently.
        try {
            if (isEdit) {
                const changes = contactChanges(original.contacts, form.contacts);
                // Removed and edited contacts first, so a new primary contact does not clash with the old one.
                for (const cid of changes.remove) await apiFetch(`/sponsors/${id}/contacts/${cid}?${q}`, { method: 'DELETE' });
                for (const c of changes.update) await apiFetch(`/sponsors/${id}/contacts/${c.id}?${q}`, { method: 'PATCH', body: contactPayload(c) });
                for (const c of changes.create) await apiFetch(`/sponsors/${id}/contacts?${q}`, { method: 'POST', body: contactPayload(c) });
            }
        } catch (err) {
            onDone({ kind: 'partial', errorKey: sponsorErrorKey(err) });
            return;
        }
        try {
            if (logoFile) await apiFetch(`/sponsors/${id}/logo?${q}`, { method: 'PUT', body: logoFormData(logoFile, logoFile.name) });
            else if (removeLogo && sponsor?.logoUrl) await apiFetch(`/sponsors/${id}/logo?${q}`, { method: 'DELETE' });
        } catch (err) {
            onDone({ kind: 'partial', errorKey: logoErrorKey(err) });
            return;
        }
        onDone({ kind: isEdit ? 'saved' : 'created' });
    }

    async function remove() {
        if (!sponsor || busy) return;
        if (!(await confirm({ title: t('sponsors.delete.title'), body: t('sponsors.delete.body', { name: sponsor.name }), confirmLabel: t('sponsors.delete.confirm'), danger: true }))) return;
        setBusy(true);
        try {
            await apiFetch(`/sponsors/${sponsor.id}?clubId=${encodeURIComponent(clubId)}`, { method: 'DELETE' });
            onDone({ kind: 'deleted' });
        } catch (err) {
            setError(t(sponsorErrorKey(err)));
            setBusy(false);
        }
    }

    const shownLogo = removeLogo ? null : (previewUrl ?? sponsor?.logoUrl ?? null);
    const hasLogo = shownLogo !== null;
    const title = t(readOnly ? 'sponsors.form.title.view' : isEdit ? 'sponsors.form.title.edit' : 'sponsors.form.title.create');
    const id = (name: string) => `${uid}-${name}`;

    return (
        <>
            <Modal
                open
                size="lg"
                onClose={busy ? () => undefined : onClose}
                title={title}
                footer={
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            {isEdit && canWrite && (
                                <button type="button" onClick={() => void remove()} disabled={busy} className={`${UI_BTN_DANGER_OUTLINE} gap-1.5`}>
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    {t('sponsors.form.delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                                {t(readOnly ? 'sponsors.form.close' : 'sponsors.form.cancel')}
                            </button>
                            {canWrite && (
                                <button type="button" onClick={() => void save()} disabled={busy || !!problem || !dirty} className={primaryButtonClass}>
                                    {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                    {t(busy ? 'sponsors.form.saving' : isEdit ? 'sponsors.form.save' : 'sponsors.form.create')}
                                </button>
                            )}
                        </div>
                    </div>
                }
            >
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                >
                    {error && (
                        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            {error}
                        </p>
                    )}

                    <Section title={t('sponsors.form.section.basics')}>
                        <div>
                            <label htmlFor={id('name')} className={UI_LABEL}>
                                {t('sponsors.form.name')}
                            </label>
                            <input id={id('name')} value={form.name} maxLength={SPONSOR_LIMITS.name} required disabled={readOnly} onChange={(e) => set('name', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor={id('website')} className={UI_LABEL}>
                                {t('sponsors.form.website')}
                            </label>
                            <input id={id('website')} type="url" inputMode="url" value={form.website} maxLength={SPONSOR_LIMITS.website} disabled={readOnly} aria-describedby={id('website-hint')} onChange={(e) => set('website', e.target.value)} className={inputClass} />
                            <p id={id('website-hint')} className="mt-1 text-xs text-muted-foreground">
                                {t('sponsors.form.website.hint')}
                            </p>
                        </div>
                        <div>
                            <label htmlFor={id('description')} className={UI_LABEL}>
                                {t('sponsors.form.description')}
                            </label>
                            <textarea id={id('description')} rows={2} value={form.description} maxLength={SPONSOR_LIMITS.description} disabled={readOnly} onChange={(e) => set('description', e.target.value)} className={inputClass} />
                        </div>
                    </Section>

                    <Section title={t('sponsors.form.section.period')}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor={id('starts')} className={UI_LABEL}>
                                    {t('sponsors.form.startsOn')}
                                </label>
                                <input id={id('starts')} type="date" value={form.startsOn} disabled={readOnly} onChange={(e) => set('startsOn', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor={id('ends')} className={UI_LABEL}>
                                    {t('sponsors.form.endsOn')}
                                </label>
                                <input id={id('ends')} type="date" value={form.endsOn} min={form.startsOn || undefined} disabled={readOnly} aria-invalid={form.startsOn !== '' && form.endsOn !== '' && form.endsOn < form.startsOn} onChange={(e) => set('endsOn', e.target.value)} className={inputClass} />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('sponsors.form.period.hint')}</p>
                    </Section>

                    <Section title={t('sponsors.form.section.consideration')}>
                        <div>
                            <label htmlFor={id('consideration')} className={UI_LABEL}>
                                {t('sponsors.form.consideration')}
                            </label>
                            <textarea id={id('consideration')} rows={3} value={form.consideration} maxLength={SPONSOR_LIMITS.consideration} disabled={readOnly} aria-describedby={id('consideration-hint')} onChange={(e) => set('consideration', e.target.value)} className={inputClass} />
                            <p id={id('consideration-hint')} className="mt-1 text-xs text-muted-foreground">
                                {t('sponsors.form.consideration.hint')}
                            </p>
                        </div>
                    </Section>

                    <Section title={t('sponsors.form.section.logo')}>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-2">
                                {hasLogo ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- local blob preview or short-lived signed URL from the media layer
                                    <img src={shownLogo} alt={t('sponsors.logo.alt', { name: form.name || t('sponsors.form.title.view') })} className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <span className="text-xs text-neutral-500">{t('sponsors.logo.none')}</span>
                                )}
                            </div>
                            {canWrite && (
                                <div className="flex flex-wrap gap-2">
                                    <input ref={fileRef} id={id('logo')} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
                                            chooseLogo(e.target.files?.[0]);
                                            e.target.value = '';
                                        }} />
                                    <button type="button" onClick={() => fileRef.current?.click()} className={secondaryButtonClass}>
                                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                                        {t(hasLogo ? 'sponsors.logo.replace' : 'sponsors.logo.choose')}
                                    </button>
                                    {(hasLogo || logoFile) && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLogoFile(null);
                                                setRemoveLogo(!!sponsor?.logoUrl);
                                                setLogoError(null);
                                            }}
                                            className={secondaryButtonClass}
                                        >
                                            {t('sponsors.logo.remove')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {logoFile && <p className="text-xs text-muted-foreground">{t('sponsors.logo.pending', { name: logoFile.name })}</p>}
                        {logoError && (
                            <p role="alert" className="text-xs text-destructive">
                                {logoError}
                            </p>
                        )}
                        {canWrite && <p className="text-xs text-muted-foreground">{t('sponsors.logo.hint')}</p>}
                    </Section>

                    <Section title={t('sponsors.form.section.contacts')}>
                        {form.contacts.length === 0 && <p className="text-sm text-muted-foreground">{t('sponsors.contacts.none')}</p>}
                        <ul className="space-y-3">
                            {form.contacts.map((c, i) => (
                                <li key={c.id ?? `new-${i}`} className="rounded-lg border border-border bg-card p-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-foreground">{t('sponsors.contacts.row', { n: i + 1 })}</p>
                                        {canWrite && (
                                            <button type="button" aria-label={t('sponsors.contacts.remove', { n: i + 1 })} onClick={() => set('contacts', form.contacts.filter((_, j) => j !== i))} className={UI_BTN_ICON}>
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor={id(`c${i}-name`)} className={UI_LABEL}>
                                                {t('sponsors.contacts.name')}
                                            </label>
                                            <input id={id(`c${i}-name`)} value={c.name} maxLength={SPONSOR_LIMITS.contactName} disabled={readOnly} onChange={(e) => setContact(i, { name: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor={id(`c${i}-role`)} className={UI_LABEL}>
                                                {t('sponsors.contacts.role')}
                                            </label>
                                            <input id={id(`c${i}-role`)} value={c.role} maxLength={SPONSOR_LIMITS.role} disabled={readOnly} onChange={(e) => setContact(i, { role: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor={id(`c${i}-email`)} className={UI_LABEL}>
                                                {t('sponsors.contacts.email')}
                                            </label>
                                            <input id={id(`c${i}-email`)} type="email" autoComplete="off" value={c.email} maxLength={SPONSOR_LIMITS.email} disabled={readOnly} onChange={(e) => setContact(i, { email: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor={id(`c${i}-phone`)} className={UI_LABEL}>
                                                {t('sponsors.contacts.phone')}
                                            </label>
                                            <input id={id(`c${i}-phone`)} type="tel" autoComplete="off" value={c.phone} maxLength={SPONSOR_LIMITS.phone} disabled={readOnly} onChange={(e) => setContact(i, { phone: e.target.value })} className={inputClass} />
                                        </div>
                                    </div>
                                    <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
                                        <input type="radio" name={id('primary')} checked={c.isPrimary} disabled={readOnly} onChange={() => set('contacts', setPrimary(form.contacts, i))} className="h-4 w-4 accent-[var(--primary)]" />
                                        {t('sponsors.contacts.primary')}
                                    </label>
                                </li>
                            ))}
                        </ul>
                        {canWrite && (
                            <button type="button" disabled={form.contacts.length >= SPONSOR_LIMITS.contacts} onClick={() => set('contacts', [...form.contacts, emptyContact()])} className={secondaryButtonClass}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {t('sponsors.contacts.add')}
                            </button>
                        )}
                        {form.contacts.length >= SPONSOR_LIMITS.contacts && <p className="text-xs text-muted-foreground">{t('sponsors.contacts.limit')}</p>}
                    </Section>

                    <fieldset className="space-y-2 rounded-xl bg-muted/40 p-4" disabled={readOnly}>
                        <legend className="px-1 text-sm font-bold text-foreground">{t('sponsors.form.section.visibility')}</legend>
                        {SPONSOR_VISIBILITIES.map((v) => (
                            <label key={v} className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-sm text-foreground hover:bg-muted">
                                <input type="radio" name={id('visibility')} checked={form.visibility === v} onChange={() => set('visibility', v)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                                <span>
                                    <span className="font-medium">{t(`sponsors.form.visibility.${v}`)}</span>
                                    <span className="block text-xs text-muted-foreground">{t(`sponsors.form.visibility.${v}.hint`)}</span>
                                </span>
                            </label>
                        ))}
                    </fieldset>

                    <Section title={t('sponsors.form.section.notes')}>
                        <div>
                            <label htmlFor={id('notes')} className={UI_LABEL}>
                                {t('sponsors.form.notes')}
                            </label>
                            <textarea id={id('notes')} rows={3} value={form.notes} maxLength={SPONSOR_LIMITS.notes} disabled={readOnly} aria-describedby={id('notes-hint')} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
                            <p id={id('notes-hint')} className="mt-1 text-xs text-muted-foreground">
                                {t('sponsors.form.notes.hint')}
                            </p>
                        </div>
                    </Section>

                    {problem && !readOnly && (form.name !== '' || form.website !== '' || form.contacts.length > 0 || form.endsOn !== '') && (
                        <p role="alert" className="text-sm text-destructive">
                            {t(problem)}
                        </p>
                    )}
                    <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" disabled={busy || !!problem || !dirty || readOnly}>
                        {t('sponsors.form.save')}
                    </button>
                </form>
            </Modal>
            {dialog}
        </>
    );
}

