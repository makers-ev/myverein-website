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
