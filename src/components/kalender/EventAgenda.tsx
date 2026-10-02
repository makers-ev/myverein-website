'use client';

import { Users } from 'lucide-react';

import { type CalendarEvent, type TFn, dayKey, formatTimeRange } from './calendarTypes';

interface EventAgendaProps {
    events: CalendarEvent[];
    language: string;
    t: TFn;
    colorFor: (calendarId: string) => string;
    calendarName: (calendarId: string) => string;
    onSelectEvent: (ev: CalendarEvent) => void;
    /** Hide per-day headers, e.g. when showing a single day. */
    hideHeaders?: boolean;
}

/** Events grouped by local day, each group under a date header. Expects events sorted by start. */
export default function EventAgenda({ events, language, t, colorFor, calendarName, onSelectEvent, hideHeaders }: EventAgendaProps) {
    const groups: { key: string; date: Date; items: CalendarEvent[] }[] = [];
    for (const ev of events) {
        const date = new Date(ev.startsAt);
        const key = dayKey(date);
        const last = groups[groups.length - 1];
        if (last?.key === key) last.items.push(ev);
        else groups.push({ key, date, items: [ev] });
    }
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
                                    <span className="w-24 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{formatTimeRange(ev, language)}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-foreground">{ev.title}</span>
                                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <span>{calendarName(ev.calendarId)}</span>
                                            {ev.category && (
                                                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">{ev.category}</span>
                                            )}
                                            {ev.capacity != null && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="h-3 w-3" aria-hidden />
                                                    {t('kalender.events.capacity.max', { count: ev.capacity })}
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
