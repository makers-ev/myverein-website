import { ApiError, apiFetch } from './api-client';
import { memberErrorKey } from './clubMembers';

/**
 * Club communication (Wave 9): announcements ("Mitteilungen") of the club leadership and the member inbox. These are the
 * club's own messages -- the platform bell (`/notifications`, messages of the MyVerein platform to every user) is a
 * different thing and is labelled differently everywhere (W8). The backend enforces every permission again; the helpers
 * here only decide what the UI offers (deny-by-default).
 */

export const CHANNELS = ['in_app', 'email', 'push'] as const;
export type Channel = (typeof CHANNELS)[number];
/** Channels the author can switch; `in_app` is always on (the backend adds it). */
export const OPTIONAL_CHANNELS = ['email', 'push'] as const satisfies readonly Channel[];

/** Role types that can be addressed as a group (accounts only; mirrors the backend's `CLUB_ROLE_TYPES`). */
export const AUDIENCE_ROLE_TYPES = ['vorsitz', 'stellv_vorsitz', 'kassenwart', 'schriftfuehrer', 'beisitzer', 'abteilungsleitung', 'trainer', 'erziehungsberechtigt'] as const;

/** Default of `ANNOUNCEMENT_CONFIRM_THRESHOLD`; the backend answers with the real value when it is exceeded. */
export const DEFAULT_CONFIRM_THRESHOLD = 50;

export type AnnouncementStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';

export interface Audience {
    all?: boolean;
    departmentIds?: string[];
    roleTypes?: string[];
    categoryKeys?: string[];
    memberIds?: string[];
    includeGuardians?: boolean;
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    audience: Audience;
    channels: Channel[];
    urgent: boolean;
    pinned: boolean;
    publishAt: string | null;
    expiresAt: string | null;
    status: AnnouncementStatus;
    sentAt: string | null;
    authorMemberId: string | null;
    authorName: string | null;
    withdrawn: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
}

export interface AudiencePreview {
    total: number;
    reachable: number;
    email: number;
    push: number;
    inApp: number;
    emailOnly: number;
    unreachable: number;
    sharedAddress: number;
}

export interface ChannelStats {
    total: number;
    read: number;
    statuses: Record<string, number>;
}

export interface DeliverySummary {
    recipients: number;
    read: number;
    byChannel: Record<string, ChannelStats>;
}

export interface DeliveryRecipient {
    id: string;
    clubMemberId: string | null;
    name: string | null;
    channel: Channel;
    status: string;
    errorCode: string | null;
    attempts: number;
    sentAt: string | null;
    readAt: string | null;
}

export interface DeliveriesResponse {
    summary: DeliverySummary;
    /** Present only for `announcements:write`; the department variant gets the aggregate alone. */
    recipients?: DeliveryRecipient[];
    pagination?: Pagination;
}

export interface InboxItem {
    id: string;
    kind: 'announcement' | 'system';
    announcementId: string | null;
    title: string;
    body: string;
    urgent: boolean;
    category: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    pinned: boolean;
    authorName: string | null;
    sentAt: string | null;
    readAt: string | null;
}

/* ------------------------------ permission gating ------------------------------ */

export interface CommunicationGate {
    /** Club-wide authoring: all audiences, urgent, per-recipient delivery list, mail settings (`announcements:write`). */
    writeAll: boolean;
    /** Only the own departments (`announcements:write_department`), never urgent. */
    writeDepartment: boolean;
    /** Compose area and history at all. */
    canAuthor: boolean;
    /** May mark an announcement as urgent. */
    canUrgent: boolean;
    /** May see who received/read it (per-recipient list, resend failed). */
    canSeeRecipients: boolean;
}

export function communicationGate(permissions: readonly string[] | null | undefined): CommunicationGate {
    const has = (p: string) => !!permissions && permissions.includes(p);
    const writeAll = has('announcements:write');
    const writeDepartment = has('announcements:write_department');
    return { writeAll, writeDepartment, canAuthor: writeAll || writeDepartment, canUrgent: writeAll, canSeeRecipients: writeAll };
}

/** Roles whose `departmentId` bounds the department scope (backend: `abteilungsleitung`/`trainer`). */
const DEPARTMENT_SCOPE_ROLES = ['abteilungsleitung', 'trainer'] as const;

/** Departments a department-scoped author may address: the departments of the own `abteilungsleitung`/`trainer` roles. */
export function ownDepartmentIds(roles: ReadonlyArray<{ roleType: string; departmentId?: string | null }> | null | undefined): string[] {
    const ids = new Set<string>();
    for (const r of roles ?? []) {
        if ((DEPARTMENT_SCOPE_ROLES as readonly string[]).includes(r.roleType) && r.departmentId) ids.add(r.departmentId);
    }
    return [...ids];
}

/** Departments offered in the audience picker: all for `writeAll`, only the own ones for the department scope. */
export function selectableDepartments<D extends { id: string }>(gate: CommunicationGate, departments: readonly D[], ownIds: readonly string[]): D[] {
    if (gate.writeAll) return [...departments];
    if (!gate.writeDepartment) return [];
    return departments.filter((d) => ownIds.includes(d.id));
}

