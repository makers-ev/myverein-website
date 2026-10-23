/**
 * Access and change log (Wave 10 W8, `privacy:read`). The backend lists audit entries of the caller's club (ids, field names and
 * counts only, payloads are whitelisted there). The UI turns the technical `eventType` into a German sentence through the
 * `audit.event.<eventType>` translations; an unknown type falls back to the raw type, so a new backend event is never hidden.
 */

export type AuditKind = 'read' | 'change';

export interface AuditEntry {
    id: string;
    eventType: string;
    kind: AuditKind;
    subjectId: string | null;
    subjectMember: { id: string; name: string | null } | null;
    actor: { userId: string; name: string | null } | null;
    payload: Record<string, unknown>;
    createdAt: string;
}

export interface AuditPage {
    data: AuditEntry[];
    page: number;
    pageSize: number;
    total: number;
    /** Only the member view: whose log this is. */
    member?: { id: string; name: string };
}

export const AUDIT_PAGE_SIZE = 25;

export interface AuditFilter {
    kind: AuditKind | '';
    /** Exact event type, or a group with a trailing `*` (e.g. `consent*`). */
    type: string;
    actorId: string;
    from: string;
    to: string;
    page: number;
}

/** Event groups offered in the filter (prefix match with the trailing `*` the API supports). */
export const AUDIT_GROUPS = ['consent*', 'consent_purpose*', 'consent_text*', 'club_member.*', 'club_application.*', 'club_exit_request.*', 'guardian_link.*', 'absence.*', 'member_field*', 'media.*', 'club_role.*'] as const;

/** Query string for the list and the export (the member view is a different path, not a filter). */
export function auditQuery(clubId: string, f: AuditFilter, withPaging = true): string {
    const params = new URLSearchParams({ clubId });
    if (withPaging) {
        params.set('page', String(f.page));
        params.set('pageSize', String(AUDIT_PAGE_SIZE));
    }
    if (f.kind) params.set('kind', f.kind);
    if (f.type) params.set('type', f.type);
    if (f.actorId) params.set('actorId', f.actorId);
    if (f.from) params.set('from', f.from);
    if (f.to) params.set('to', f.to);
    return params.toString();
}

/** Path of the list: the whole club, or the log of one member. */
export function auditPath(memberId: string | null): string {
    return memberId ? `/audit-log/members/${encodeURIComponent(memberId)}` : '/audit-log';
}

const PARAM_DEFAULT = '—';

function scalar(value: unknown): string | null {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
        const items = value.filter((v) => typeof v === 'string' || typeof v === 'number');
        return items.length > 0 ? items.join(', ') : null;
    }
    return null;
}

/** Interpolation values of a sentence: who, whom, and a few payload facts (counts, versions, field names). Nothing else. */
export function auditParams(entry: AuditEntry, systemLabel: string, unknownPerson: string): Record<string, string> {
    const p = entry.payload ?? {};
    return {
        actor: entry.actor?.name ?? (entry.actor ? PARAM_DEFAULT : systemLabel),
        member: entry.subjectMember?.name ?? unknownPerson,
        count: scalar(p.count) ?? PARAM_DEFAULT,
        recipients: scalar(p.recipients) ?? PARAM_DEFAULT,
        rows: scalar(p.rows) ?? PARAM_DEFAULT,
        version: scalar(p.version) ?? PARAM_DEFAULT,
        status: scalar(p.status) ?? PARAM_DEFAULT,
        fields: scalar(p.changedFields) ?? scalar(p.fields) ?? scalar(p.columns) ?? PARAM_DEFAULT,
    };
}

/** German (or English) sentence for an entry, or the raw event type when no sentence exists for it. */
export function describeAuditEvent(entry: AuditEntry, t: (key: string, params?: Record<string, string | number>) => string): string {
    const key = `audit.event.${entry.eventType}`;
    const text = t(key, auditParams(entry, t('audit.actor.system'), t('audit.member.unknown')));
    return text === key ? entry.eventType : text;
}
