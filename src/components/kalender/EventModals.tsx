'use client';

import { useState } from 'react';
import { Clock, Tag, Users } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { apiFetch } from '@/lib/api-client';

import {
    type Calendar,
    type CalendarEvent,
    type RsvpStatus,
    type TFn,
    dangerBtn,
    errorMessage,
    formatTimeRange,
    inputClass,
    labelClass,
    primaryBtn,
    secondaryBtn,
    toLocalInput,
} from './calendarTypes';

interface DetailProps {
    event: CalendarEvent;
    clubId: string;
    calendar: Calendar | undefined;
    color: string;
    canWrite: boolean;
    rsvp: RsvpStatus | undefined;
    language: string;
    t: TFn;
    onClose: () => void;
    onRsvpChange: (status: RsvpStatus | undefined) => void;
    onEdit: () => void;
    onDeleted: () => void;
}

export function EventDetailModal({ event, clubId, calendar, color, canWrite, rsvp, language, t, onClose, onRsvpChange, onEdit, onDeleted }: DetailProps) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(errorMessage(err));
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
        <Modal
            open
            onClose={onClose}
            title={event.title}
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {rsvp ? (
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
                            <button type="button" onClick={onEdit} disabled={busy} className={secondaryBtn}>
                                {t('kalender.events.edit')}
                            </button>
                            <button type="button" onClick={handleDelete} disabled={busy} className={dangerBtn}>
                                {t('kalender.events.delete')}
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-3 text-sm">
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
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
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
    const [calendarId, setCalendarId] = useState(event?.calendarId ?? (calendars.find((c) => c.isDefault) ?? calendars[0])?.id ?? '');
    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    const [category, setCategory] = useState(event?.category ?? '');
    const [startsAt, setStartsAt] = useState(toLocalInput(event ? new Date(event.startsAt) : defaultStart));
    const [endsAt, setEndsAt] = useState(
        event ? (event.endsAt ? toLocalInput(new Date(event.endsAt)) : '') : toLocalInput(new Date(defaultStart.getTime() + 2 * 3600_000)),
    );
    const [capacity, setCapacity] = useState(event?.capacity != null ? String(event.capacity) : '');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const endBeforeStart = Boolean(startsAt && endsAt && new Date(endsAt) <= new Date(startsAt));
    const capacityInvalid = capacity !== '' && !(Number.isInteger(Number(capacity)) && Number(capacity) > 0);
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
        };
        try {
            await apiFetch(event ? `/events/${event.id}?clubId=${clubId}` : `/events?clubId=${clubId}`, {
                method: event ? 'PATCH' : 'POST',
                body,
            });
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
                    <input id="ev-title" type="text" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
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
                        <input id="ev-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
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
                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}