/* ------------------------------ audience ------------------------------ */

export function emptyAudience(): Audience {
    return { all: false, departmentIds: [], roleTypes: [], categoryKeys: [], memberIds: [], includeGuardians: true };
}

/** True when the audience addresses nobody (an empty definition matches nobody on the backend as well). */
export function audienceIsEmpty(a: Audience): boolean {
    return !a.all && !a.departmentIds?.length && !a.roleTypes?.length && !a.categoryKeys?.length && !a.memberIds?.length;
}

/** The request body form: only what is set (`all` excludes the other selectors, as the API contract says `all?` or the lists). */
export function cleanAudience(a: Audience): Audience {
    if (a.all) return { all: true, includeGuardians: a.includeGuardians ?? true };
    const out: Audience = { includeGuardians: a.includeGuardians ?? true };
    if (a.departmentIds?.length) out.departmentIds = a.departmentIds;
    if (a.roleTypes?.length) out.roleTypes = a.roleTypes;
    if (a.categoryKeys?.length) out.categoryKeys = a.categoryKeys;
    if (a.memberIds?.length) out.memberIds = a.memberIds;
    return out;
}

/** `in_app` is always part of the request, the optional channels follow the checkboxes. */
export function buildChannels(optional: readonly Channel[]): Channel[] {
    return ['in_app', ...OPTIONAL_CHANNELS.filter((c) => optional.includes(c))];
}

/** Whether a send needs the recipient confirmation dialog (count above the club's threshold). */
export function needsConfirmation(total: number, threshold: number = DEFAULT_CONFIRM_THRESHOLD): boolean {
    return total > threshold;
}

/** Local `datetime-local` value -> ISO string, `null` when empty or invalid. */
export function localInputToIso(value: string): string | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string -> local `datetime-local` value (empty for `null`). */
export function isoToLocalInput(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Why a compose form cannot be sent yet (translation key suffix), or `null` when it is fine. */
export function composeProblem(input: {
    title: string;
    body: string;
    audience: Audience;
    schedule: boolean;
    publishAt: string;
    expiresAt: string;
    now?: Date;
}): 'title' | 'body' | 'audience' | 'publishAt' | 'expiresAt' | null {
    const now = input.now ?? new Date();
    if (!input.title.trim()) return 'title';
    if (!input.body.trim()) return 'body';
    if (audienceIsEmpty(input.audience)) return 'audience';
    const publish = input.schedule ? localInputToIso(input.publishAt) : null;
    if (input.schedule && (!publish || new Date(publish).getTime() <= now.getTime())) return 'publishAt';
    const expires = localInputToIso(input.expiresAt);
    if (input.expiresAt && !expires) return 'expiresAt';
    if (expires) {
        const reference = publish ? new Date(publish) : now;
        if (new Date(expires).getTime() <= reference.getTime()) return 'expiresAt';
    }
    return null;
}

/* ------------------------------ delivery status ------------------------------ */

/** Delivery statuses that count as "reached" / "failed" / "not reachable" in the aggregate view. */
export const DELIVERED_STATUSES = ['sent'] as const;
export const FAILED_STATUSES = ['failed', 'bounced'] as const;
export const UNREACHABLE_STATUSES = ['skipped_no_address', 'skipped_optout'] as const;

export interface DeliveryAggregate {
    recipients: number;
    read: number;
    delivered: number;
    failed: number;
    unreachable: number;
    pending: number;
}

/** Aggregates the per-channel statuses (E-Mail/Push, the in-app copy is always "delivered" when it exists). */
export function aggregateDeliveries(summary: DeliverySummary): DeliveryAggregate {
    let delivered = 0;
    let failed = 0;
    let unreachable = 0;
    let pending = 0;
    for (const channel of Object.values(summary.byChannel ?? {})) {
        for (const [status, n] of Object.entries(channel.statuses ?? {})) {
            if ((DELIVERED_STATUSES as readonly string[]).includes(status)) delivered += n;
            else if ((FAILED_STATUSES as readonly string[]).includes(status)) failed += n;
            else if ((UNREACHABLE_STATUSES as readonly string[]).includes(status)) unreachable += n;
            else if (status === 'queued' || status === 'sending') pending += n;
        }
    }
    return { recipients: summary.recipients, read: summary.read, delivered, failed, unreachable, pending };
}

/** Number of failed e-mail/push deliveries (drives the "Fehlgeschlagene erneut senden" button). */
export function failedCount(summary: DeliverySummary): number {
    return aggregateDeliveries(summary).failed;
}

/* ------------------------------ errors ------------------------------ */

/** The recipient count the backend wants confirmed (`422 RECIPIENT_CONFIRMATION_REQUIRED`), or `null` for any other error. */
export function confirmationFromError(err: unknown): { recipients: number; threshold: number } | null {
    if (!(err instanceof ApiError) || err.code !== 'RECIPIENT_CONFIRMATION_REQUIRED') return null;
    const d = err.details as { recipients?: unknown; threshold?: unknown } | undefined;
    if (typeof d?.recipients !== 'number') return null;
    return { recipients: d.recipients, threshold: typeof d.threshold === 'number' ? d.threshold : DEFAULT_CONFIRM_THRESHOLD };
}

/** Translation key of a failed communication call; anti-spam rules (429) get their own plain-language text. */
export function communicationErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.status === 429) {
            const rule = (err.details as { rule?: unknown } | undefined)?.rule;
            if (typeof rule === 'string') {
                const known = ['announcement.max_recipients', 'announcement.club_day', 'announcement.author_hour', 'announcement.urgent_day', 'announcement.duplicate'];
                if (known.includes(rule)) return `mitteilungen.err.rule.${rule}`;
            }
            return 'mitteilungen.err.tooMany';
        }
        if (err.code === 'RECIPIENT_CONFIRMATION_REQUIRED') return 'mitteilungen.err.confirmationRequired';
        if (err.status === 409) return 'mitteilungen.err.conflict';
        if (err.status === 422 && /audience|recipient/i.test(err.message)) return 'mitteilungen.err.audienceTooLarge';
    }
    return memberErrorKey(err);
}

