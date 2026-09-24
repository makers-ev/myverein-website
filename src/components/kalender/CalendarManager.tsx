'use client';

import { useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { apiFetch } from '@/lib/api-client';

import {
    type Calendar,
    type CalendarVisibility,
    type Department,
    type TFn,
    errorMessage,
    inputClass,
    labelClass,
    primaryBtn,
    secondaryBtn,
} from './calendarTypes';

const CLUB_ROLE_TYPES = [
    'vorsitz',
    'stellv_vorsitz',
    'kassenwart',
    'schriftfuehrer',
    'beisitzer',
    'abteilungsleitung',
    'trainer',
    'erziehungsberechtigt',
] as const;

const iconBtn = 'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

function CalendarFormModal({
    clubId,
    departments,
    calendar,
    t,
    onClose,
    onSaved,
}: {
    clubId: string;
    departments: Department[];
    calendar?: Calendar;
    t: TFn;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(calendar?.name ?? '');
    const [departmentId, setDepartmentId] = useState(calendar?.departmentId ?? '');
    const [isDefault, setIsDefault] = useState(calendar?.isDefault ?? false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            if (calendar) {
                await apiFetch(`/calendars/${calendar.id}?clubId=${clubId}`, {
                    method: 'PATCH',
                    body: { name: name.trim(), departmentId: departmentId || null, isDefault },
                });
            } else {
                await apiFetch(`/calendars?clubId=${clubId}`, {
                    method: 'POST',
                    body: { name: name.trim(), isDefault, ...(departmentId ? { departmentId } : {}) },
                });
            }
            onSaved();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={t(calendar ? 'kalender.calendars.edit' : 'kalender.calendars.new')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={secondaryBtn}>
                        {t('kalender.cancel')}
                    </button>
                    <button type="submit" form="calendar-form" disabled={submitting || !name.trim()} className={primaryBtn}>
                        {t(calendar ? 'kalender.save' : 'kalender.calendars.new.submit')}
                    </button>
                </div>
            }
        >
            <form id="calendar-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                    <label htmlFor="cal-name" className={labelClass}>
                        {t('kalender.calendars.new.name')} *
                    </label>
                    <input id="cal-name" type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="cal-department" className={labelClass}>
                        {t('kalender.calendars.new.department')}
                    </label>
                    <select id="cal-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                        <option value="">{t('kalender.calendars.new.department.none')}</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-primary" />
                    {t('kalender.calendars.new.is-default')}
                </label>
                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}

function VisibilityModal({
    clubId,
    calendar,
    departments,
    t,
    onClose,
}: {
    clubId: string;
    calendar: Calendar;
    departments: Department[];
    t: TFn;
    onClose: () => void;
}) {
    const [grants, setGrants] = useState<CalendarVisibility[] | null>(null);
    const [grantType, setGrantType] = useState<'role' | 'department'>('role');
    const [roleType, setRoleType] = useState<(typeof CLUB_ROLE_TYPES)[number]>('vorsitz');
    const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
    const [error, setError] = useState<string | null>(null);
    const baseUrl = `/calendars/${calendar.id}/visibility`;

    async function load() {
        try {
            const { data } = await apiFetch<{ data: CalendarVisibility[] }>(`${baseUrl}?clubId=${clubId}`);
            setGrants(data);
        } catch (err) {
            setError(errorMessage(err));
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendar.id]);

    async function mutate(action: () => Promise<unknown>) {
        setError(null);
        try {
            await action();
            await load();
        } catch (err) {
            setError(errorMessage(err));
        }
    }

    const labelFor = (g: CalendarVisibility) =>
        g.memberId
            ? `${t('kalender.calendars.visibility.member')}: ${g.memberId}`
            : g.roleType
              ? `${t('kalender.calendars.visibility.role')}: ${t(`verein.role.${g.roleType}`)}`
              : `${t('kalender.calendars.visibility.department')}: ${departments.find((d) => d.id === g.departmentId)?.name ?? g.departmentId}`;

    return (
        <Modal open onClose={onClose} title={`${t('kalender.calendars.visibility.title')} · ${calendar.name}`}>
            <div className="space-y-4">
                <div>
                    <p className={labelClass}>{t('kalender.calendars.visibility.current')}</p>
                    {grants === null ? (
                        <p className="text-sm text-muted-foreground">…</p>
                    ) : grants.length === 0 ? (
                        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{t('kalender.calendars.visibility.everyone')}</p>
                    ) : (
                        <ul className="flex flex-wrap gap-2">
                            {grants.map((g) => (
                                <li key={g.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-xs font-medium text-primary">
                                    {labelFor(g)}
                                    <button
                                        type="button"
                                        onClick={() => void mutate(() => apiFetch(`${baseUrl}/${g.id}?clubId=${clubId}`, { method: 'DELETE' }))}
                                        aria-label={`${t('kalender.calendars.visibility.remove')}: ${labelFor(g)}`}
                                        className="rounded-full p-0.5 hover:bg-primary/20"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-lg border border-border p-3">
                    <p className="mb-2 text-sm font-semibold text-foreground">{t('kalender.calendars.visibility.add')}</p>
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                        <div>
                            <label htmlFor="grant-type" className={labelClass}>
                                {t('kalender.calendars.visibility.type')}
                            </label>
                            <select id="grant-type" value={grantType} onChange={(e) => setGrantType(e.target.value as 'role' | 'department')} className={inputClass}>
                                <option value="role">{t('kalender.calendars.visibility.role')}</option>
                                <option value="department">{t('kalender.calendars.visibility.department')}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="grant-value" className={labelClass}>
                                {t(grantType === 'role' ? 'kalender.calendars.visibility.role' : 'kalender.calendars.visibility.department')}
                            </label>
                            {grantType === 'role' ? (
                                <select
                                    id="grant-value"
                                    value={roleType}
                                    onChange={(e) => setRoleType(e.target.value as (typeof CLUB_ROLE_TYPES)[number])}
                                    className={inputClass}
                                >
                                    {CLUB_ROLE_TYPES.map((rt) => (
                                        <option key={rt} value={rt}>
                                            {t(`verein.role.${rt}`)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <select id="grant-value" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                void mutate(() =>
                                    apiFetch(`${baseUrl}?clubId=${clubId}`, { method: 'POST', body: grantType === 'role' ? { roleType } : { departmentId } }),
                                )
                            }
                            disabled={grantType === 'department' && !departmentId}
                            className={primaryBtn}
                        >
                            {t('kalender.add')}
                        </button>
                    </div>
                </div>
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
    );
}

type ModalState = { kind: 'create' } | { kind: 'edit'; calendar: Calendar } | { kind: 'visibility'; calendar: Calendar } | null;

export default function CalendarManager({
    calendars,
    departments,
    clubId,
    colorFor,
    t,
    onChange,
}: {
    calendars: Calendar[];
    departments: Department[];
    clubId: string;
    colorFor: (calendarId: string) => string;
    t: TFn;
    onChange: () => void;
}) {
    const [modal, setModal] = useState<ModalState>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleDelete(cal: Calendar) {
        if (!window.confirm(t('kalender.calendars.delete.confirm', { name: cal.name }))) return;
        setError(null);
        try {
            await apiFetch(`/calendars/${cal.id}?clubId=${clubId}`, { method: 'DELETE' });
            onChange();
        } catch (err) {
            setError(errorMessage(err));
        }
    }

    const saved = () => {
        setModal(null);
        onChange();
    };

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">{t('kalender.calendars.title')}</h2>
                <button type="button" onClick={() => setModal({ kind: 'create' })} className={`${secondaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                    <Plus className="h-4 w-4" aria-hidden />
                    {t('kalender.calendars.new')}
                </button>
            </div>
            {error && (
                <p role="alert" className="mb-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {calendars.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('kalender.calendars.empty')}</p>
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                    {calendars.map((cal) => (
                        <li key={cal.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorFor(cal.id) }} aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
                                    {cal.name}
                                    {cal.isDefault && (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                            {t('kalender.calendars.default')}
                                        </span>
                                    )}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {departments.find((d) => d.id === cal.departmentId)?.name ?? t('kalender.calendars.new.department.none')}
                                </p>
                            </div>
                            <button type="button" onClick={() => setModal({ kind: 'visibility', calendar: cal })} className={iconBtn} aria-label={t('kalender.calendars.visibility.title')} title={t('kalender.calendars.visibility.title')}>
                                <Eye className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => setModal({ kind: 'edit', calendar: cal })} className={iconBtn} aria-label={t('kalender.calendars.edit')} title={t('kalender.calendars.edit')}>
                                <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => void handleDelete(cal)} className={`${iconBtn} hover:!text-destructive`} aria-label={t('kalender.calendars.delete')} title={t('kalender.calendars.delete')}>
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {modal?.kind === 'create' && <CalendarFormModal clubId={clubId} departments={departments} t={t} onClose={() => setModal(null)} onSaved={saved} />}
            {modal?.kind === 'edit' && (
                <CalendarFormModal clubId={clubId} departments={departments} calendar={modal.calendar} t={t} onClose={() => setModal(null)} onSaved={saved} />
            )}
            {modal?.kind === 'visibility' && (
                <VisibilityModal clubId={clubId} calendar={modal.calendar} departments={departments} t={t} onClose={() => setModal(null)} />
            )}
        </section>
    );
}
