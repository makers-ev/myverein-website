/**
 * Self-service loan rules of the Material tab (backend `POST /inventory-items/:id/loans`).
 *
 * Borrowing is allowed while the club setting `allowSelfLoans` is on; holders of `inventory:write` are exempt. An
 * unknown setting (still loading / failed to load) hides the action -- the backend decides in the end, the UI never
 * offers what it cannot confirm. External guests and items that are already out never offer it. Returning is not part of the switch: the borrower and `inventory:write` may always do it.
 */
export function canBorrow(allowSelfLoans: boolean | null, canManage: boolean, isGuest = false, hasOpenLoan = false): boolean {
    if (isGuest || hasOpenLoan) return false;
    return canManage || allowSelfLoans === true;
}

/** External guest account (`orgRole` `guest`, e.g. a guardian): may read, never borrows. */
export function isGuestRole(orgRole: string | null | undefined): boolean {
    return (orgRole ?? '').split(',').map((r) => r.trim()).includes('guest');
}

export function canReturn(loan: { memberId: string; returnedAt: string | null }, ownMemberId: string | null, canManage: boolean): boolean {
    if (loan.returnedAt) return false;
    return canManage || (ownMemberId !== null && loan.memberId === ownMemberId);
}

/** Extending the return date needs `inventory:write` (the borrower gets `403`), an open loan and an existing return date. */
export function canExtend(loan: { dueAt: string | null; returnedAt: string | null }, canManage: boolean): boolean {
    return canManage && !loan.returnedAt && !!loan.dueAt;
}

export type ExtensionProblem = 'required' | 'notLater' | 'past';

/**
 * Validates the new return date (`YYYY-MM-DD` from a date input) like the backend: strictly later than the current return
 * date and in the future. Returns the ISO instant with offset to send (end of that day, local time) or the problem.
 */
export function buildExtension(newDate: string, currentDueAt: string | null, now: Date = new Date()): { dueAt: string } | { problem: ExtensionProblem } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return { problem: 'required' };
    const next = new Date(`${newDate}T23:59:00`);
    if (Number.isNaN(next.getTime())) return { problem: 'required' };
    if (next.getTime() <= now.getTime()) return { problem: 'past' };
    if (currentDueAt) {
        const current = new Date(currentDueAt);
        if (!Number.isNaN(current.getTime()) && next.getTime() <= current.getTime()) return { problem: 'notLater' };
    }
    return { dueAt: next.toISOString() };
}
