/**
 * "I want to join this club" signal between the public club page / club finder and the club page `/verein`. A person who is
 * already in another club has no join card there; the signal opens the "join another club" area. Session-scoped, holds no data
 * (the club code itself is remembered by `rememberClubSlug`), read once.
 */
const KEY = 'myverein.joinIntent';

export function markJoinIntent(store: Pick<Storage, 'setItem'> | null = defaultStore()): void {
    try {
        store?.setItem(KEY, '1');
    } catch {
        // Blocked storage: the area simply stays closed.
    }
}

export function consumeJoinIntent(store: Pick<Storage, 'getItem' | 'removeItem'> | null = defaultStore()): boolean {
    try {
        const on = store?.getItem(KEY) === '1';
        if (on) store?.removeItem(KEY);
        return on;
    } catch {
        return false;
    }
}

function defaultStore(): Storage | null {
    try {
        return typeof window === 'undefined' ? null : window.sessionStorage;
    } catch {
        return null;
    }
}
