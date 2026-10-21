'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, Clock, Tag, Users } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { Toggle } from '@/components/standorte/ui';
import { apiFetch } from '@/lib/api-client';

import EventAbsenceOverlay from './EventAbsenceOverlay';

import {
    type Calendar,
    type CalendarEvent,
    defaultCalendarId,
    type RsvpStatus,
    type TFn,
    dangerBtn,
    errorMessage,
    formatTimeRange,
    inputClass,
    labelClass,
    primaryBtn,
    secondaryBtn,
    timeChanged,
    toLocalInput,
} from './calendarTypes';

const REASON_MAX = 500;

/** `GET /events/:id/cancel-preview`: numbers only, no names or addresses. */
interface CancelPreview {
    alreadyCancelled: boolean;
    confirmed: number;
    waitlisted: number;
    departmentCalendar: boolean;
    audience: { total: number; reachable: number; inApp: number; email: number; emailOnly: number; unreachable: number; sharedAddress: number; tooLarge: boolean };
}

interface CancelProps {
    event: CalendarEvent;
    clubId: string;
    calendar: Calendar | undefined;
    t: TFn;
    onClose: () => void;
    onCancelled: () => void;
}

/**
 * "Termin absagen" (Wave 9 W5): cancels instead of deleting, with an optional reason and the switch "Mitglieder benachrichtigen"
 * (on by default). Who is told is described in words: attendees and waitlist, the members of the calendar's department and
 * their guardians. Turning the switch off sends nothing (the backend records that in the audit log).
 */
