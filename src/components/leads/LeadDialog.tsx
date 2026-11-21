'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Mail, Phone, Trash2, UserPlus } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { Chip, formatDate } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { UI_BTN_DANGER_OUTLINE, UI_LABEL } from '@/lib/uiClasses';
import { LEAD_LIMITS, canConvert, createLeadBody, emptyLeadForm, formFromLead, leadErrorKey, leadPatch, leadProblem, nextStatuses, statusTone, type Lead, type LeadForm } from '@/lib/leads';

export type LeadDialogResult = { kind: 'created' | 'saved' | 'deleted' } | { kind: 'converted' };

/**
 * One request of the pipeline (W3): contact data and message as the prospect sent them, status (only the steps the backend allows),
 * trial training date, department, waitlist, internal notes, and "Aufnehmen" (converts to a member record). `lead === null` is the
 * manual entry (a call, an email, someone at the sports field).
 */
export default function LeadDialog({ clubId, lead, departments, onClose, onDone }: { clubId: string; lead: Lead | null; departments: { id: string; name: string }[]; onClose: () => void; onDone: (result: LeadDialogResult) => void }) {
    const { t, language } = useLanguage();
    const uid = useId();
    const id = (n: string) => `${uid}-${n}`;
    const isEdit = lead !== null;
    const original = useMemo(() => (lead ? formFromLead(lead) : emptyLeadForm()), [lead]);
    const [form, setForm] = useState<LeadForm>(original);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { confirm, dialog } = useConfirm();
    const q = `clubId=${encodeURIComponent(clubId)}`;
    const problem = leadProblem(form);
    const patch = isEdit ? leadPatch(original, form) : {};
    const dirty = !isEdit || Object.keys(patch).length > 0;
    const set = <K extends keyof LeadForm>(key: K, value: LeadForm[K]) => {
        setError(null);
        setForm((f) => ({ ...f, [key]: value }));
    };
    // Current status plus the steps the backend allows from it.
    const statusOptions = lead ? [lead.status, ...nextStatuses(lead.status)] : [];

    // Closing (Escape, backdrop, "Abbrechen") with typed input asks first; an untouched form closes at once.
    const hasInput = isEdit ? dirty : JSON.stringify(form) !== JSON.stringify(original);
    async function requestClose() {
        if (busy) return;
        if (hasInput && !(await confirm({ title: t('forms.confirm.discard.title'), body: t('forms.editor.discardChanges.body'), confirmLabel: t('forms.confirm.discard.confirm'), danger: true }))) return;
        onClose();
    }

    async function run(action: () => Promise<LeadDialogResult>) {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            onDone(await action());
        } catch (err) {
            setError(t(leadErrorKey(err)));
            setBusy(false);
        }
    }

    const save = () =>
        problem || !dirty
            ? undefined
            : run(async () => {
                  if (!lead) {
                      await apiFetch(`/club-leads?${q}`, { method: 'POST', body: createLeadBody(form) });
                      return { kind: 'created' };
                  }
                  await apiFetch(`/club-leads/${lead.id}?${q}`, { method: 'PATCH', body: patch });
                  return { kind: 'saved' };
              });

    async function convert() {
        if (!lead) return;
        if (!(await confirm({ title: t('leads.convert.title'), body: t('leads.convert.body', { name: lead.name }), confirmLabel: t('leads.convert.confirm') }))) return;
        await run(async () => {
            await apiFetch(`/club-leads/${lead.id}/convert?${q}`, { method: 'POST' });
            return { kind: 'converted' };
        });
    }

    async function remove() {
        if (!lead) return;
        if (!(await confirm({ title: t('leads.delete.title'), body: t('leads.delete.body', { name: lead.name }), confirmLabel: t('leads.delete.confirm'), danger: true }))) return;
        await run(async () => {
            await apiFetch(`/club-leads/${lead.id}?${q}`, { method: 'DELETE' });
            return { kind: 'deleted' };
        });
    }

    return (
        <>
            <Modal
                open
                size="lg"
                onClose={() => void requestClose()}
                title={t(isEdit ? 'leads.dialog.title.edit' : 'leads.dialog.title.create')}
                footer={
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            {isEdit && (
                                <button type="button" onClick={() => void remove()} disabled={busy} className={`${UI_BTN_DANGER_OUTLINE} gap-1.5`}>
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    {t('leads.delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => void requestClose()} disabled={busy} className={secondaryButtonClass}>
                                {t('leads.cancel')}
                            </button>
                            <button type="button" onClick={() => void save()} disabled={busy || !!problem || !dirty} className={primaryButtonClass}>
                                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t(isEdit ? 'leads.save' : 'leads.create')}
                            </button>
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

                    {lead && (
                        <section aria-label={t('leads.request')} className="space-y-2 rounded-xl bg-muted/40 p-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Chip tone={statusTone(lead.status)}>{t(`leads.status.${lead.status}`)}</Chip>
                                {lead.waitlisted && <Chip tone="muted">{t('leads.waitlisted')}</Chip>}
                                {lead.trialRequested && <Chip tone="primary">{t('leads.trialRequested')}</Chip>}
                                {lead.requestCount > 1 && <Chip tone="warning">{t('leads.requestCount', { count: lead.requestCount })}</Chip>}
                            </div>
                            <p className="text-xs text-muted-foreground">{t(`leads.source.${lead.source}`, { date: formatDate(lead.createdAt, language) })}</p>
                            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                {lead.email && (
                                    <a href={`mailto:${lead.email}`} className="inline-flex min-h-8 items-center gap-1.5 text-primary-text hover:underline">
                                        <Mail className="h-4 w-4" aria-hidden="true" />
                                        {lead.email}
                                    </a>
                                )}
                                {lead.phone && (
                                    <a href={`tel:${lead.phone.replace(/[^+\d]/g, '')}`} className="inline-flex min-h-8 items-center gap-1.5 text-primary-text hover:underline">
                                        <Phone className="h-4 w-4" aria-hidden="true" />
                                        {lead.phone}
                                    </a>
                                )}
                            </p>
                            {lead.message && (
                                <blockquote className="whitespace-pre-wrap break-words rounded-lg border-l-4 border-primary/40 bg-card px-3 py-2 text-sm text-foreground">{lead.message}</blockquote>
                            )}
                        </section>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor={id('name')} className={UI_LABEL}>
                                {t('leads.form.name')}
                            </label>
                            <input id={id('name')} value={form.name} maxLength={LEAD_LIMITS.name} required onChange={(e) => set('name', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor={id('email')} className={UI_LABEL}>
                                {t('leads.form.email')}
                            </label>
                            <input id={id('email')} type="email" autoComplete="off" value={form.email} maxLength={LEAD_LIMITS.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor={id('phone')} className={UI_LABEL}>
                                {t('leads.form.phone')}
                            </label>
                            <input id={id('phone')} type="tel" autoComplete="off" value={form.phone} maxLength={LEAD_LIMITS.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
                        </div>
                        {departments.length > 0 && (
                            <div>
                                <label htmlFor={id('dept')} className={UI_LABEL}>
                                    {t('leads.form.department')}
                                </label>
                                <select id={id('dept')} value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)} className={inputClass}>
                                    <option value="">{t('leads.form.department.none')}</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label htmlFor={id('trial')} className={UI_LABEL}>
                                {t('leads.form.trialOn')}
                            </label>
                            <input id={id('trial')} type="date" value={form.trialOn} onChange={(e) => set('trialOn', e.target.value)} className={inputClass} />
                        </div>
                        {!isEdit && (
                            <div className="sm:col-span-2">
                                <label htmlFor={id('message')} className={UI_LABEL}>
                                    {t('leads.form.message')}
                                </label>
                                <textarea id={id('message')} rows={3} value={form.message} maxLength={LEAD_LIMITS.message} onChange={(e) => set('message', e.target.value)} className={inputClass} />
                            </div>
                        )}
                    </div>

                    {lead && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor={id('status')} className={UI_LABEL}>
                                    {t('leads.form.status')}
                                </label>
                                <select id={id('status')} value={form.status} disabled={statusOptions.length <= 1} onChange={(e) => set('status', e.target.value as LeadForm['status'])} className={inputClass}>
                                    {statusOptions.map((s) => (
                                        <option key={s} value={s}>
                                            {t(`leads.status.${s}`)}
                                        </option>
                                    ))}
                                </select>
                                {lead.status === 'mitglied' && <p className="mt-1 text-xs text-muted-foreground">{t('leads.form.status.final')}</p>}
                            </div>
                            <label className="flex min-h-11 cursor-pointer items-start gap-2 self-end rounded-lg px-1 py-2 text-sm text-foreground hover:bg-muted">
                                <input type="checkbox" checked={form.waitlisted} onChange={(e) => set('waitlisted', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                                <span>
                                    <span className="font-medium">{t('leads.form.waitlisted')}</span>
                                    <span className="block text-xs text-muted-foreground">{t('leads.form.waitlisted.hint')}</span>
                                </span>
                            </label>
                        </div>
                    )}

                    {isEdit && (
                        <div>
                            <label htmlFor={id('notes')} className={UI_LABEL}>
                                {t('leads.form.notes')}
                            </label>
                            <textarea id={id('notes')} rows={4} value={form.notes} maxLength={LEAD_LIMITS.notes} aria-describedby={id('notes-hint')} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
                            <p id={id('notes-hint')} className="mt-1 text-xs text-muted-foreground">
                                {t('leads.form.notes.hint')}
                            </p>
                        </div>
                    )}

                    {lead && canConvert(lead) && (
                        <section className="rounded-xl bg-primary-soft p-4">
                            <h3 className="text-sm font-bold text-primary-soft-foreground">{t('leads.convert.heading')}</h3>
                            <p className="mt-1 text-sm text-primary-soft-foreground">{t('leads.convert.hint')}</p>
                            <button type="button" onClick={() => void convert()} disabled={busy || dirty} className={`${primaryButtonClass} mt-3`}>
                                <UserPlus className="h-4 w-4" aria-hidden="true" />
                                {t('leads.convert.action')}
                            </button>
                            {dirty && <p className="mt-2 text-xs text-primary-soft-foreground">{t('leads.convert.saveFirst')}</p>}
                        </section>
                    )}
                    {lead?.convertedClubMemberId && (
                        <p className="text-sm text-muted-foreground">
                            {t('leads.converted')}{' '}
                            <Link href="/verein?tab=mitglieder" className="font-medium text-primary-text hover:underline">
                                {t('leads.converted.link')}
                            </Link>
                        </p>
                    )}

                    {problem && JSON.stringify(form) !== JSON.stringify(original) && (
                        <p role="alert" className="text-sm text-destructive">
                            {t(problem)}
                        </p>
                    )}
                    <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" disabled={busy || !!problem || !dirty}>
                        {t('leads.save')}
                    </button>
                </form>
            </Modal>
            {dialog}
        </>
    );
}
