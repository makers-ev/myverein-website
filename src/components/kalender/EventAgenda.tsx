'use client';

import { Repeat, Users } from 'lucide-react';

import { type CalendarEvent, type TFn, dayKey, eventDayKeys, formatTimeRange, isContinuation, seatsLabel } from './calendarTypes';

interface EventAgendaProps {
    events: CalendarEvent[];
    language: string;
    t: TFn;
    colorFor: (calendarId: string) => string;
    calendarName: (calendarId: string) => string;
    onSelectEvent: (ev: CalendarEvent) => void;
    /** Hide per-day headers, e.g. when showing a single day. */
    hideHeaders?: boolean;
    /** Only list the days this accepts; multi-day events appear on every accepted day they cover. */
    dayFilter?: (key: string) => boolean;
}

/** Events grouped by local day, each group under a date header. Expects events sorted by start. */
export default function EventAgenda({ events, language, t, colorFor, calendarName, onSelectEvent, hideHeaders, dayFilter }: EventAgendaProps) {
    const byKey = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
        for (const key of eventDayKeys(ev)) {
            if (dayFilter && !dayFilter(key)) continue;
            byKey.set(key, [...(byKey.get(key) ?? []), ev]);
        }
    }
    const groups = [...byKey.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, items]) => ({ key, date: new Date(`${key}T00:00`), items }));
    const todayKey = dayKey(new Date());

    return (
        <div className="space-y-5">
            {groups.map((group) => (
                <section key={group.key} aria-label={group.date.toLocaleDateString(language, { dateStyle: 'full' })}>
                    {!hideHeaders && (
                        <h3 className="mb-2 flex items-baseline gap-2 text-sm font-bold text-foreground">
                            <span className={`text-2xl leading-none ${group.key === todayKey ? 'text-primary' : ''}`}>{group.date.getDate()}</span>
                            <span>
                                {group.date.toLocaleDateString(language, { weekday: 'long' })}
                                <span className="ml-1 font-normal text-muted-foreground">
                                    {group.date.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                                </span>
                            </span>
                            {group.key === todayKey && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{t('kalender.today')}</span>
                            )}
                        </h3>
                    )}
                    <ul className="space-y-2">
                        {group.items.map((ev) => (
                            <li key={ev.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelectEvent(ev)}
                                    className="flex w-full items-stretch gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                                >
                                    <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: colorFor(ev.calendarId) }} />
                                    <span className={`w-24 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground ${ev.cancelled ? 'line-through' : ''}`}>{ev.allDay ? t('kalender.events.allDay') : isContinuation(ev, group.key) ? t('kalender.events.ongoing') : formatTimeRange(ev, language)}</span>
                                    <span className={`min-w-0 flex-1 ${ev.cancelled ? 'opacity-70' : ''}`}>
                                        <span className={`block truncate text-sm font-semibold text-foreground ${ev.cancelled ? 'line-through' : ''}`}>{ev.title}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            {ev.seriesId && (
                                                <span className="inline-flex items-center gap-1" title={t('kalender.series.badge')}>
                                                    <Repeat className="h-3 w-3" aria-hidden />
                                                    <span className="sr-only">{t('kalender.series.badge')}</span>
                                                </span>
                                            )}
                                            {ev.cancelled && <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-semibold text-destructive">{t('kalender.events.cancelled')}</span>}
                                            <span>{calendarName(ev.calendarId)}</span>
                                            {ev.category && (
                                                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">{ev.category}</span>
                                            )}
                                            {(ev.capacity != null || (ev.attendeeCount ?? 0) > 0) && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="h-3 w-3" aria-hidden />
                                                    {ev.attendeeCount != null ? t('kalender.events.seats', { seats: seatsLabel(ev) }) : t('kalender.events.capacity.max', { count: ev.capacity ?? 0 })}
                                                    {(ev.waitlistCount ?? 0) > 0 && `, ${t('kalender.events.waitlistCount', { count: ev.waitlistCount ?? 0 })}`}
                                                </span>
                                            )}
                                            {ev.myRsvp && (
                                                <span className={`rounded-full px-2 py-0.5 font-semibold ${ev.myRsvp === 'angemeldet' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                                                    {t(ev.myRsvp === 'angemeldet' ? 'kalender.events.rsvp.confirmed' : 'kalender.events.rsvp.waitlist')}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
