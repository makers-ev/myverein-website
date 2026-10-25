'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, Clock, Repeat, Tag, Users } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { Toggle } from '@/components/standorte/ui';
import { apiFetch } from '@/lib/api-client';

import EventAbsenceOverlay from './EventAbsenceOverlay';
import SeriesScopeModal from './SeriesScopeModal';
import AttendancePanel from './AttendancePanel';
import HelperPlanPanel from './HelperPlanPanel';
import ParticipantsPanel from './ParticipantsPanel';
import RidesPanel from './RidesPanel';
import RegistrationPanel from './RegistrationPanel';
import RegistrationSettings from './RegistrationSettings';
import { useRegistration } from './useRegistration';
import { type EventMe, type EventTab, visibleEventTabs } from '@/lib/eventAccess';
import { useLanguage } from '@/contexts/LanguageContext';
import { centsToEuroInput, parseEuroInput } from '@/lib/eventRegistration';

import {
    type Calendar,
    type CalendarEvent,
    defaultCalendarId,
    eventLastDay,
    isMultiDay,
    seatsLabel,
    type TFn,
    dangerBtn,
    errorMessage,
    formatTimeRange,
    inputClass,
    labelClass,
    primaryBtn,
    secondaryBtn,
    timeChanged,
    parseDateInput,
    toLocalInput,
    dayKey,
} from './calendarTypes';
import SeriesRuleFields from './SeriesRuleFields';
import {
    type EventSeries,
    type RuleState,
    type SeriesScope,
    type SeriesTemplate,
    createSeriesBody,
    defaultRule,
    durationFields,
    ruleBody,
    ruleFromSeries,
    ruleProblem,
} from './eventSeries';

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

/** Tab bar of the event dialog (details, attendance, ...); the panels are mounted only while their tab is open. */
function EventTabBar({ tabs, active, onChange }: { tabs: EventTab[]; active: EventTab; onChange: (tab: EventTab) => void }) {
    const { t } = useLanguage();
    return (
        <div role="tablist" aria-label={t('events.tabs.label')} className="-mt-1 mb-4 flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map((value) => (
                <button
                    key={value}
                    type="button"
                    role="tab"
                    id={`event-tab-${value}`}
                    aria-selected={active === value}
                    onClick={() => onChange(value)}
                    className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${active === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    {t(`events.tab.${value}`)}
                </button>
            ))}
        </div>
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
    /** Own permissions and roles (`GET /club-members/me`); gates the attendance and participant tabs. */
    me?: EventMe | null;
    language: string;
    t: TFn;
    onClose: () => void;
    /** RSVP changed on the server: the page refetches the event (`myRsvp`, counts). */
    onRsvpChange: () => void;
    onEdit: () => void;
    onDeleted: () => void;
}

