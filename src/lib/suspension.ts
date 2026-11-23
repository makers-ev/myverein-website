/** Member-facing suspension of a club as `GET /my-clubs` delivers it (`suspension: { since, note } | null`); never the internal reason. */
export interface ClubSuspension {
    since: string;
    note: string | null;
}

export function normalizeSuspension(value: unknown): ClubSuspension | null {
    if (!value || typeof value !== 'object') return null;
    const o = value as Record<string, unknown>;
    const note = typeof o.note === 'string' && o.note.trim() ? o.note : null;
    return { since: typeof o.since === 'string' ? o.since : '', note };
}
