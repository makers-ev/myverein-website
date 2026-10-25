'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, List, Plus, Rss } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDepartmentColor } from '@/theme/departmentColors';
import TreffenPanel from '@/components/kalender/TreffenPanel';
import MonthCalendar from '@/components/kalender/MonthCalendar';
import EventAgenda from '@/components/kalender/EventAgenda';
import CalendarManager from '@/components/kalender/CalendarManager';
import { EventDetailModal, EventFormModal } from '@/components/kalender/EventModals';
import CalendarSubscribeModal from '@/components/kalender/CalendarSubscribeModal';
import SeriesScopeModal from '@/components/kalender/SeriesScopeModal';
import type { SeriesScope } from '@/components/kalender/eventSeries';
import {
    type Calendar,
    type CalendarEvent,
    type Department,
    dayKey,
    errorMessage,
    eventDayKeys,
    primaryBtn,
    secondaryBtn,
} from '@/components/kalender/calendarTypes';
import LoadingText from '@/components/LoadingText';
import { type EventMe, canSeeAttendanceGroup, canTrackTime, canUseTimeTracking } from '@/lib/eventAccess';
import TimeTracking from '@/components/kalender/TimeTracking';
import { GroupAttendance, MemberAttendance } from '@/components/kalender/AttendanceReport';
import { SectionCard } from '@/components/standorte/ui';
import LoadError from '@/components/LoadError';

interface MyClub {
    clubId: string;
    memberId: string;
    clubName: string | null;
    orgRole: string;
}

type Tab = 'termine' | 'treffen' | 'anwesenheit' | 'zeiterfassung';
type View = 'month' | 'list';
type EventModal =
    | { kind: 'detail'; event: CalendarEvent }
    | { kind: 'scope'; event: CalendarEvent }
    | { kind: 'form'; event?: CalendarEvent; scope?: SeriesScope; start?: Date }
    | null;

const navBtn = 'rounded-lg border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted';

