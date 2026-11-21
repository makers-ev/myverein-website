import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';

/**
 * Prospect pipeline of the club (Wave 15 W3, backend README "Leads"): requests from the public club page or entered by hand,
 * with a status, notes and a waitlist per department. Pure helpers live here (status transitions, query string, error wording)
 * so they are unit-tested; the components only render. Personal data of prospects: never cached, deleted by the retention rule.
 */

export const LEAD_STATUSES = ['neu', 'kontaktiert', 'probetraining', 'mitglied', 'abgelehnt'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PAGE_SIZE = 25;

export const LEAD_LIMITS = { name: 100, phone: 40, email: 320, notes: 4000, message: 2000 } as const;

export interface Lead {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    department: { id: string; name: string } | null;
    message: string | null;
    source: 'oeffentliche_seite' | 'manuell';
    status: LeadStatus;
    trialRequested: boolean;
    trialOn: string | null;
    waitlisted: boolean;
    waitlistedAt: string | null;
    notes: string | null;
    requestCount: number;
    lastRequestAt: string | null;
    convertedClubMemberId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface WaitlistGroup {
    department: { id: string; name: string } | null;
    leads: (Lead & { position: number })[];
}

export interface LeadPage {
    data: Lead[];
    page: number;
    pageSize: number;
    total: number;
}

/** Same transitions as the backend (`409 invalid_status_transition` otherwise); `mitglied` is reached only by converting. */
const TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
    neu: ['kontaktiert', 'probetraining', 'abgelehnt'],
    kontaktiert: ['probetraining', 'abgelehnt', 'neu'],
    probetraining: ['kontaktiert', 'abgelehnt'],
    mitglied: [],
    abgelehnt: ['neu'],
};

/** Statuses a lead may be moved to from `from` (the current one is not included). */
export function nextStatuses(from: LeadStatus): readonly LeadStatus[] {
    return TRANSITIONS[from];
}

/** A lead can become a member record unless it already is one. */
export function canConvert(lead: Pick<Lead, 'status' | 'convertedClubMemberId'>): boolean {
    return lead.status !== 'mitglied' && lead.convertedClubMemberId === null;
}

/** An open request still needs the board's attention. */
export function isOpen(lead: Pick<Lead, 'status'>): boolean {
    return lead.status === 'neu' || lead.status === 'kontaktiert' || lead.status === 'probetraining';
}

export interface LeadFilters {
    status: LeadStatus | '';
    departmentId: string;
    waitlisted: '' | 'true' | 'false';
    q: string;
    page: number;
}

export const emptyFilters = (): LeadFilters => ({ status: '', departmentId: '', waitlisted: '', q: '', page: 1 });

/** Query string of `GET /club-leads` (empty filters are left out). */
export function leadsQuery(clubId: string, f: LeadFilters): string {
    const p = new URLSearchParams({ clubId, page: String(f.page), pageSize: String(LEAD_PAGE_SIZE) });
    if (f.status) p.set('status', f.status);
    if (f.departmentId) p.set('departmentId', f.departmentId);
    if (f.waitlisted) p.set('waitlisted', f.waitlisted);
    if (f.q.trim()) p.set('q', f.q.trim());
    return p.toString();
}

export function pageCount(total: number): number {
    return Math.max(1, Math.ceil(total / LEAD_PAGE_SIZE));
}

export interface LeadForm {
    name: string;
    email: string;
    phone: string;
    departmentId: string;
    message: string;
    trialOn: string;
    notes: string;
    status: LeadStatus;
    waitlisted: boolean;
}

export function formFromLead(l: Lead): LeadForm {
    return { name: l.name, email: l.email ?? '', phone: l.phone ?? '', departmentId: l.department?.id ?? '', message: l.message ?? '', trialOn: l.trialOn ?? '', notes: l.notes ?? '', status: l.status, waitlisted: l.waitlisted };
}

export const emptyLeadForm = (): LeadForm => ({ name: '', email: '', phone: '', departmentId: '', message: '', trialOn: '', notes: '', status: 'neu', waitlisted: false });

const blankToNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Translation key of the first problem of the form, or `null`: a name is required, an e-mail address only if given must look valid. */
export function leadProblem(f: LeadForm): string | null {
    if (f.name.trim().length < 1) return 'leads.err.name';
    if (f.email.trim() !== '' && !EMAIL.test(f.email.trim())) return 'leads.err.email';
    return null;
}

/** Body of `POST /club-leads` (manual entry; empty fields are left out). */
export function createLeadBody(f: LeadForm) {
    return {
        name: f.name.trim(),
        ...(f.email.trim() ? { email: f.email.trim() } : {}),
        ...(f.phone.trim() ? { phone: f.phone.trim() } : {}),
        ...(f.departmentId ? { departmentId: f.departmentId } : {}),
        ...(f.message.trim() ? { message: f.message.trim() } : {}),
        ...(f.trialOn ? { trialOn: f.trialOn } : {}),
    };
}

/** Only what changed (a `PATCH` must not be empty); text fields clear with `null`. */
export function leadPatch(original: LeadForm, next: LeadForm): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    if (next.status !== original.status) patch.status = next.status;
    if (next.waitlisted !== original.waitlisted) patch.waitlisted = next.waitlisted;
    if (next.name.trim() !== original.name.trim()) patch.name = next.name.trim();
    for (const key of ['email', 'phone', 'notes'] as const) if (blankToNull(next[key]) !== blankToNull(original[key])) patch[key] = blankToNull(next[key]);
    if (next.trialOn !== original.trialOn) patch.trialOn = next.trialOn || null;
    if (next.departmentId !== original.departmentId) patch.departmentId = next.departmentId || null;
    return patch;
}

/** Plain-language key for a failed lead request. */
export function leadErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (code === 'invalid_status_transition') return 'leads.err.transition';
        if (code === 'use_convert') return 'leads.err.useConvert';
        if (code === 'lead_already_converted') return 'leads.err.alreadyConverted';
    }
    return memberErrorKey(err);
}

/** Chip tone per status (always shown together with the status text). */
export function statusTone(status: LeadStatus): 'primary' | 'warning' | 'success' | 'destructive' | 'muted' {
    switch (status) {
        case 'neu':
            return 'primary';
        case 'kontaktiert':
            return 'warning';
        case 'probetraining':
            return 'warning';
        case 'mitglied':
            return 'success';
        case 'abgelehnt':
            return 'muted';
    }
}
