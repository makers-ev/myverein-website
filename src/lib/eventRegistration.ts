import type { FormDefinition } from './formSchema';

/**
 * Event registration (Wave 12 W6/W7, backend `/events/:id/registration`, `/rsvp`, `/registrations`, `/public-link`). Pure
 * helpers and the API shapes. Costs are display only: MyVerein never collects money.
 */

export type RegistrationClosedReason = 'cancelled' | 'deadline_passed' | null;

export interface RegistrationInfo {
    eventId: string;
    calendarId: string;
    enabled: boolean;
    open: boolean;
    closedReason: RegistrationClosedReason;
    deadlineAt: string | null;
    maxCompanions: number;
    allowGuests: boolean;
    costNote: string | null;
    costCents: number | null;
    form: FormDefinition | null;
    canManage: boolean;
    manage?: { formId: string | null; formVersion: number | null; guestRetentionDays: number; publicLinkActive: boolean };
}

export interface MyRegistration {
    status: 'angemeldet' | 'warteliste';
    partySize: number;
    answers: Record<string, unknown>;
    respondedAt: string;
}

export interface RsvpResult {
    status: 'angemeldet' | 'warteliste';
    partySize: number;
    attendeeId: string;
}

export interface SettingsDraft {
    enabled: boolean;
    formId: string;
    /** `YYYY-MM-DDTHH:mm` local value of the input, empty = no deadline. */
    deadline: string;
    allowGuests: boolean;
    maxCompanions: string;
    guestRetentionDays: string;
}

export const MAX_COMPANIONS = 19;
export const DEFAULT_RETENTION_DAYS = 30;

export function settingsDraft(info: RegistrationInfo): SettingsDraft {
    return {
        enabled: info.enabled,
        formId: info.manage?.formId ?? '',
        deadline: info.deadlineAt ? toLocalDateTime(new Date(info.deadlineAt)) : '',
        allowGuests: info.allowGuests,
        maxCompanions: String(info.maxCompanions),
        guestRetentionDays: String(info.manage?.guestRetentionDays ?? DEFAULT_RETENTION_DAYS),
    };
}

function toLocalDateTime(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export type SettingsProblem = 'companions' | 'retention' | 'guests_need_enabled';

export function settingsProblem(d: SettingsDraft): SettingsProblem | null {
    const c = Number(d.maxCompanions);
    if (!Number.isInteger(c) || c < 0 || c > MAX_COMPANIONS) return 'companions';
    const r = Number(d.guestRetentionDays);
    if (!Number.isInteger(r) || r < 1 || r > 365) return 'retention';
    return null;
}

/** `PUT /events/:id/registration` body. */
export function settingsBody(d: SettingsDraft): Record<string, unknown> {
    return {
        enabled: d.enabled,
        formId: d.formId || null,
        deadlineAt: d.deadline ? new Date(d.deadline).toISOString() : null,
        allowGuests: d.allowGuests,
        maxCompanions: Number(d.maxCompanions),
        guestRetentionDays: Number(d.guestRetentionDays),
    };
}

/** "5,00 EUR" from cents (club currency is EUR; display only). */
export function formatCost(cents: number | null | undefined, language: string): string | null {
    if (cents === null || cents === undefined) return null;
    return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Euro input ("5", "5,5", "5.50") to cents; `null` = empty, `undefined` = invalid. */
export function parseEuroInput(value: string): number | null | undefined {
    const v = value.trim().replace(',', '.');
    if (v === '') return null;
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(v)) return undefined;
    return Math.round(Number(v) * 100);
}

export function centsToEuroInput(cents: number | null | undefined): string {
    if (cents === null || cents === undefined) return '';
    return (cents / 100).toFixed(2).replace('.', ',');
}

/** Party size options 1..(1 + maxCompanions). */
export function partySizeOptions(maxCompanions: number): number[] {
    return Array.from({ length: Math.min(maxCompanions, MAX_COMPANIONS) + 1 }, (_, i) => i + 1);
}

/** Body of `POST /events/:id/rsvp`; no body at all for the old one-click registration (no form, no companions). */
export function rsvpBody(info: Pick<RegistrationInfo, 'form' | 'maxCompanions'>, partySize: number, answers: Record<string, unknown>, forClubMemberId?: string): Record<string, unknown> | undefined {
    const body: Record<string, unknown> = {};
    if (partySize > 1) body.partySize = partySize;
    if (info.form) body.answers = answers;
    if (forClubMemberId) body.forClubMemberId = forClubMemberId;
    return Object.keys(body).length > 0 ? body : undefined;
}

// --- Participants (B15) -------------------------------------------------------------------------

export type ParticipantStatus = 'angemeldet' | 'warteliste' | 'unbestaetigt';

export interface Participant {
    id: string;
    kind: 'account' | 'member' | 'guest';
    clubMemberId: string | null;
    displayName: string;
    email: string | null;
    status: ParticipantStatus;
    partySize: number;
    respondedAt: string;
    confirmed: boolean;
    registeredBy: string | null;
    answers: Record<string, unknown>;
}

export interface ParticipantList {
    eventId: string;
    capacity: number | null;
    seatsTaken: number;
    seatsWaiting: number;
    pendingConfirmation: number;
    sensitiveVisible: boolean;
    fields: Array<{ key: string; label: string; type: string; sensitive: boolean }>;
    registrations: Participant[];
}

export const BASE_CSV_COLUMNS = ['name', 'status', 'partySize', 'email', 'kind', 'respondedAt', 'registeredBy'] as const;

/** `columns` query of the CSV export: the chosen base columns, then the chosen form fields (their keys). */
export function csvColumnsQuery(base: readonly string[], fieldKeys: readonly string[]): string {
    return [...BASE_CSV_COLUMNS.filter((c) => base.includes(c)), ...fieldKeys].join(',');
}

/** Answer as plain text for the table (arrays joined, booleans as yes/no handled by the caller's translation). */
export function answerText(value: unknown, yes: string, no: string): string {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'boolean') return value ? yes : no;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
}

/** Next status choices for the organiser; "abgesagt" removes the person. */
export function statusChoices(current: ParticipantStatus): Array<'angemeldet' | 'warteliste' | 'abgesagt'> {
    if (current === 'unbestaetigt') return ['abgesagt'];
    return current === 'angemeldet' ? ['warteliste', 'abgesagt'] : ['angemeldet', 'abgesagt'];
}