/* ------------------------------ API ------------------------------ */

export const announcementsPath = (clubId: string, suffix = '') => `/club-announcements${suffix}${suffix.includes('?') ? '&' : '?'}clubId=${encodeURIComponent(clubId)}`;

export interface AnnouncementInput {
    title: string;
    body: string;
    audience: Audience;
    channels: Channel[];
    urgent: boolean;
    pinned: boolean;
    publishAt?: string | null;
    expiresAt?: string | null;
}

export async function saveAnnouncement(clubId: string, id: string | null, input: AnnouncementInput): Promise<Announcement> {
    // PATCH clears optional dates with null, POST simply omits them.
    const body: AnnouncementInput = { ...input };
    if (!id) {
        if (body.publishAt == null) delete body.publishAt;
        if (body.expiresAt == null) delete body.expiresAt;
    }
    const res = await apiFetch<{ data: Announcement }>(announcementsPath(clubId, id ? `/${id}` : ''), { method: id ? 'PATCH' : 'POST', body });
    return res.data;
}

export async function previewAudience(clubId: string, audience: Audience, channels: Channel[]): Promise<AudiencePreview> {
    const res = await apiFetch<{ data: AudiencePreview }>(announcementsPath(clubId, '/preview'), { method: 'POST', body: { audience: cleanAudience(audience), channels } });
    return res.data;
}

export async function sendAnnouncement(clubId: string, id: string, body: { publishAt?: string | null; confirmRecipients?: number }): Promise<void> {
    await apiFetch(announcementsPath(clubId, `/${id}/send`), { method: 'POST', body });
}

export interface HistoryPage {
    items: Announcement[];
    pagination: Pagination;
}

export async function loadHistory(clubId: string, opts: { status?: string; page: number; pageSize: number }): Promise<HistoryPage> {
    const qs = `&page=${opts.page}&pageSize=${opts.pageSize}${opts.status ? `&status=${encodeURIComponent(opts.status)}` : ''}`;
    const res = await apiFetch<{ data: Announcement[]; pagination: Pagination }>(announcementsPath(clubId, '') + qs);
    return { items: res.data, pagination: res.pagination };
}

export async function loadDeliveries(clubId: string, id: string, opts: { page: number; pageSize: number; status?: string; withList: boolean }): Promise<DeliveriesResponse> {
    const qs = opts.withList ? `&page=${opts.page}&pageSize=${opts.pageSize}${opts.status ? `&status=${encodeURIComponent(opts.status)}` : ''}` : '';
    const res = await apiFetch<{ data: DeliveriesResponse; pagination?: Pagination }>(announcementsPath(clubId, `/${id}/deliveries`) + qs);
    // The pagination of the recipient list sits next to `data` in some answers and inside it in others: accept both.
    return { ...res.data, pagination: res.data.pagination ?? res.pagination };
}

/** What the author can still do with an announcement in a given state (the backend enforces the same rules). */
export function announcementActions(a: Pick<Announcement, 'status' | 'withdrawn'>): { edit: boolean; delete: boolean; cancel: boolean; withdraw: boolean; showDeliveries: boolean; resend: boolean } {
    const sentLive = a.status === 'sent' && !a.withdrawn;
    return {
        edit: a.status === 'draft' || a.status === 'scheduled',
        delete: a.status === 'draft' || a.status === 'scheduled' || a.status === 'cancelled',
        cancel: a.status === 'scheduled',
        withdraw: sentLive,
        showDeliveries: a.status === 'sent' || a.status === 'sending',
        resend: sentLive,
    };
}

/** Translation key of the state label; a withdrawn announcement is `sent` on the backend but shown as withdrawn. */
export function statusLabelKey(a: Pick<Announcement, 'status' | 'withdrawn'>): string {
    return a.status === 'sent' && a.withdrawn ? 'mitteilungen.status.withdrawn' : `mitteilungen.status.${a.status}`;
}
