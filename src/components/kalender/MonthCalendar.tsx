'use client';

import { useMemo } from 'react';

import { type CalendarEvent, type TFn, dayKey, formatTime } from './calendarTypes';

const MAX_PILLS = 3;

interface MonthCalendarProps {
    month: Date;
    events: CalendarEvent[];
    selectedDay: string;
    language: string;
    t: TFn;
    colorFor: (calendarId: string) => string;
    onSelectEvent: (ev: CalendarEvent) => void;
    onSelectDay: (day: Date) => void;
    /** Click on a cell's empty area, e.g. to create an event on that day. */
    onCellClick: (day: Date) => void;
}

/** Monday-first month grid; pills on sm+, colored dots on small screens. */
export default function MonthCalendar({ month, events, selectedDay, language, t, colorFor, onSelectEvent, onSelectDay, onCellClick }: MonthCalendarProps) {
    const byDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        // ponytail: multi-day events only show on their start day
        for (const ev of events) {
            const key = dayKey(new Date(ev.startsAt));
            map.set(key, [...(map.get(key) ?? []), ev]);
        }
        return map;
    }, [events]);

    const days = useMemo(() => {
        const first = new Date(month.getFullYear(), month.getMonth(), 1);
        const offset = (first.getDay() + 6) % 7;
        const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
        return Array.from({ length: cells }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i));
    }, [month]);

    // 2024-01-01 was a Monday
    const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(language, { weekday: 'short' }));
    const todayKey = dayKey(new Date());

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-7 border-b border-border bg-muted/50">
                {weekdays.map((wd) => (
                    <div key={wd} className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-2 sm:text-left">
                        {wd}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map((day, i) => {
                    const key = dayKey(day);
                    const dayEvents = byDay.get(key) ?? [];
                    const inMonth = day.getMonth() === month.getMonth();
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDay;
                    const overflow = dayEvents.length - MAX_PILLS;
                    return (
                        <div
                            key={key}
                            onClick={() => onCellClick(day)}
                            className={`group relative min-h-14 cursor-pointer border-border p-1 transition-colors sm:min-h-28 sm:p-1.5 ${
                                i % 7 !== 6 ? 'border-r' : ''
                            } ${i < days.length - 7 ? 'border-b' : ''} ${inMonth ? '' : 'bg-muted/30'} ${
                                isSelected ? 'bg-primary/5 ring-2 ring-inset ring-primary/40' : 'hover:bg-muted/40'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectDay(day);
                                }}
                                aria-label={day.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' })}
                                aria-pressed={isSelected}
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                    isToday
                                        ? 'bg-primary text-primary-foreground'
                                        : inMonth
                                          ? 'text-foreground hover:bg-muted'
                                          : 'text-muted-foreground/60 hover:bg-muted'
                                }`}
                            >
                                {day.getDate()}
                            </button>

                            {/* small screens: dots only */}
                            {dayEvents.length > 0 && (
                                <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                                    {dayEvents.slice(0, 4).map((ev) => (
                                        <span key={ev.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorFor(ev.calendarId) }} />
                                    ))}
                                </div>
                            )}

                            <div className={`mt-1 hidden space-y-0.5 sm:block ${inMonth ? '' : 'opacity-60'}`}>
                                {dayEvents.slice(0, MAX_PILLS).map((ev) => (
                                    <button
                                        key={ev.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectEvent(ev);
                                        }}
                                        title={ev.title}
                                        className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white hover:opacity-90"
                                        style={{ backgroundColor: colorFor(ev.calendarId) }}
                                    >
                                        <span className="opacity-80">{formatTime(ev.startsAt, language)}</span> {ev.title}
                                    </button>
                                ))}
                                {overflow > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectDay(day);
                                        }}
                                        className="block w-full rounded px-1.5 text-left text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                                    >
                                        {t('kalender.month.more', { count: overflow })}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
