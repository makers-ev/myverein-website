'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDepartmentColor } from '@/theme/departmentColors';
import TreffenPanel from '@/components/kalender/TreffenPanel';
import MonthCalendar from '@/components/kalender/MonthCalendar';
import EventAgenda from '@/components/kalender/EventAgenda';
import CalendarManager from '@/components/kalender/CalendarManager';
import { EventDetailModal, EventFormModal } from '@/components/kalender/EventModals';
import {
    type Calendar,
    type CalendarEvent,
    type Department,
    type RsvpStatus,
    dayKey,
    primaryBtn,
    secondaryBtn,
} from '@/components/kalender/calendarTypes';

interface MyClub {
    clubId: string;
    memberId: string;
    clubName: string | null;
    orgRole: string;
}

type Tab = 'termine' | 'treffen';
type View = 'month' | 'list';
type EventModal = { kind: 'detail'; event: CalendarEvent } | { kind: 'form'; event?: CalendarEvent; start?: Date } | null;

const navBtn = 'rounded-lg border border-border bg-background p-2 text-foreground transition-colors hover:bg-muted';

export default function KalenderPageContent() {
    const { t, language } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [calendars, setCalendars] = useState<Calendar[] | null>(null);
    const [events, setEvents] = useState<CalendarEvent[] | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [tab, setTab] = useState<Tab>('termine');
    const [view, setView] = useState<View>('month');
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
    const [modal, setModal] = useState<EventModal>(null);
    const [rsvpState, setRsvpState] = useState<Record<string, RsvpStatus>>({});

    const activeClub = clubs?.[0] ?? null;
    const canWrite = permissions.includes('calendars:write');

    useEffect(() => {
        void apiFetch<{ data: MyClub[] }>('/my-clubs').then(({ data }) => setClubs(data));
    }, []);

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
        apiFetch<{ data: { permissions?: string[] } }>(`/club-members/me?clubId=${activeClub.clubId}`)
            .then(({ data }) => setPermissions(data.permissions ?? []))
            .catch(() => setPermissions([]));
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
    const dayEvents = sortedEvents.filter((ev) => dayKey(new Date(ev.startsAt)) === selectedDay);
    const selectedDate = new Date(`${selectedDay}T00:00`);

    const openCreate = (day: Date) => setModal({ kind: 'form', start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 18) });

    function shiftMonth(delta: number) {
        setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
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

    function afterChange() {
        setModal(null);
        if (activeClub) void refreshData(activeClub.clubId);
    }

    const detailEvent = modal?.kind === 'detail' ? modal.event : null;

    return (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('kalender.page.title')}</h1>

            {clubs === null ? (
                <p className="mt-6 text-sm text-muted-foreground">…</p>
            ) : !activeClub ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.no-club.body')}</p>
                </div>
            ) : (
                <>
                    <div role="tablist" className="mt-6 flex gap-2 border-b border-border">
                        {(['termine', 'treffen'] as const).map((value) => (
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
                                            {canWrite && calendars.length > 0 && (
                                                <button type="button" onClick={() => openCreate(selectedDate)} className={`${primaryBtn} inline-flex items-center gap-1.5`}>
                                                    <Plus className="h-4 w-4" aria-hidden />
                                                    <span className="hidden sm:inline">{t('kalender.events.new')}</span>
                                                    <span className="sr-only sm:hidden">{t('kalender.events.new')}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

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
                                                <div className="mb-3 flex items-center justify-between gap-2">
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
                                <p className="text-sm text-muted-foreground">…</p>
                            ))}
                        {tab === 'treffen' && <TreffenPanel clubId={activeClub.clubId} />}
                    </div>

                    {detailEvent && (
                        <EventDetailModal
                            event={detailEvent}
                            clubId={activeClub.clubId}
                            calendar={calendars?.find((c) => c.id === detailEvent.calendarId)}
                            color={colorFor(detailEvent.calendarId)}
                            canWrite={canWrite}
                            rsvp={rsvpState[detailEvent.id]}
                            language={language}
                            t={t}
                            onClose={() => setModal(null)}
                            onRsvpChange={(status) =>
                                setRsvpState((prev) => {
                                    const next = { ...prev };
                                    if (status) next[detailEvent.id] = status;
                                    else delete next[detailEvent.id];
                                    return next;
                                })
                            }
                            onEdit={() => setModal({ kind: 'form', event: detailEvent })}
                            onDeleted={afterChange}
                        />
                    )}
                    {modal?.kind === 'form' && calendars && (
                        <EventFormModal
                            clubId={activeClub.clubId}
                            calendars={calendars}
                            colorFor={colorFor}
                            event={modal.event}
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
