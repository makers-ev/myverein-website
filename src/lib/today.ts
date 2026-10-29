/** `GET /clubs/:clubId/today` (Wave 14, wrapped in `{ data }` like every backend route): the personal overview of a club member; `board` and `setup` only for callers with the matching rights. */
export interface TodayData {
    generatedAt: string;
    openRsvps: { eventId: string; title: string; startsAt: string }[];
    cancelled: { eventId: string; title: string; startsAt: string }[];
    unreadAnnouncements: number;
    dueReturns: { loanId: string; itemName: string; dueAt: string }[];
    openBallots: number;
    board?: { openApplications?: number; openExits?: number; maintenanceDue?: number; memberCount?: number };
    setup?: { done: string[]; open: string[] };
}

export const todayPath = (clubId: string) => `/clubs/${encodeURIComponent(clubId)}/today`;

/** Where each setup step is done (checklist for the founder). */
export const SETUP_STEPS: { key: string; href: string }[] = [
    { key: 'logo', href: '/verein?tab=einstellungen' },
    { key: 'departments', href: '/verein?tab=abteilungen' },
    { key: 'calendar', href: '/kalender' },
    { key: 'location', href: '/standorte' },
    { key: 'members', href: '/verein?tab=mitglieder' },
];

/** Whether anything personal is open (drives the "all done" empty state). Board numbers and setup do not count as to-dos for members. */
export function hasOpenItems(d: TodayData): boolean {
    return d.openRsvps.length > 0 || d.cancelled.length > 0 || d.unreadAnnouncements > 0 || d.dueReturns.length > 0 || d.openBallots > 0 || boardTodos(d).length > 0;
}

/** Board to-dos with a count > 0 (member count is a figure, not a to-do). */
export function boardTodos(d: TodayData): { key: 'openApplications' | 'openExits' | 'maintenanceDue'; count: number }[] {
    const b = d.board;
    if (!b) return [];
    return (['openApplications', 'openExits', 'maintenanceDue'] as const).flatMap((key) => ((b[key] ?? 0) > 0 ? [{ key, count: b[key] as number }] : []));
}

export const isOverdue = (dueAt: string, now = Date.now()) => new Date(dueAt).getTime() < now;
