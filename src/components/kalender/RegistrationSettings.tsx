'use client';

import { useEffect, useState } from 'react';
import { Copy, Link2, ShieldAlert } from 'lucide-react';

import { Toggle } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type RegistrationInfo, formatCost, settingsBody, settingsDraft, settingsProblem } from '@/lib/eventRegistration';
import { eventErrorKey } from '@/lib/eventErrors';
import type { FormSummary } from '@/lib/formEditor';

import { type CalendarEvent, inputClass, labelClass, primaryBtn, secondaryBtn } from './calendarTypes';

interface Props {
    clubId: string;
    event: CalendarEvent;
    info: RegistrationInfo;
    /** Called after a save or link change so the parent reloads the settings. */
    onSaved: () => void;
}

/** "Anmeldung" setup of an event for `calendars:write` (W6): switch, form, deadline, guests, companions, cost hint, guest link. */
export default function RegistrationSettings({ clubId, event, info, onSaved }: Props) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [draft, setDraft] = useState(() => settingsDraft(info));
    const [forms, setForms] = useState<FormSummary[] | null>(null);
    const [formsDenied, setFormsDenied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [link, setLink] = useState<string | null>(null);
    const [linkBusy, setLinkBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const base = `/events/${event.id}`;
    const q = `?clubId=${clubId}`;

    useEffect(() => {
        let alive = true;
        apiFetch<{ data: FormSummary[] }>(`/forms?clubId=${clubId}&purpose=veranstaltungsanmeldung`)
            .then((res) => alive && setForms(res.data.filter((f) => !f.archivedAt)))
            .catch(() => alive && setFormsDenied(true));
        return () => {
            alive = false;
        };
    }, [clubId]);

    const problem = settingsProblem(draft);
    const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
        setDraft((d) => ({ ...d, [key]: value }));
        setSaved(false);
    };
    const cost = formatCost(info.costCents, language);
    const publicLinkActive = info.manage?.publicLinkActive ?? false;
    const guestsReady = info.enabled && info.allowGuests;

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (problem) return;
        setSaving(true);
        setError(null);
        try {
            await apiFetch(`${base}/registration${q}`, { method: 'PUT', body: settingsBody(draft) });
            setSaved(true);
            onSaved();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    async function createLink() {
        setLinkBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: { token: string } }>(`${base}/public-link${q}`, { method: 'POST' });
            setLink(`${window.location.origin}/anmeldung/${res.data.token}`);
            setCopied(false);
            onSaved();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setLinkBusy(false);
        }
    }

    async function revokeLink() {
        if (!(await confirm({ title: t('registration.link.revoke'), body: t('registration.link.revoke.confirm'), confirmLabel: t('registration.link.revoke'), danger: true }))) return;
        setLinkBusy(true);
        setError(null);
        try {
            await apiFetch(`${base}/public-link${q}`, { method: 'DELETE' });
            setLink(null);
            onSaved();
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setLinkBusy(false);
        }
    }

    async function copy() {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div className="space-y-4 text-sm">
            <form onSubmit={(e) => void save(e)} className="space-y-4">
                <div className="space-y-1">
                    <Toggle checked={draft.enabled} onChange={(v) => set('enabled', v)} label={t('registration.settings.enabled')} />
                    <p className="text-xs text-muted-foreground">{t('registration.settings.enabled.hint')}</p>
                </div>

                {draft.enabled && (
                    <>
                        <div>
                            <label htmlFor="reg-form" className={labelClass}>
                                {t('registration.settings.form')}
                            </label>
                            <select id="reg-form" value={draft.formId} onChange={(e) => set('formId', e.target.value)} disabled={formsDenied && !draft.formId} className={inputClass}>
                                <option value="">{t('registration.settings.form.none')}</option>
                                {draft.formId && !forms?.some((f) => f.id === draft.formId) && <option value={draft.formId}>{t('registration.settings.form.current')}</option>}
                                {forms?.map((f) => (
                                    <option key={f.id} value={f.id} disabled={f.publishedVersion === null}>
                                        {f.name}
                                        {f.publishedVersion === null ? ` (${t('registration.settings.form.unpublished')})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-muted-foreground">{t(formsDenied ? 'registration.settings.form.denied' : 'registration.settings.form.hint')}</p>
                            {info.manage?.formVersion != null && draft.formId === info.manage.formId && <p className="mt-0.5 text-xs text-muted-foreground">{t('registration.settings.form.version', { version: info.manage.formVersion })}</p>}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="reg-deadline" className={labelClass}>
                                    {t('registration.settings.deadline')}
                                </label>
                                <input id="reg-deadline" type="datetime-local" value={draft.deadline} onChange={(e) => set('deadline', e.target.value)} className={inputClass} />
                                <p className="mt-1 text-xs text-muted-foreground">{t('registration.settings.deadline.hint')}</p>
                            </div>
                            <div>
                                <label htmlFor="reg-companions" className={labelClass}>
                                    {t('registration.settings.companions')}
                                </label>
                                <input id="reg-companions" type="number" min={0} max={19} step={1} value={draft.maxCompanions} onChange={(e) => set('maxCompanions', e.target.value)} aria-invalid={problem === 'companions'} className={inputClass} />
                                <p className={`mt-1 text-xs ${problem === 'companions' ? 'text-destructive' : 'text-muted-foreground'}`}>{t('registration.settings.companions.hint')}</p>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            {event.capacity != null ? t('registration.settings.capacity', { count: event.capacity }) : t('registration.settings.capacity.none')}
                        </p>

                        <div className="space-y-1">
                            <Toggle checked={draft.allowGuests} onChange={(v) => set('allowGuests', v)} label={t('registration.settings.guests')} />
                            <p className="text-xs text-muted-foreground">{t('registration.settings.guests.hint')}</p>
                        </div>
                        {draft.allowGuests && (
                            <div className="max-w-xs">
                                <label htmlFor="reg-retention" className={labelClass}>
                                    {t('registration.settings.retention')}
                                </label>
                                <input id="reg-retention" type="number" min={1} max={365} step={1} value={draft.guestRetentionDays} onChange={(e) => set('guestRetentionDays', e.target.value)} aria-invalid={problem === 'retention'} className={inputClass} />
                                <p className={`mt-1 text-xs ${problem === 'retention' ? 'text-destructive' : 'text-muted-foreground'}`}>{t('registration.settings.retention.hint')}</p>
                            </div>
                        )}

                        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                            <p className="font-medium text-foreground">{cost ? t('registration.cost', { amount: cost }) : t('registration.cost.none')}{info.costNote ? ` · ${info.costNote}` : ''}</p>
                            <p className="mt-0.5">{t('registration.cost.hint')}</p>
                        </div>
                    </>
                )}

                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                        {error}
                    </p>
                )}
                <div className="flex items-center gap-3">
                    <button type="submit" disabled={saving || problem !== null} className={primaryBtn}>
                        {t('registration.settings.save')}
                    </button>
                    <span role="status" className="text-xs text-muted-foreground">
                        {saved ? t('registration.settings.saved') : ''}
                    </span>
                </div>
            </form>

            {draft.enabled && (
                <section className="space-y-2 rounded-lg border border-border p-3">
                    <h3 className="flex items-center gap-2 font-semibold text-foreground">
                        <Link2 className="h-4 w-4" aria-hidden />
                        {t('registration.link.title')}
                    </h3>
                    {!guestsReady ? (
                        <p className="text-muted-foreground">{t('registration.link.needGuests')}</p>
                    ) : (
                        <>
                            <p className="flex items-start gap-2 text-xs text-muted-foreground">
                                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                                {t('registration.link.warning')}
                            </p>
                            {link && (
                                <div className="space-y-1">
                                    <label htmlFor="reg-link" className={labelClass}>
                                        {t('registration.link.once')}
                                    </label>
                                    <div className="flex gap-2">
                                        <input id="reg-link" type="text" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className={inputClass} />
                                        <button type="button" onClick={() => void copy()} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                                            <Copy className="h-4 w-4" aria-hidden />
                                            {t(copied ? 'registration.link.copied' : 'registration.link.copy')}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!link && publicLinkActive && <p className="text-muted-foreground">{t('registration.link.active')}</p>}
                            <div className="flex flex-wrap gap-2">
                                <button type="button" disabled={linkBusy} onClick={() => void createLink()} className={secondaryBtn}>
                                    {t(publicLinkActive ? 'registration.link.replace' : 'registration.link.create')}
                                </button>
                                {publicLinkActive && (
                                    <button type="button" disabled={linkBusy} onClick={() => void revokeLink()} className="rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50">
                                        {t('registration.link.revoke')}
                                    </button>
                                )}
                            </div>
                            {publicLinkActive && <p className="text-xs text-muted-foreground">{t('registration.link.replace.hint')}</p>}
                        </>
                    )}
                </section>
            )}
            {dialog}
        </div>
    );
}
