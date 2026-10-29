'use client';

import { useSyncExternalStore } from 'react';

/** Remembered club choice of the account (club switcher in the app shell). Browser-only, never sent anywhere. */
export const ACTIVE_CLUB_KEY = 'myverein.activeClubId';
/** Fired on `window` whenever the choice changes, so components outside the keyed page subtree (inbox link) follow. */
export const ACTIVE_CLUB_EVENT = 'myverein:active-club';

export function getStoredClubId(): string | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage.getItem(ACTIVE_CLUB_KEY);
    } catch {
        return null;
    }
}

export function storeClubId(clubId: string): void {
    try {
        window.localStorage.setItem(ACTIVE_CLUB_KEY, clubId);
    } catch {
        // Private mode / storage disabled: the choice then only lives until reload.
    }
    window.dispatchEvent(new CustomEvent(ACTIVE_CLUB_EVENT));
}

/** The club every page works with: the remembered one if the account still belongs to it, else the first one. */
export function chooseClub<T extends { clubId: string }>(clubs: readonly T[] | null | undefined, stored: string | null = getStoredClubId()): T | undefined {
    if (!clubs || clubs.length === 0) return undefined;
    return clubs.find((c) => c.clubId === stored) ?? clubs[0];
}

function subscribe(onChange: () => void): () => void {
    window.addEventListener(ACTIVE_CLUB_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(ACTIVE_CLUB_EVENT, onChange);
        window.removeEventListener('storage', onChange);
    };
}

/** Reactive stored club id (`null` on the server and before a choice was made). */
export function useStoredClubId(): string | null {
    return useSyncExternalStore(subscribe, getStoredClubId, () => null);
}
