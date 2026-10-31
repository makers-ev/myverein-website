/**
 * Children of the signed-in person (`GET /club-members/me/children`): the club members the caller is an active guardian of. The
 * list is empty for everybody who is no guardian and for any error the UI shows nothing at all (no way to tell "not a guardian"
 * from "failed"), so these helpers only ever turn an answer into a clean list.
 */
export interface Child {
    clubMemberId: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);

/** Children of a response; entries without an id are dropped, anything unexpected is an empty list. */
export function asChildren(res: unknown): Child[] {
    const data = (res as { data?: unknown } | null)?.data;
    if (!Array.isArray(data)) return [];
    const out: Child[] = [];
    for (const item of data) {
        const c = item as Record<string, unknown> | null;
        const id = c && typeof c.clubMemberId === 'string' && c.clubMemberId !== '' ? c.clubMemberId : null;
        if (!id) continue;
        out.push({ clubMemberId: id, displayName: str(c!.displayName), firstName: str(c!.firstName), lastName: str(c!.lastName), status: typeof c!.status === 'string' ? c!.status : '' });
    }
    return out;
}

/** Name to show: display name, else first + last name, else `null`. */
export function childName(child: Pick<Child, 'displayName' | 'firstName' | 'lastName'>): string | null {
    return child.displayName ?? ([child.firstName, child.lastName].filter(Boolean).join(' ') || null);
}