export function CancelEventModal({ event, clubId, calendar, t, onClose, onCancelled }: CancelProps) {
    const [reason, setReason] = useState('');
    const [notify, setNotify] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<CancelPreview | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const loadPreview = useCallback(async () => {
        setPreviewError(null);
        setPreview(null);
        try {
            const res = await apiFetch<{ data: CancelPreview }>(`/events/${event.id}/cancel-preview?clubId=${clubId}`);
            setPreview(res.data);
        } catch (err) {
            setPreviewError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event.id, clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadPreview();
    }, [loadPreview]);

    const tooLarge = preview?.audience.tooLarge === true;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/events/${event.id}/cancel?clubId=${clubId}`, { method: 'POST', body: { reason: reason.trim() || undefined, notify } });
            onCancelled();
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={t('kalender.cancelEvent.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={secondaryBtn}>
                        {t('kalender.cancelEvent.back')}
                    </button>
                    <button type="submit" form="cancel-event-form" disabled={busy} className={dangerBtn}>
                        {t('kalender.cancelEvent.confirm')}
                    </button>
                </div>
            }
        >
            <form id="cancel-event-form" onSubmit={(e) => void submit(e)} className="space-y-4">
                <p className="text-sm text-foreground">{t('kalender.cancelEvent.body', { title: event.title })}</p>
                <div>
                    <label htmlFor="cancel-reason" className={labelClass}>
                        {t('kalender.cancelEvent.reason')}
                    </label>
                    <textarea id="cancel-reason" rows={3} maxLength={REASON_MAX} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder={t('kalender.cancelEvent.reason.placeholder')} />
                    <p className="mt-1 text-xs text-muted-foreground">{t('kalender.cancelEvent.reason.hint', { count: reason.length, max: REASON_MAX })}</p>
                </div>
                <div className="space-y-1">
                    <Toggle checked={notify} onChange={setNotify} label={t('kalender.notify.label')} />
                    <p className="text-xs text-muted-foreground">{t(notify ? (calendar?.departmentId ? 'kalender.cancelEvent.audience.department' : 'kalender.cancelEvent.audience') : 'kalender.notify.off')}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground" aria-live="polite">
                    <p className="font-semibold">{t('kalender.cancelEvent.preview.title')}</p>
                    {previewError ? (
                        <p role="alert" className="mt-1 text-destructive">
                            {previewError}{' '}
                            <button type="button" onClick={() => void loadPreview()} className="font-semibold underline">
                                {t('kalender.cancelEvent.preview.retry')}
                            </button>
                        </p>
                    ) : !preview ? (
                        <p role="status" className="mt-1 text-muted-foreground">
                            {t('kalender.cancelEvent.preview.loading')}
                        </p>
                    ) : (
                        <div className="mt-1 space-y-1">
                            <p>{t('kalender.cancelEvent.preview.counts', { confirmed: preview.confirmed, waitlisted: preview.waitlisted })}</p>
                            {notify ? (
                                <>
                                    {preview.audience.total === 0 ? (
                                        <p className="text-muted-foreground">{t('kalender.cancelEvent.preview.none')}</p>
                                    ) : (
                                        <p>{t('kalender.cancelEvent.preview.audience', { total: preview.audience.total, reachable: preview.audience.reachable, inApp: preview.audience.inApp, email: preview.audience.email })}</p>
                                    )}
                                    {preview.audience.unreachable > 0 && <p className="text-xs text-muted-foreground">{t('kalender.cancelEvent.preview.unreachable', { count: preview.audience.unreachable })}</p>}
                                    {preview.audience.sharedAddress > 0 && <p className="text-xs text-muted-foreground">{t('kalender.cancelEvent.preview.shared', { count: preview.audience.sharedAddress })}</p>}
                                    {tooLarge && (
                                        <p role="alert" className="rounded-md bg-warning/10 px-2 py-1 text-foreground">
                                            {t('kalender.cancelEvent.preview.tooLarge', { total: preview.audience.total })}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted-foreground">{t('kalender.notify.off')}</p>
                            )}
                        </div>
                    )}
                </div>
                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}

interface DetailProps {
    event: CalendarEvent;
    clubId: string;
    calendar: Calendar | undefined;
    color: string;
    canWrite: boolean;
    /** `absences:read`: shows who is absent on the day of the event (names and period only). */
    canSeeAbsences?: boolean;
    rsvp: RsvpStatus | undefined;
    language: string;
    t: TFn;
    onClose: () => void;
    onRsvpChange: (status: RsvpStatus | undefined) => void;
    onEdit: () => void;
    onDeleted: () => void;
}

export function EventDetailModal({ event, clubId, calendar, color, canWrite, canSeeAbsences = false, rsvp, language, t, onClose, onRsvpChange, onEdit, onDeleted }: DetailProps) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const cancelled = Boolean(event.cancelled);

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    }

    const rsvpUrl = `/events/${event.id}/rsvp?clubId=${clubId}`;
    const handleRsvp = () =>
        run(async () => {
            const { data } = await apiFetch<{ data: { status: RsvpStatus } }>(rsvpUrl, { method: 'POST' });
            onRsvpChange(data.status);
        });
    const handleCancel = () =>
        run(async () => {
            await apiFetch(rsvpUrl, { method: 'DELETE' });
            onRsvpChange(undefined);
        });
    const handleDelete = () => {
        if (!window.confirm(t('kalender.events.delete.confirm', { title: event.title }))) return;
        void run(async () => {
            await apiFetch(`/events/${event.id}?clubId=${clubId}`, { method: 'DELETE' });
            onDeleted();
        });
    };

    const start = new Date(event.startsAt);

    return (
        <>
        <Modal
            open
            onClose={onClose}
            title={event.title}
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {cancelled ? (
                            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">{t('kalender.events.cancelled')}</span>
                        ) : rsvp ? (
                            <>
                                <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        rsvp === 'angemeldet' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                                    }`}
                                >
                                    {t(rsvp === 'angemeldet' ? 'kalender.events.rsvp.confirmed' : 'kalender.events.rsvp.waitlist')}
                                </span>
                                <button type="button" onClick={() => void handleCancel()} disabled={busy} className={secondaryBtn}>
                                    {t('kalender.events.rsvp.cancel')}
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={() => void handleRsvp()} disabled={busy} className={primaryBtn}>
                                {t('kalender.events.rsvp')}
                            </button>
                        )}
                    </div>
                    {canWrite && (
                        <div className="flex items-center gap-2">
                            {!cancelled && (
                                <>
                                    <button type="button" onClick={onEdit} disabled={busy} className={secondaryBtn}>
                                        {t('kalender.events.edit')}
                                    </button>
                                    <button type="button" onClick={() => setCancelling(true)} disabled={busy} className={dangerBtn}>
                                        {t('kalender.cancelEvent.action')}
                                    </button>
                                </>
                            )}
                            <button type="button" onClick={handleDelete} disabled={busy} className={dangerBtn}>
                                {t('kalender.events.delete')}
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-3 text-sm">
                {cancelled && (
                    <div role="status" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                        <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <p>
                            <span className="font-semibold">{t('kalender.events.cancelled')}</span>
                            {event.cancelReason ? <span className="block whitespace-pre-line text-foreground">{event.cancelReason}</span> : null}
                        </p>
                    </div>
                )}
                <p className="flex items-start gap-2 text-foreground">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>
                        <span className="font-semibold">{start.toLocaleDateString(language, { dateStyle: 'full' })}</span>
                        <br />
                        {formatTimeRange(event, language)}
                        {event.endsAt && new Date(event.endsAt).toDateString() !== start.toDateString() && (
                            <span className="text-muted-foreground"> ({new Date(event.endsAt).toLocaleDateString(language)})</span>
                        )}
                    </span>
                </p>
                <p className="flex items-center gap-2 text-foreground">
                    <span className="ml-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                    <span className="ml-0.5">{calendar?.name ?? '—'}</span>
                </p>
                {event.category && (
                    <p className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" aria-hidden />
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{event.category}</span>
                    </p>
                )}
                {event.capacity != null && (
                    <p className="flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {t('kalender.events.capacity.max', { count: event.capacity })}
                    </p>
                )}
                {event.description && <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-foreground">{event.description}</p>}
                {canSeeAbsences && !cancelled && <EventAbsenceOverlay clubId={clubId} eventId={event.id} />}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
        {cancelling && <CancelEventModal event={event} clubId={clubId} calendar={calendar} t={t} onClose={() => setCancelling(false)} onCancelled={onDeleted} />}
        </>
    );
}

interface FormProps {
    clubId: string;
    calendars: Calendar[];
    colorFor: (calendarId: string) => string;
    /** Existing event to edit; omitted when creating. */
    event?: CalendarEvent;
    /** Prefilled start for new events. */
    initialStart?: Date;
    t: TFn;
    onClose: () => void;
    onSaved: () => void;
}

export function EventFormModal({ clubId, calendars, colorFor, event, initialStart, t, onClose, onSaved }: FormProps) {
    const defaultStart = initialStart ?? new Date();
    const [calendarId, setCalendarId] = useState(event?.calendarId ?? defaultCalendarId(calendars));
    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    const [category, setCategory] = useState(event?.category ?? '');
    const [startsAt, setStartsAt] = useState(toLocalInput(event ? new Date(event.startsAt) : defaultStart));
    const [endsAt, setEndsAt] = useState(
        event ? (event.endsAt ? toLocalInput(new Date(event.endsAt)) : '') : toLocalInput(new Date(defaultStart.getTime() + 2 * 3600_000)),
    );
    const [capacity, setCapacity] = useState(event?.capacity != null ? String(event.capacity) : '');
    // Wave 9 W5: members affected by a change are told by default; the switch only exists when editing.
    const [notify, setNotify] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const endBeforeStart = Boolean(startsAt && endsAt && new Date(endsAt) <= new Date(startsAt));
    const capacityInvalid = capacity !== '' && !(Number.isInteger(Number(capacity)) && Number(capacity) > 0);
    const timeWillChange = Boolean(event && startsAt && timeChanged(event, new Date(startsAt).toISOString(), endsAt ? new Date(endsAt).toISOString() : null));
    const invalid = !calendarId || !title.trim() || !startsAt || endBeforeStart || capacityInvalid;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (invalid) return;
        setSubmitting(true);
        setError(null);
        // PATCH clears optional fields with null, POST simply omits them
        const empty = event ? null : undefined;
        const body = {
            calendarId,
            title: title.trim(),
            description: description.trim() || empty,
            category: category.trim() || empty,
            startsAt: new Date(startsAt).toISOString(),
            endsAt: endsAt ? new Date(endsAt).toISOString() : empty,
            capacity: capacity ? Number(capacity) : empty,
            ...(event ? { notify } : {}),
        };
        try {
            await apiFetch(event ? `/events/${event.id}?clubId=${clubId}` : `/events?clubId=${clubId}`, {
                method: event ? 'PATCH' : 'POST',
                body,
            });
            onSaved();
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={t(event ? 'kalender.events.edit.title' : 'kalender.events.new')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={secondaryBtn}>
                        {t('kalender.cancel')}
                    </button>
                    <button type="submit" form="event-form" disabled={submitting || invalid} className={primaryBtn}>
                        {t(event ? 'kalender.save' : 'kalender.events.new.submit')}
                    </button>
                </div>
            }
        >
            <form id="event-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                    <label htmlFor="ev-title" className={labelClass}>
                        {t('kalender.events.new.title')} *
                    </label>
                    <input id="ev-title" type="text" required autoFocus maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="ev-calendar" className={labelClass}>
                        {t('kalender.events.new.calendar')} *
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colorFor(calendarId) }} aria-hidden />
                        <select id="ev-calendar" value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className={inputClass}>
                            {calendars.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="ev-start" className={labelClass}>
                            {t('kalender.events.new.startsAt')} *
                        </label>
                        <input id="ev-start" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="ev-end" className={labelClass}>
                            {t('kalender.events.new.endsAt')}
                        </label>
                        <input
                            id="ev-end"
                            type="datetime-local"
                            value={endsAt}
                            min={startsAt}
                            onChange={(e) => setEndsAt(e.target.value)}
                            aria-invalid={endBeforeStart}
                            aria-describedby={endBeforeStart ? 'ev-end-error' : undefined}
                            className={`${inputClass} ${endBeforeStart ? 'border-destructive' : ''}`}
                        />
                        {endBeforeStart && (
                            <p id="ev-end-error" className="mt-1 text-xs text-destructive">
                                {t('kalender.events.validation.end-after-start')}
                            </p>
                        )}
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="ev-category" className={labelClass}>
                            {t('kalender.events.new.category')}
                        </label>
                        <input id="ev-category" type="text" maxLength={100} value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="ev-capacity" className={labelClass}>
                            {t('kalender.events.new.capacity')}
                        </label>
                        <input
                            id="ev-capacity"
                            type="number"
                            min={1}
                            step={1}
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            aria-invalid={capacityInvalid}
                            className={`${inputClass} ${capacityInvalid ? 'border-destructive' : ''}`}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="ev-description" className={labelClass}>
                        {t('kalender.events.new.description')}
                    </label>
                    <textarea id="ev-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
                </div>
                {event && (
                    <div className="space-y-1 rounded-lg border border-border p-3">
                        <Toggle checked={notify} onChange={setNotify} label={t('kalender.notify.label')} />
                        <p className="text-xs text-muted-foreground">{t(!notify ? 'kalender.notify.off' : timeWillChange ? 'kalender.notify.timeChanged' : 'kalender.notify.hint')}</p>
                    </div>
                )}
                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}