export function EventDetailModal({ event, clubId, calendar, color, canWrite, canSeeAbsences = false, me = null, language, t, onClose, onRsvpChange, onEdit, onDeleted }: DetailProps) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [deleteScope, setDeleteScope] = useState(false);
    const cancelled = Boolean(event.cancelled);
    const rsvp = event.myRsvp ?? undefined;
    const [tab, setTab] = useState<EventTab>('details');
    const { info: registration, reload: reloadRegistration } = useRegistration(clubId, event.id);
    const regInfo = registration && registration !== 'error' ? registration : null;
    const tabs = visibleEventTabs(me, calendar, { registrationEnabled: Boolean(regInfo?.enabled), canManageRegistration: Boolean(regInfo?.canManage) });
    const activeTab = tabs.includes(tab) ? tab : 'details';

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
            await apiFetch(rsvpUrl, { method: 'POST' });
            onRsvpChange();
        });
    const handleCancel = () =>
        run(async () => {
            await apiFetch(rsvpUrl, { method: 'DELETE' });
            onRsvpChange();
        });
    const handleDelete = () => {
        if (event.seriesId) {
            setDeleteScope(true);
            return;
        }
        if (!window.confirm(t('kalender.events.delete.confirm', { title: event.title }))) return;
        void run(async () => {
            await apiFetch(`/events/${event.id}?clubId=${clubId}`, { method: 'DELETE' });
            onDeleted();
        });
    };

    const start = new Date(event.startsAt);
    const lastDay = eventLastDay(event);
    const multiDay = isMultiDay(event);
    const dateOpts: Intl.DateTimeFormatOptions = { dateStyle: 'full' };

    return (
        <>
        <Modal
            open
            onClose={onClose}
            title={event.title}
            size="lg"
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {cancelled ? (
                            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">{t('kalender.events.cancelled')}</span>
                        ) : regInfo?.enabled ? (
                            <>
                                {rsvp && (
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${rsvp === 'angemeldet' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                                        {t(rsvp === 'angemeldet' ? 'kalender.events.rsvp.confirmed' : 'kalender.events.rsvp.waitlist')}
                                    </span>
                                )}
                                <button type="button" onClick={() => setTab('registration')} className={rsvp ? secondaryBtn : primaryBtn}>
                                    {t(rsvp ? 'register.manage' : 'register.cta')}
                                </button>
                            </>
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
            {tabs.length > 1 && <EventTabBar tabs={tabs} active={activeTab} onChange={setTab} />}
            {activeTab === 'attendance' && <AttendancePanel clubId={clubId} event={event} />}
            {activeTab === 'helpers' && <HelperPlanPanel clubId={clubId} event={event} />}
            {activeTab === 'rides' && <RidesPanel clubId={clubId} event={event} ownClubMemberId={me?.clubMemberId ?? null} />}
            {activeTab === 'participants' && <ParticipantsPanel clubId={clubId} event={event} canManage={canWrite} />}
            {activeTab === 'registration' && regInfo && (
                <div className="space-y-6">
                    {regInfo.canManage && <RegistrationSettings clubId={clubId} event={event} info={regInfo} onSaved={reloadRegistration} />}
                    {regInfo.enabled && (
                        <section aria-labelledby="my-registration">
                            {regInfo.canManage && (
                                <h3 id="my-registration" className="mb-2 text-sm font-semibold text-foreground">
                                    {t('register.mine')}
                                </h3>
                            )}
                            <RegistrationPanel clubId={clubId} event={event} info={regInfo} canRegisterOthers={Boolean(me?.permissions.includes('members:write'))} onChanged={onRsvpChange} />
                        </section>
                    )}
                </div>
            )}
            {activeTab === 'details' && (
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
                        <span className="font-semibold">
                            {multiDay
                                ? `${start.toLocaleDateString(language, dateOpts)} – ${lastDay.toLocaleDateString(language, dateOpts)}`
                                : start.toLocaleDateString(language, dateOpts)}
                        </span>
                        <br />
                        {event.allDay ? (
                            t('kalender.events.allDay')
                        ) : multiDay && event.endsAt ? (
                            `${formatTimeRange({ ...event, endsAt: null }, language)} – ${new Date(event.endsAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}`
                        ) : (
                            formatTimeRange(event, language)
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
                {(event.capacity != null || (event.attendeeCount ?? 0) > 0) && (
                    <p className="flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                        <span>
                            {event.attendeeCount != null ? t('kalender.events.seats', { seats: seatsLabel(event) }) : t('kalender.events.capacity.max', { count: event.capacity ?? 0 })}
                            {(event.waitlistCount ?? 0) > 0 && `, ${t('kalender.events.waitlistCount', { count: event.waitlistCount ?? 0 })}`}
                        </span>
                    </p>
                )}
                {event.seriesId && (
                    <p className="flex items-center gap-2 text-foreground">
                        <Repeat className="h-4 w-4 text-muted-foreground" aria-hidden />
                        {t(event.isOverride ? 'kalender.series.detail.override' : 'kalender.series.detail')}
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
            )}
        </Modal>
        {deleteScope && event.seriesId && (
            <SeriesScopeModal
                mode="delete"
                event={event}
                t={t}
                onClose={() => setDeleteScope(false)}
                onConfirm={async (scope, { reason, notify }) => {
                    const q = new URLSearchParams({ clubId, scope, eventId: event.id });
                    if (reason) q.set('reason', reason);
                    if (!notify) q.set('notify', 'false');
                    await apiFetch(`/event-series/${event.seriesId}?${q.toString()}`, { method: 'DELETE' });
                    onDeleted();
                }}
            />
        )}
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
    /** Occurrences of a series are edited with a scope chosen beforehand (`SeriesScopeModal`). */
    scope?: SeriesScope;
    /** Prefilled start for new events. */
    initialStart?: Date;
    language: string;
    t: TFn;
    onClose: () => void;
    /** `notice` is a short result line, e.g. how many occurrences were created or changed. */
    onSaved: (notice?: string) => void;
}

interface SeriesAffected {
    updated: number;
    created: number;
    removed: number;
    cancelled: number;
}

export function EventFormModal({ clubId, calendars, colorFor, event, scope, initialStart, language, t, onClose, onSaved }: FormProps) {
    const defaultStart = initialStart ?? new Date();
    const seriesEdit = Boolean(event?.seriesId && scope);
    const bulk = seriesEdit && scope !== 'this';
    const [calendarId, setCalendarId] = useState(event?.calendarId ?? defaultCalendarId(calendars));
    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    const [category, setCategory] = useState(event?.category ?? '');
    const [allDay, setAllDay] = useState(Boolean(event?.allDay));
    const [startsAt, setStartsAt] = useState(toLocalInput(event ? new Date(event.startsAt) : defaultStart));
    const [endsAt, setEndsAt] = useState(
        event
            ? event.endsAt
                ? toLocalInput(eventEndForInput(event))
                : ''
            : toLocalInput(new Date(defaultStart.getTime() + 2 * 3600_000)),
    );
    const [capacity, setCapacity] = useState(event?.capacity != null ? String(event.capacity) : '');
    // Wave 12: cost hint (display only) and attendance tracking; single events only (series routes do not take them).
    const [costAmount, setCostAmount] = useState(centsToEuroInput(event?.costCents));
    const [costNote, setCostNote] = useState(event?.costNote ?? '');
    const [tracking, setTracking] = useState(Boolean(event?.attendanceTracking));
    // Wave 9 W5: members affected by a change are told by default; the switch only exists when editing.
    const [notify, setNotify] = useState(true);
    const [reason, setReason] = useState('');
    const [repeat, setRepeat] = useState(false);
    const [rule, setRule] = useState<RuleState>(() => defaultRule(dayKey(event ? new Date(event.startsAt) : defaultStart)));
    const [ruleLoad, setRuleLoad] = useState<'idle' | 'loading' | 'error'>(bulk ? 'loading' : 'idle');
    const [series, setSeries] = useState<EventSeries | null>(null);
    const [timeTouched, setTimeTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Rule of the series being edited (scope "all" / "this_and_following").
    useEffect(() => {
        if (!bulk || !event?.seriesId) return;
        let alive = true;
        apiFetch<{ data: EventSeries }>(`/event-series/${event.seriesId}?clubId=${clubId}`)
            .then((res) => {
                if (!alive) return;
                setSeries(res.data);
                setRule(ruleFromSeries(res.data));
                setRuleLoad('idle');
            })
            .catch(() => alive && setRuleLoad('error'));
        return () => {
            alive = false;
        };
    }, [bulk, event?.seriesId, clubId]);

    const startDay = startsAt.slice(0, 10);
    const endDay = (endsAt || startsAt).slice(0, 10);
    const startTime = startsAt.slice(11, 16);
    const endTime = endsAt.slice(11, 16);
    const endBeforeStart = allDay
        ? Boolean(startDay && endDay && endDay < startDay)
        : bulk
          ? timeTouched && Boolean(endTime) && endTime <= startTime
          : Boolean(startsAt && endsAt && new Date(endsAt) <= new Date(startsAt));
    const capacityInvalid = capacity !== '' && !(Number.isInteger(Number(capacity)) && Number(capacity) > 0);
    const startIso = allDay ? parseDateInput(startDay).toISOString() : new Date(startsAt).toISOString();
    const endIso = allDay ? parseDateInput(endDay, true).toISOString() : endsAt ? new Date(endsAt).toISOString() : null;
    const timeWillChange = Boolean(event && startsAt && !seriesEdit && timeChanged(event, startIso, endIso));
    const showRule = (!event && repeat) || (bulk && ruleLoad === 'idle' && series !== null);
    const ruleStart = bulk ? (series?.startDate ?? startDay) : startDay;
    const problem = showRule ? ruleProblem(rule, ruleStart) : null;
    const costCents = parseEuroInput(costAmount);
    const costInvalid = costCents === undefined;
    const showSingleOnly = !seriesEdit && !(repeat && !event);
    const invalid = costInvalid || !calendarId || !title.trim() || !startsAt || endBeforeStart || capacityInvalid || problem !== null || (bulk && ruleLoad === 'loading');

    const template: SeriesTemplate = {
        calendarId,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        allDay,
        startDate: startDay,
        startTime,
        endDate: endDay,
        endTime,
    };
    const previewBody = !event && repeat && !invalid ? createSeriesBody(template, rule) : null;

    function toggleAllDay(value: boolean) {
        setAllDay(value);
        if (!value) {
            // Back to timed: give the dates a sensible time of day.
            setStartsAt(`${startDay}T${startTime === '00:00' ? '18:00' : startTime}`);
            setEndsAt(`${endDay}T${endTime === '23:59' || !endTime ? '20:00' : endTime}`);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (invalid) return;
        setSubmitting(true);
        setError(null);
        // PATCH clears optional fields with null, POST simply omits them
        const empty = event ? null : undefined;
        const common = {
            title: title.trim(),
            description: description.trim() || empty,
            category: category.trim() || empty,
            capacity: capacity ? Number(capacity) : empty,
        };
        try {
            if (!event && repeat) {
                const res = await apiFetch<{ data: { occurrencesCreated: number } }>(`/event-series?clubId=${clubId}`, { method: 'POST', body: createSeriesBody(template, rule) });
                onSaved(t('kalender.series.created', { count: res.data.occurrencesCreated }));
            } else if (event && event.seriesId && scope) {
                const body: Record<string, unknown> = { scope, eventId: event.id, ...common, allDay, notify };
                if (reason.trim()) body.reason = reason.trim();
                if (scope === 'this') {
                    body.startsAt = startIso;
                    body.endsAt = endIso;
                } else {
                    const originalStart = toLocalInput(new Date(event.startsAt)).slice(11, 16);
                    if (timeTouched || allDay !== Boolean(event.allDay)) {
                        if (!allDay) body.startTime = startTime;
                        Object.assign(body, durationFields({ allDay, startDate: startDay, startTime, endDate: allDay ? endDay : startDay, endTime }));
                    } else if (startTime !== originalStart) {
                        body.startTime = startTime;
                    }
                    if (series && ruleChanged(rule, series)) Object.assign(body, ruleBody(rule, series.startDate), { untilDate: rule.endMode === 'until' ? rule.untilDate : null, count: rule.endMode === 'count' ? Number(rule.count) : null });
                }
                const res = await apiFetch<{ data: { affected: SeriesAffected } }>(`/event-series/${event.seriesId}?clubId=${clubId}`, { method: 'PATCH', body });
                const a = res.data.affected;
                onSaved(t('kalender.series.saved', { updated: a.updated, created: a.created, removed: a.removed, cancelled: a.cancelled }));
            } else {
                const body = {
                    calendarId,
                    ...common,
                    allDay,
                    startsAt: startIso,
                    endsAt: endIso ?? empty,
                    costNote: costNote.trim() || empty,
                    costCents: costCents ?? empty,
                    attendanceTracking: tracking,
                    ...(event ? { notify } : {}),
                };
                await apiFetch(event ? `/events/${event.id}?clubId=${clubId}` : `/events?clubId=${clubId}`, { method: event ? 'PATCH' : 'POST', body });
                onSaved();
            }
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setSubmitting(false);
        }
    }

    const dateType = allDay ? 'date' : 'datetime-local';
    const dateValue = (v: string) => (allDay ? v.slice(0, 10) : v);

    return (
        <Modal
            open
            onClose={onClose}
            title={t(event ? 'kalender.events.edit.title' : 'kalender.events.new')}
            size="lg"
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={secondaryBtn}>
                        {t('kalender.cancel')}
                    </button>
                    <button type="submit" form="event-form" disabled={submitting || invalid} className={primaryBtn}>
                        {t(event ? 'kalender.save' : repeat ? 'kalender.series.submit' : 'kalender.events.new.submit')}
                    </button>
                </div>
            }
        >
            <form id="event-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                {seriesEdit && scope && (
                    <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
                        <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        {t(`kalender.series.form.scope.${scope}`)}
                    </p>
                )}
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
                        <select id="ev-calendar" value={calendarId} disabled={seriesEdit} onChange={(e) => setCalendarId(e.target.value)} className={inputClass}>
                            {calendars.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <Toggle checked={allDay} onChange={toggleAllDay} label={t('kalender.events.allDay')} />
                {bulk && !allDay ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="ev-start-time" className={labelClass}>
                                {t('kalender.series.form.startTime')} *
                            </label>
                            <input
                                id="ev-start-time"
                                type="time"
                                required
                                value={startTime}
                                onChange={(e) => {
                                    setStartsAt(`${startDay}T${e.target.value}`);
                                    setTimeTouched(true);
                                }}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="ev-end-time" className={labelClass}>
                                {t('kalender.series.form.endTime')}
                            </label>
                            <input
                                id="ev-end-time"
                                type="time"
                                value={endTime}
                                onChange={(e) => {
                                    setEndsAt(`${startDay}T${e.target.value}`);
                                    setTimeTouched(true);
                                }}
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
                        <p className="text-xs text-muted-foreground sm:col-span-2">{t('kalender.series.form.date-hint')}</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="ev-start" className={labelClass}>
                                {t(allDay ? 'kalender.events.new.firstDay' : 'kalender.events.new.startsAt')} *
                            </label>
                            <input id="ev-start" type={dateType} required value={dateValue(startsAt)} onChange={(e) => setStartsAt(allDay ? `${e.target.value}T00:00` : e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="ev-end" className={labelClass}>
                                {t(allDay ? 'kalender.events.new.lastDay' : 'kalender.events.new.endsAt')}
                            </label>
                            <input
                                id="ev-end"
                                type={dateType}
                                value={dateValue(endsAt)}
                                min={dateValue(startsAt)}
                                onChange={(e) => setEndsAt(allDay ? (e.target.value ? `${e.target.value}T23:59` : '') : e.target.value)}
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
                )}
                {!event && (
                    <div className="space-y-1">
                        <Toggle checked={repeat} onChange={setRepeat} label={t('kalender.series.repeat')} />
                        {!repeat && <p className="text-xs text-muted-foreground">{t('kalender.series.repeat.hint')}</p>}
                    </div>
                )}
                {bulk && ruleLoad === 'loading' && (
                    <p role="status" className="text-sm text-muted-foreground">
                        {t('kalender.series.rule.loading')}
                    </p>
                )}
                {bulk && ruleLoad === 'error' && (
                    <p role="alert" className="text-sm text-destructive">
                        {t('kalender.series.rule.error')}
                    </p>
                )}
                {showRule && <SeriesRuleFields rule={rule} onChange={setRule} startDate={ruleStart} clubId={clubId} language={language} t={t} previewBody={bulk ? undefined : previewBody} />}
                {problem && (
                    <p role="alert" className="text-xs text-destructive">
                        {t(problem)}
                    </p>
                )}
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
                {showSingleOnly && (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                        <p className="text-sm font-semibold text-foreground">{t('kalender.events.cost')}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="ev-cost" className={labelClass}>
                                    {t('kalender.events.cost.amount')}
                                </label>
                                <input id="ev-cost" type="text" inputMode="decimal" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} aria-invalid={costInvalid} aria-describedby={costInvalid ? 'ev-cost-error' : undefined} className={`${inputClass} ${costInvalid ? 'border-destructive' : ''}`} />
                                {costInvalid && (
                                    <p id="ev-cost-error" className="mt-1 text-xs text-destructive">
                                        {t('kalender.events.cost.invalid')}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="ev-cost-note" className={labelClass}>
                                    {t('kalender.events.cost.note')}
                                </label>
                                <input id="ev-cost-note" type="text" maxLength={300} value={costNote} onChange={(e) => setCostNote(e.target.value)} placeholder={t('kalender.events.cost.note.placeholder')} className={inputClass} />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('kalender.events.cost.hint')}</p>
                        <Toggle checked={tracking} onChange={setTracking} label={t('kalender.events.tracking')} />
                    </div>
                )}
                {event && (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                        <Toggle checked={notify} onChange={setNotify} label={t('kalender.notify.label')} />
                        <p className="text-xs text-muted-foreground">{t(!notify ? 'kalender.notify.off' : timeWillChange || bulk ? 'kalender.notify.timeChanged' : 'kalender.notify.hint')}</p>
                        {bulk && (
                            <div>
                                <label htmlFor="series-edit-reason" className={labelClass}>
                                    {t('kalender.series.form.reason')}
                                </label>
                                <textarea id="series-edit-reason" rows={2} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
                                <p className="mt-1 text-xs text-muted-foreground">{t('kalender.series.form.reason.hint')}</p>
                            </div>
                        )}
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

/** End as shown in the editor: an all-day event stores 23:59:59 of the last day. */
function eventEndForInput(event: CalendarEvent): Date {
    return event.allDay ? eventLastDay(event) : new Date(event.endsAt ?? event.startsAt);
}

function ruleChanged(rule: RuleState, series: EventSeries): boolean {
    return JSON.stringify(ruleBody(rule, series.startDate)) !== JSON.stringify(ruleBody(ruleFromSeries(series), series.startDate));
}
