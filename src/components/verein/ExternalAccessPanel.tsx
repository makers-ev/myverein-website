'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { CalendarClock, KeyRound, Loader2, Mail, Plus, Trash2 } from 'lucide-react';

import LoadError from '@/components/LoadError';
import { Modal } from '@/components/Modal';
import { Chip } from '@/components/standorte/ui';
import { EmptyState, Skeleton } from '@/components/ui';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    type Assignment,
    type AssignmentForm,
    assignmentBody,
    assignmentProblem,
    buildRows,
    canResend,
    canRevoke,
    emptyAssignmentForm,
    emptyInviteForm,
    type ExternalAccount,
    type ExternalInvite,
    externalErrorKey,
    EXTERNAL_ROLES,
    type ExternalRow,
    formFromAssignment,
    inviteBody,
    type InviteForm,
    inviteProblem,
    normalizeExternalData,
} from '@/lib/externalAccess';
import { UI_BTN_DANGER_OUTLINE, UI_LABEL } from '@/lib/uiClasses';

type Named = { id: string; name: string };
type Notice = { tone: 'ok' | 'warn'; text: string } | null;

function dateTime(iso: string, language: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' });
}

/** Dialog: invite a sponsor or service provider by e-mail (optional: link an existing sponsor profile). */
function InviteDialog({ clubId, sponsors, onClose, onDone }: { clubId: string; sponsors: Named[] | null; onClose: () => void; onDone: (emailSent: boolean) => void }) {
    const { t } = useLanguage();
    const uid = useId();
    const [form, setForm] = useState<InviteForm>(emptyInviteForm());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { confirm, dialog } = useConfirm();
    const problem = inviteProblem(form);
    const set = <K extends keyof InviteForm>(k: K, v: InviteForm[K]) => {
        setError(null);
        setForm((f) => ({ ...f, [k]: v }));
    };
    const hasInput = JSON.stringify(form) !== JSON.stringify(emptyInviteForm());

    async function requestClose() {
        if (busy) return;
        if (hasInput && !(await confirm({ title: t('forms.confirm.discard.title'), body: t('forms.editor.discardChanges.body'), confirmLabel: t('forms.confirm.discard.confirm'), danger: true }))) return;
        onClose();
    }

    async function send() {
        if (busy || problem) return;
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: { emailSent?: boolean } }>(`/external-access/invites?clubId=${encodeURIComponent(clubId)}`, { method: 'POST', body: inviteBody(form) });
            onDone(res.data.emailSent !== false);
        } catch (err) {
            setError(t(externalErrorKey(err)));
            setBusy(false);
        }
    }

    return (
        <>
            <Modal
                open
                onClose={() => void requestClose()}
                title={t('ext.invite.title')}
                footer={
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => void requestClose()} disabled={busy} className={secondaryButtonClass}>
                            {t('ext.cancel')}
                        </button>
                        <button type="button" onClick={() => void send()} disabled={busy || !!problem} className={primaryButtonClass}>
                            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {t('ext.invite.send')}
                        </button>
                    </div>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send();
                    }}
                    className="space-y-4"
                    noValidate
                >
                    <fieldset>
                        <legend className={UI_LABEL}>{t('ext.invite.role')}</legend>
                        <div className="space-y-1">
                            {EXTERNAL_ROLES.map((r) => (
                                <label key={r} className="flex min-h-11 items-start gap-2 text-sm text-foreground">
                                    <input type="radio" name={`${uid}-role`} className="mt-1" checked={form.roleType === r} onChange={() => set('roleType', r)} />
                                    <span>
                                        <span className="font-medium">{t(`ext.role.${r}`)}</span>
                                        <span className="block text-xs text-muted-foreground">{t(`ext.role.${r}.sees`)}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div>
                        <label htmlFor={`${uid}-name`} className={UI_LABEL}>
                            {t('ext.invite.name')}
                        </label>
                        <input id={`${uid}-name`} className={inputClass} value={form.displayName} maxLength={120} onChange={(e) => set('displayName', e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor={`${uid}-email`} className={UI_LABEL}>
                            {t('ext.invite.email')}
                        </label>
                        <input id={`${uid}-email`} type="email" autoComplete="off" className={inputClass} value={form.email} maxLength={320} onChange={(e) => set('email', e.target.value)} aria-describedby={`${uid}-email-hint`} />
                        <p id={`${uid}-email-hint`} className="mt-1 text-xs text-muted-foreground">
                            {t('ext.invite.email.hint')}
                        </p>
                    </div>
                    {form.roleType === 'sponsor' && sponsors && sponsors.length > 0 && (
                        <div>
                            <label htmlFor={`${uid}-sponsor`} className={UI_LABEL}>
                                {t('ext.invite.sponsor')}
                            </label>
                            <select id={`${uid}-sponsor`} className={inputClass} value={form.sponsorId} onChange={(e) => set('sponsorId', e.target.value)}>
                                <option value="">{t('ext.invite.sponsor.none')}</option>
                                {sponsors.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-muted-foreground">{t('ext.invite.sponsor.hint')}</p>
                        </div>
                    )}
                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t('ext.invite.valid')}</p>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" disabled={busy || !!problem}>
                        {t('ext.invite.send')}
                    </button>
                </form>
            </Modal>
            {dialog}
        </>
    );
}

/** Dialog: an assignment of a service provider (place + time window + note). Access details become visible only inside the window. */
function AssignmentDialog({ clubId, account, assignment, locations, onClose, onDone }: { clubId: string; account: ExternalAccount; assignment: Assignment | null; locations: Named[] | null; onClose: () => void; onDone: () => void }) {
    const { t } = useLanguage();
    const uid = useId();
    const original = assignment ? formFromAssignment(assignment) : emptyAssignmentForm();
    const [form, setForm] = useState<AssignmentForm>(original);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { confirm, dialog } = useConfirm();
    const problem = assignmentProblem(form);
    const hasInput = JSON.stringify(form) !== JSON.stringify(original);
    const set = <K extends keyof AssignmentForm>(k: K, v: AssignmentForm[K]) => {
        setError(null);
        setForm((f) => ({ ...f, [k]: v }));
    };
    const base = `/external-access/accounts/${encodeURIComponent(account.memberId)}/assignments`;
    const q = `clubId=${encodeURIComponent(clubId)}`;

    async function requestClose() {
        if (busy) return;
        if (hasInput && !(await confirm({ title: t('forms.confirm.discard.title'), body: t('forms.editor.discardChanges.body'), confirmLabel: t('forms.confirm.discard.confirm'), danger: true }))) return;
        onClose();
    }

    async function save() {
        if (busy || problem) return;
        setBusy(true);
        setError(null);
        try {
            if (assignment) await apiFetch(`${base}/${encodeURIComponent(assignment.id)}?${q}`, { method: 'PATCH', body: assignmentBody(form) });
            else await apiFetch(`${base}?${q}`, { method: 'POST', body: assignmentBody(form) });
            onDone();
        } catch (err) {
            setError(t(externalErrorKey(err)));
            setBusy(false);
        }
    }

    async function remove() {
        if (!assignment || busy) return;
        if (!(await confirm({ title: t('ext.assign.delete.title'), body: t('ext.assign.delete.body', { title: assignment.title }), confirmLabel: t('ext.assign.delete.confirm'), danger: true }))) return;
        setBusy(true);
        try {
            await apiFetch(`${base}/${encodeURIComponent(assignment.id)}?${q}`, { method: 'DELETE' });
            onDone();
        } catch (err) {
            setError(t(externalErrorKey(err)));
            setBusy(false);
        }
    }

    return (
        <>
            <Modal
                open
                onClose={() => void requestClose()}
                title={t(assignment ? 'ext.assign.title.edit' : 'ext.assign.title.new', { name: account.name })}
                footer={
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            {assignment && (
                                <button type="button" onClick={() => void remove()} disabled={busy} className={`${UI_BTN_DANGER_OUTLINE} gap-1.5`}>
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    {t('ext.assign.delete')}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => void requestClose()} disabled={busy} className={secondaryButtonClass}>
                                {t('ext.cancel')}
                            </button>
                            <button type="button" onClick={() => void save()} disabled={busy || !!problem || (!!assignment && !hasInput)} className={primaryButtonClass}>
                                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                {t('ext.assign.save')}
                            </button>
                        </div>
                    </div>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void save();
                    }}
                    className="space-y-4"
                    noValidate
                >
                    <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-soft-foreground">{t('ext.assign.window.notice')}</p>
                    <div>
                        <label htmlFor={`${uid}-title`} className={UI_LABEL}>
                            {t('ext.assign.what')}
                        </label>
                        <input id={`${uid}-title`} className={inputClass} value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor={`${uid}-loc`} className={UI_LABEL}>
                            {t('ext.assign.location')}
                        </label>
                        <select id={`${uid}-loc`} className={inputClass} value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
                            <option value="">{t('ext.assign.location.none')}</option>
                            {(locations ?? []).map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`${uid}-from`} className={UI_LABEL}>
                                {t('ext.assign.from')}
                            </label>
                            <input id={`${uid}-from`} type="datetime-local" className={inputClass} value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
                        </div>
                        <div>
                            <label htmlFor={`${uid}-until`} className={UI_LABEL}>
                                {t('ext.assign.until')}
                            </label>
                            <input id={`${uid}-until`} type="datetime-local" className={inputClass} value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor={`${uid}-note`} className={UI_LABEL}>
                            {t('ext.assign.note')}
                        </label>
                        <textarea id={`${uid}-note`} rows={3} maxLength={1000} className={inputClass} value={form.note} onChange={(e) => set('note', e.target.value)} aria-describedby={`${uid}-note-hint`} />
                        <p id={`${uid}-note-hint`} className="mt-1 text-xs text-muted-foreground">
                            {t('ext.assign.note.hint')}
                        </p>
                    </div>
                    {form.validFrom && form.validUntil && problem && (
                        <p role="alert" className="text-sm text-destructive">
                            {t(problem)}
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" disabled={busy || !!problem}>
                        {t('ext.assign.save')}
                    </button>
                </form>
            </Modal>
            {dialog}
        </>
    );
}

const STATUS_TONE = { aktiv: 'success', eingeladen: 'primary', abgelaufen: 'warning', widerrufen: 'muted' } as const;

/**
 * "Externe Zugänge" tab (Wave 15 W-ext, `roles:write`): sponsors and service providers get a limited login by e-mail invitation. The list
 * merges invitations and active accounts; invitations can be resent or revoked, access can be withdrawn, service providers get assignments
 * (place + time window; the access details are visible to them only inside the window). External logins never see member data.
 */
export default function ExternalAccessPanel({ clubId }: { clubId: string }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [data, setData] = useState<{ invites: ExternalInvite[]; accounts: ExternalAccount[] } | null>(null);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [sponsors, setSponsors] = useState<Named[] | null>(null);
    const [locations, setLocations] = useState<Named[] | null>(null);
    const [notice, setNotice] = useState<Notice>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);
    const [assigning, setAssigning] = useState<{ account: ExternalAccount; assignment: Assignment | null } | null>(null);
    const q = `clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: unknown }>(`/external-access?${q}`);
            setData(normalizeExternalData(res.data));
            setLoadError(null);
        } catch (err) {
            setLoadError(err);
        }
    }, [q]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // Optional pick lists: a missing right just hides the picker.
        apiFetch<{ data: { id: string; name: string }[] }>(`/sponsors?${q}`).then((r) => setSponsors(r.data.map((s) => ({ id: s.id, name: s.name })))).catch(() => setSponsors(null));
        apiFetch<{ data: { id: string; name: string }[] }>(`/locations?${q}`).then((r) => setLocations(r.data.map((l) => ({ id: l.id, name: l.name })))).catch(() => setLocations(null));
    }, [load, q]);

    async function act(id: string, action: () => Promise<void>, okKey: string) {
        setBusyId(id);
        setNotice(null);
        try {
            await action();
            setNotice({ tone: 'ok', text: t(okKey) });
            await load();
        } catch (err) {
            setNotice({ tone: 'warn', text: t(externalErrorKey(err)) });
        } finally {
            setBusyId(null);
        }
    }

    async function resend(i: ExternalInvite) {
        setBusyId(i.id);
        setNotice(null);
        try {
            const res = await apiFetch<{ data: { emailSent?: boolean } }>(`/external-access/invites/${encodeURIComponent(i.id)}/resend?${q}`, { method: 'POST' });
            setNotice(res.data.emailSent === false ? { tone: 'warn', text: t('ext.invited.noMail') } : { tone: 'ok', text: t('ext.resent') });
            await load();
        } catch (err) {
            setNotice({ tone: 'warn', text: t(externalErrorKey(err)) });
        } finally {
            setBusyId(null);
        }
    }

    async function revoke(i: ExternalInvite) {
        if (!(await confirm({ title: t('ext.revoke.title'), body: t('ext.revoke.body', { email: i.email }), confirmLabel: t('ext.revoke.confirm'), danger: true }))) return;
        await act(i.id, () => apiFetch(`/external-access/invites/${encodeURIComponent(i.id)}?${q}`, { method: 'DELETE' }).then(() => undefined), 'ext.revoked');
    }

    async function removeAccess(a: ExternalAccount) {
        if (!(await confirm({ title: t('ext.remove.title'), body: t('ext.remove.body', { name: a.name }), confirmLabel: t('ext.remove.confirm'), danger: true }))) return;
        await act(a.memberId, () => apiFetch(`/external-access/accounts/${encodeURIComponent(a.memberId)}?${q}`, { method: 'DELETE' }).then(() => undefined), 'ext.removed');
    }

    const rows: ExternalRow[] = data ? buildRows(data.invites, data.accounts) : [];

    return (
        <div className="space-y-5">
            <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-primary-soft p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-primary-soft-foreground">{t('ext.title')}</h2>
                    <p className="mt-1 text-sm text-primary-soft-foreground">{t('ext.intro')}</p>
                </div>
                <button type="button" onClick={() => setInviting(true)} className={primaryButtonClass}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('ext.invite.open')}
                </button>
            </header>

            <section aria-labelledby="ext-sees" className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
                <h3 id="ext-sees" className="text-base font-bold text-foreground">
                    {t('ext.sees.title')}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>{t('ext.sees.sponsor')}</li>
                    <li>{t('ext.sees.provider')}</li>
                    <li className="font-medium text-foreground">{t('ext.sees.never')}</li>
                </ul>
            </section>

            {notice && (
                <p role={notice.tone === 'warn' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${notice.tone === 'warn' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
                    {notice.text}
                </p>
            )}
            {loadError !== null && <LoadError error={loadError} onRetry={() => void load()} />}
            {data === null && loadError === null && <Skeleton lines={4} />}

            {data !== null && rows.length === 0 && (
                <EmptyState
                    title={t('ext.empty.title')}
                    hint={t('ext.empty.hint')}
                    action={
                        <button type="button" onClick={() => setInviting(true)} className={primaryButtonClass}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            {t('ext.invite.open')}
                        </button>
                    }
                />
            )}

            {rows.length > 0 && (
                <ul className="space-y-3">
                    {rows.map((row) => {
                        const busy = busyId === (row.kind === 'invite' ? row.invite.id : row.account.memberId);
                        return (
                            <li key={row.id}>
                                <article className="rounded-2xl bg-card p-4 shadow-card">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="break-words text-base font-bold text-foreground">{row.name}</h4>
                                            <p className="break-all text-sm text-muted-foreground">{row.email}</p>
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                <Chip tone={STATUS_TONE[row.status]}>{t(`ext.status.${row.status}`)}</Chip>
                                                <Chip tone="muted">{t(`ext.role.${row.role}`)}</Chip>
                                                {row.sponsor && <Chip tone="primary">{t('ext.linkedSponsor', { name: row.sponsor })}</Chip>}
                                            </div>
                                            {row.kind === 'invite' && row.status === 'eingeladen' && <p className="mt-1 text-xs text-muted-foreground">{t('ext.validUntil', { date: formatDate(row.invite.expiresAt, language) })}</p>}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {row.kind === 'invite' && canResend(row.invite) && (
                                                <button type="button" disabled={busy} onClick={() => void resend(row.invite)} className={`${secondaryButtonClass} gap-1.5`}>
                                                    <Mail className="h-4 w-4" aria-hidden="true" />
                                                    {t('ext.resend')}
                                                </button>
                                            )}
                                            {row.kind === 'invite' && canRevoke(row.invite) && (
                                                <button type="button" disabled={busy} onClick={() => void revoke(row.invite)} className={secondaryButtonClass}>
                                                    {t('ext.revoke')}
                                                </button>
                                            )}
                                            {row.kind === 'account' && row.account.roleTypes[0] === row.role && (
                                                <button type="button" disabled={busy} onClick={() => void removeAccess(row.account)} className={`${UI_BTN_DANGER_OUTLINE} gap-1.5`}>
                                                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                                                    {t('ext.remove')}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {row.kind === 'account' && row.role === 'dienstleister' && (
                                        <section aria-label={t('ext.assign.list', { name: row.name })} className="mt-4 border-t border-hairline pt-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h5 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                                                    {t('ext.assign.heading')}
                                                </h5>
                                                <button type="button" onClick={() => setAssigning({ account: row.account, assignment: null })} className={`${secondaryButtonClass} gap-1.5`}>
                                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                                    {t('ext.assign.add')}
                                                </button>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">{t('ext.assign.window.notice')}</p>
                                            {row.account.assignments.length === 0 ? (
                                                <p className="mt-2 text-sm text-muted-foreground">{t('ext.assign.empty')}</p>
                                            ) : (
                                                <ul className="mt-2 space-y-2">
                                                    {row.account.assignments.map((a) => (
                                                        <li key={a.id}>
                                                            <button type="button" onClick={() => setAssigning({ account: row.account, assignment: a })} className="flex min-h-11 w-full flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">
                                                                <span className="min-w-0">
                                                                    <span className="block font-medium text-foreground">{a.title}</span>
                                                                    <span className="block text-xs text-muted-foreground">
                                                                        {a.location?.name ?? t('ext.assign.location.none')} · {dateTime(a.validFrom, language)} – {dateTime(a.validUntil, language)}
                                                                    </span>
                                                                </span>
                                                                <Chip tone={a.active ? 'success' : 'muted'}>{t(a.active ? 'ext.assign.active' : 'ext.assign.upcoming')}</Chip>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </section>
                                    )}
                                </article>
                            </li>
                        );
                    })}
                </ul>
            )}

            {inviting && (
                <InviteDialog
                    clubId={clubId}
                    sponsors={sponsors}
                    onClose={() => setInviting(false)}
                    onDone={(emailSent) => {
                        setInviting(false);
                        setNotice(emailSent ? { tone: 'ok', text: t('ext.invited') } : { tone: 'warn', text: t('ext.invited.noMail') });
                        void load();
                    }}
                />
            )}
            {assigning && (
                <AssignmentDialog
                    key={assigning.assignment?.id ?? 'new'}
                    clubId={clubId}
                    account={assigning.account}
                    assignment={assigning.assignment}
                    locations={locations}
                    onClose={() => setAssigning(null)}
                    onDone={() => {
                        setAssigning(null);
                        setNotice({ tone: 'ok', text: t('ext.assign.saved') });
                        void load();
                    }}
                />
            )}
            {dialog}
        </div>
    );
}