export default function KalenderPageContent() {
    const { t, language } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [clubsError, setClubsError] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [calendars, setCalendars] = useState<Calendar[] | null>(null);
    const [events, setEvents] = useState<CalendarEvent[] | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [me, setMe] = useState<EventMe | null>(null);
    const [tab, setTab] = useState<Tab>('termine');
    const [view, setView] = useState<View>('month');
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
    const [modal, setModal] = useState<EventModal>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [subscribing, setSubscribing] = useState(false);
    const [exporting, setExporting] = useState(false);

    const activeClub = clubs?.[0] ?? null;
    const canWrite = permissions.includes('calendars:write');

    function loadClubs() {
        apiFetch<{ data: MyClub[] }>('/my-clubs')
            .then(({ data }) => {
                setClubs(data);
                setClubsError(false);
            })
            .catch(() => setClubsError(true));
    }

    // setClubs/setClubsError run inside promise callbacks, not synchronously in the effect body.
    useEffect(loadClubs, []);

    async function refreshData(clubId: string) {
        const [infoRes, calendarsRes, eventsRes] = await Promise.all([
            apiFetch<{ data: { departments: Department[] } }>(`/club-info?clubId=${clubId}`),
            apiFetch<{ data: Calendar[] }>(`/calendars?clubId=${clubId}`),
            apiFetch<{ data: CalendarEvent[] }>(`/events?clubId=${clubId}`),
        ]);
        setDepartments(infoRes.data.departments);
        setCalendars(calendarsRes.data);
        setEvents(eventsRes.data);
    }

    useEffect(() => {
        if (!activeClub) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshData(activeClub.clubId);
        // Missing permissions only hide write UI; the backend enforces them anyway.
        apiFetch<{ data: { clubMemberId?: string | null; permissions?: string[]; roles?: EventMe['roles'] } }>(`/club-members/me?clubId=${activeClub.clubId}`)
            .then(({ data }) => {
                setPermissions(data.permissions ?? []);
                setMe({ clubMemberId: data.clubMemberId ?? null, permissions: data.permissions ?? [], roles: data.roles ?? [] });
            })
            .catch(() => {
                setPermissions([]);
                setMe(null);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClub?.clubId]);

    const colorByCalendarId = useMemo(() => {
        const map = new Map<string, string>();
        for (const cal of calendars ?? []) {
            const index = cal.departmentId ? departments.findIndex((d) => d.id === cal.departmentId) : -1;
            map.set(cal.id, getDepartmentColor(index === -1 ? null : index));
        }
        return map;
    }, [calendars, departments]);

    const colorFor = (id: string) => colorByCalendarId.get(id) ?? getDepartmentColor(null);
    const calendarName = (id: string) => calendars?.find((c) => c.id === id)?.name ?? '—';

    const sortedEvents = useMemo(() => [...(events ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt)), [events]);
    const upcoming = useMemo(() => {
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
        return sortedEvents.filter((ev) => new Date(ev.endsAt ?? ev.startsAt).getTime() >= todayStart);
    }, [sortedEvents]);
    const dayEvents = sortedEvents.filter((ev) => eventDayKeys(ev).includes(selectedDay));
    const todayKey = dayKey(new Date());
    const selectedDate = new Date(`${selectedDay}T00:00`);

    const openCreate = (day: Date) => setModal({ kind: 'form', start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18) });

    function shiftMonth(delta: number) {
        setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    }

    async function exportCalendar() {
        if (!activeClub) return;
        setExporting(true);
        setNotice(null);
        try {
            const { blob, filename } = await fetchFileBlob(`/events.ics?clubId=${activeClub.clubId}`, 'kalender.ics', { accept: 'text/calendar' });
            saveBlob(blob, filename);
        } catch (err) {
            setNotice(t('kalender.export.error', { message: errorMessage(err, t) }));
        } finally {
            setExporting(false);
        }
    }

    function goToday() {
        const now = new Date();
        setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedDay(dayKey(now));
    }

    function handleCellClick(day: Date) {
        setSelectedDay(dayKey(day));
        // Desktop: empty-cell click creates; small screens only select (agenda below grid)
        if (canWrite && calendars?.length && window.matchMedia('(min-width: 640px)').matches) openCreate(day);
    }

    function afterChange(message?: string) {
        setModal(null);
        setNotice(message ?? null);
        if (activeClub) void refreshData(activeClub.clubId);
    }

    const detailEvent = modal?.kind === 'detail' ? modal.event : null;

    /** After a sign-up or withdrawal: reload that event (`myRsvp`, counts) and keep the dialog open. */
    async function reloadEvent(id: string) {
        if (!activeClub) return;
        try {
            const { data } = await apiFetch<{ data: CalendarEvent }>(`/events/${id}?clubId=${activeClub.clubId}`);
            setEvents((prev) => prev?.map((ev) => (ev.id === id ? data : ev)) ?? prev);
            setModal((prev) => (prev?.kind === 'detail' && prev.event.id === id ? { kind: 'detail', event: data } : prev));
        } catch {
            void refreshData(activeClub.clubId);
        }
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('kalender.page.title')}</h1>

            {clubsError ? (
                <LoadError className="mt-6" onRetry={loadClubs} />
            ) : clubs === null ? (
                <LoadingText className="mt-6" />
            ) : !activeClub ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.no-club.body')}</p>
                </div>
            ) : (
                <>
                    <div role="tablist" className="mt-6 flex gap-2 border-b border-border">
                        {(['termine', 'treffen', 'anwesenheit', 'zeiterfassung'] as const).filter((v) => v !== 'zeiterfassung' || canUseTimeTracking(me)).map((value) => (
                            <button
                                key={value}
                                role="tab"
                                aria-selected={tab === value}
                                onClick={() => setTab(value)}
                                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                    tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t(`kalender.tab.${value}`)}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 space-y-4">
                        {tab === 'termine' &&
                            (calendars && events ? (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {view === 'month' && (
                                                <>
                                                    <button type="button" onClick={() => shiftMonth(-1)} className={navBtn} aria-label={t('kalender.month.prev')}>
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => shiftMonth(1)} className={navBtn} aria-label={t('kalender.month.next')}>
                                                        <ChevronRight className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={goToday} className={`${secondaryBtn} !px-3 !py-1.5`}>
                                                        {t('kalender.today')}
                                                    </button>
                                                </>
                                            )}
                                            <h2 className="ml-1 text-lg font-bold capitalize text-foreground" aria-live="polite">
                                                {view === 'month'
                                                    ? month.toLocaleDateString(language, { month: 'long', year: 'numeric' })
                                                    : t('kalender.view.upcoming')}
                                            </h2>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div role="group" aria-label={t('kalender.view.label')} className="inline-flex rounded-lg border border-border bg-background p-0.5">
                                                {(
                                                    [
                                                        ['month', CalendarDays],
                                                        ['list', List],
                                                    ] as const
                                                ).map(([value, Icon]) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setView(value)}
                                                        aria-pressed={view === value}
                                                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                                            view === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        <Icon className="h-4 w-4" aria-hidden />
                                                        {t(`kalender.view.${value}`)}
                                                    </button>
                                                ))}
                                            </div>
                                            <button type="button" onClick={() => void exportCalendar()} disabled={exporting} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                                                <Download className="h-4 w-4" aria-hidden />
                                                <span className="hidden md:inline">{t(exporting ? 'kalender.export.busy' : 'kalender.export')}</span>
                                                <span className="sr-only md:hidden">{t('kalender.export')}</span>
                                            </button>
                                            <button type="button" onClick={() => setSubscribing(true)} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                                                <Rss className="h-4 w-4" aria-hidden />
                                                <span className="hidden md:inline">{t('kalender.feeds.open')}</span>
                                                <span className="sr-only md:hidden">{t('kalender.feeds.open')}</span>
                                            </button>
                                            {canWrite && calendars.length > 0 && (
                                                <button type="button" onClick={() => openCreate(selectedDate)} className={`${primaryBtn} inline-flex items-center gap-1.5`}>
                                                    <Plus className="h-4 w-4" aria-hidden />
                                                    <span className="hidden sm:inline">{t('kalender.events.new')}</span>
                                                    <span className="sr-only sm:hidden">{t('kalender.events.new')}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {notice && (
                                        <p role="status" className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                                            {notice}
                                            <button type="button" onClick={() => setNotice(null)} className="font-semibold underline">
                                                {t('kalender.notice.dismiss')}
                                            </button>
                                        </p>
                                    )}

                                    {calendars.length > 0 && (
                                        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label={t('kalender.calendars.legend')}>
                                            {calendars.map((cal) => (
                                                <li key={cal.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorFor(cal.id) }} aria-hidden />
                                                    {cal.name}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {view === 'month' ? (
                                        <>
                                            <MonthCalendar
                                                month={month}
                                                events={sortedEvents}
                                                selectedDay={selectedDay}
                                                language={language}
                                                t={t}
                                                colorFor={colorFor}
                                                onSelectEvent={(ev) => setModal({ kind: 'detail', event: ev })}
                                                onSelectDay={(day) => setSelectedDay(dayKey(day))}
                                                onCellClick={handleCellClick}
                                            />
                                            <section className="rounded-xl border border-border bg-card p-4">
                                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                    <h3 className="text-sm font-bold text-foreground">
                                                        {selectedDate.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
                                                    </h3>
                                                    {canWrite && calendars.length > 0 && (
                                                        <button type="button" onClick={() => openCreate(selectedDate)} className="text-sm font-medium text-primary hover:underline">
                                                            + {t('kalender.events.new')}
                                                        </button>
                                                    )}
                                                </div>
                                                {dayEvents.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">{t('kalender.events.empty-day')}</p>
                                                ) : (
                                                    <EventAgenda
                                                        events={dayEvents}
                                                        language={language}
                                                        t={t}
                                                        colorFor={colorFor}
                                                        calendarName={calendarName}
                                                        onSelectEvent={(ev) => setModal({ kind: 'detail', event: ev })}
                                                        hideHeaders
                                                        dayFilter={(key) => key === selectedDay}
                                                    />
                                                )}
                                            </section>
                                        </>
                                    ) : (
                                        <section className="rounded-xl border border-border bg-card p-4">
                                            {upcoming.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">{t('kalender.events.empty')}</p>
                                            ) : (
                                                <EventAgenda
                                                    events={upcoming}
                                                    language={language}
                                                    t={t}
                                                    colorFor={colorFor}
                                                    calendarName={calendarName}
                                                    onSelectEvent={(ev) => setModal({ kind: 'detail', event: ev })}
                                                    dayFilter={(key) => key >= todayKey}
                                                />
                                            )}
                                        </section>
                                    )}

                                    {canWrite && (
                                        <CalendarManager
                                            calendars={calendars}
                                            departments={departments}
                                            clubId={activeClub.clubId}
                                            colorFor={colorFor}
                                            t={t}
                                            onChange={() => void refreshData(activeClub.clubId)}
                                        />
                                    )}
                                </>
                            ) : (
                                <LoadingText />
                            ))}
                        {tab === 'anwesenheit' && (
                            <div className="space-y-4">
                                {me?.clubMemberId && (
                                    <SectionCard title={t('attReport.own.title')}>
                                        <MemberAttendance clubId={activeClub.clubId} memberId={me.clubMemberId} />
                                    </SectionCard>
                                )}
                                {canSeeAttendanceGroup(me) && (
                                    <SectionCard title={t('attReport.group.title')}>
                                        <GroupAttendance clubId={activeClub.clubId} departments={departments} />
                                    </SectionCard>
                                )}
                            </div>
                        )}
                        {tab === 'zeiterfassung' && canUseTimeTracking(me) && (
                            <TimeTracking clubId={activeClub.clubId} canTrack={canTrackTime(me)} canConfirm={permissions.includes('time:write')} canRates={permissions.includes('time:read_rates')} ownClubMemberId={me?.clubMemberId ?? null} events={events ?? []} />
                        )}
                        {tab === 'treffen' && <TreffenPanel clubId={activeClub.clubId} canWrite={permissions.includes('meetings:write')} canManageAssembly={permissions.includes('assembly:manage')} canReadSensitive={permissions.includes('members:read_sensitive')} />}
                    </div>

                    {detailEvent && (
                        <EventDetailModal
                            event={detailEvent}
                            clubId={activeClub.clubId}
                            calendar={calendars?.find((c) => c.id === detailEvent.calendarId)}
                            color={colorFor(detailEvent.calendarId)}
                            canWrite={canWrite}
                            canSeeAbsences={permissions.includes('absences:read')}
                            me={me}
                            language={language}
                            t={t}
                            onClose={() => setModal(null)}
                            onRsvpChange={() => void reloadEvent(detailEvent.id)}
                            onEdit={() => setModal(detailEvent.seriesId ? { kind: 'scope', event: detailEvent } : { kind: 'form', event: detailEvent })}
                            onDeleted={afterChange}
                        />
                    )}
                    {subscribing && calendars && <CalendarSubscribeModal clubId={activeClub.clubId} calendars={calendars} language={language} t={t} onClose={() => setSubscribing(false)} />}
                    {modal?.kind === 'scope' && (
                        <SeriesScopeModal
                            mode="edit"
                            event={modal.event}
                            t={t}
                            onClose={() => setModal({ kind: 'detail', event: modal.event })}
                            onConfirm={(scope) => setModal({ kind: 'form', event: modal.event, scope })}
                        />
                    )}
                    {modal?.kind === 'form' && calendars && (
                        <EventFormModal
                            clubId={activeClub.clubId}
                            calendars={calendars}
                            colorFor={colorFor}
                            event={modal.event}
                            scope={modal.scope}
                            language={language}
                            initialStart={modal.start}
                            t={t}
                            onClose={() => setModal(null)}
                            onSaved={afterChange}
                        />
                    )}
                </>
            )}
        </div>
    );
}
