/**
 * Occupancy plan of rooms and pitches (Wave 12 W10, backend `/locations/:id/bookings` and `/conflicts`). Events at the
 * location appear automatically; an event of an invisible calendar has `title: null` and is shown as "belegt".
 */

export interface OccupancyItem {
    type: 'booking' | 'event';
    id: string;
    title: string | null;
    startsAt: string;
    endsAt: string;
    eventId: string | null;
}

export interface Occupancy {
    locationId: string;
    locationName: string;
    bookable: boolean;
    from: string;
    to: string;
    items: OccupancyItem[];
}

export const GRID_START_HOUR = 6;
export const GRID_END_HOUR = 23;

/** Monday 00:00 (local) of the week containing `d`. */
export function weekStart(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
}

export function addDays(d: Date, n: number): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export interface Block {
    item: OccupancyItem;
    /** Percent of the grid height. */
    top: number;
    height: number;
}

/** Part of `item` that lies on the local day starting at `day`, as percent of the visible hours; `null` if outside. */
export function blockOnDay(item: OccupancyItem, day: Date): Block | null {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), GRID_START_HOUR).getTime();
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), GRID_END_HOUR).getTime();
    const s = Math.max(new Date(item.startsAt).getTime(), dayStart);
    const e = Math.min(new Date(item.endsAt).getTime(), dayEnd);
    if (e <= s) return null;
    const span = dayEnd - dayStart;
    return { item, top: ((s - dayStart) / span) * 100, height: Math.max(((e - s) / span) * 100, 3) };
}

export function rangeQuery(from: Date, days: number): string {
    return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(addDays(from, days).toISOString())}`;
}

export function bookingProblem(title: string, startsAt: string, endsAt: string): 'title' | 'order' | null {
    if (!title.trim()) return 'title';
    if (!startsAt || !endsAt || new Date(endsAt).getTime() <= new Date(startsAt).getTime()) return 'order';
    return null;
}
