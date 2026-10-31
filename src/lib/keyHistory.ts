/** Key history (Wave 7 W11, backend `GET /locations/:id/key-history`). */
import { dateLocale } from './clubMembers';


export const KEY_HISTORY_PAGE_SIZE = 20;

export type KeyAction = 'issued' | 'returned';

export interface KeyHistoryEntry {
    id: string;
    action: KeyAction;
    /** Account `member.id`; `null` once the account is gone (the name snapshot stays). */
    memberId: string | null;
    memberName: string | null;
    keyLabel: string | null;
    note: string | null;
    recordedBy: string | null;
    recordedByName: string | null;
    createdAt: string;
}

export interface KeyHistoryResponse {
    data: KeyHistoryEntry[];
    page: number;
    pageSize: number;
    total: number;
}

export function isKeyAction(value: unknown): value is KeyAction {
    return value === 'issued' || value === 'returned';
}

/** Query string of the history request; an empty member filter is left out. */
export function keyHistoryQuery(clubId: string, page: number, memberId: string, pageSize = KEY_HISTORY_PAGE_SIZE): string {
    const p = new URLSearchParams({ clubId, page: String(page), pageSize: String(pageSize) });
    if (memberId) p.set('memberId', memberId);
    return p.toString();
}

export function pageCount(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

/** Date and time of a timestamp in the club's time zone (Europe/Berlin), never the browser's. */
export function formatBerlinDateTime(iso: string | Date, language: string): string {
    const instant = new Date(iso);
    if (Number.isNaN(instant.getTime())) return '—';
    return instant.toLocaleString(dateLocale(language), { timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'short' });
}
