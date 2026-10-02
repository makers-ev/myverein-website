export interface Department {
    id: string;
    clubId: string;
    name: string;
    leadMemberId: string | null;
}

export interface Calendar {
    id: string;
    clubId: string;
    departmentId: string | null;
    name: string;
    isDefault: boolean;
    icalImportUrl: string | null;
}

export interface CalendarVisibility {
    id: string;
    calendarId: string;
    memberId: string | null;
    roleType: string | null;
    departmentId: string | null;
}

export interface CalendarEvent {
    id: string;
    calendarId: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string | null;
    category: string | null;
    capacity: number | null;
}

export type RsvpStatus = 'angemeldet' | 'warteliste';
export type TFn = (key: string, params?: Record<string, string | number>) => string;

export const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:light] dark:[color-scheme:dark]';
export const labelClass = 'mb-1 block text-xs font-semibold text-muted-foreground';
export const primaryBtn =
    'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50';
export const secondaryBtn =
    'rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50';
export const dangerBtn =
    'rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50';

/** Local-time YYYY-MM-DD, used as a stable per-day grouping key. */
export function dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local-time value for `<input type="datetime-local">`. */
export function toLocalInput(d: Date): string {
    return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatTime(iso: string, language: string): string {
    return new Date(iso).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
}

export function formatTimeRange(ev: CalendarEvent, language: string): string {
    return ev.endsAt ? `${formatTime(ev.startsAt, language)} – ${formatTime(ev.endsAt, language)}` : formatTime(ev.startsAt, language);
}

export function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : 'Request failed';
}
