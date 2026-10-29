'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiFetch } from '@/lib/api-client';
import { chooseClub, storeClubId } from '@/lib/activeClub';

export interface ShellClub {
    clubId: string;
    clubName: string | null;
}

interface ActiveClubValue {
    /** `null` while loading. */
    clubs: ShellClub[] | null;
    failed: boolean;
    hasWards: boolean;
    activeClub: ShellClub | null;
    /** `null` while loading or when the lookup failed. */
    permissions: string[] | null;
    roles: { roleType: string }[];
    switchClub: (clubId: string) => void;
    reload: () => void;
}

const Ctx = createContext<ActiveClubValue | null>(null);

export function useActiveClub(): ActiveClubValue {
    const v = useContext(Ctx);
    if (!v) throw new Error('useActiveClub must be used within ActiveClubProvider');
    return v;
}

/**
 * Loads the account's clubs, remembers the chosen one (localStorage) and the caller's permissions in it. `switchClub` changes the
 * club without a page reload: `children` is re-keyed so every page remounts and refetches for the new club.
 */
export function ActiveClubProvider({ children }: { children: (key: number) => ReactNode }) {
    const [clubs, setClubs] = useState<ShellClub[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [hasWards, setHasWards] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [me, setMe] = useState<{ clubId: string; permissions: string[]; roles: { roleType: string }[] } | null>(null);
    const [switches, setSwitches] = useState(0);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        Promise.all([apiFetch<{ data: ShellClub[] }>('/my-clubs'), apiFetch<{ data: { wards: unknown[] }[] }>('/my-wards').catch(() => ({ data: [] as { wards: unknown[] }[] }))])
            .then(([c, w]) => {
                if (cancelled) return;
                setClubs(c.data);
                setHasWards(w.data.some((x) => x.wards.length > 0));
                setActiveId(chooseClub(c.data)?.clubId ?? null);
                setFailed(false);
            })
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, [attempt]);

    useEffect(() => {
        if (!activeId) return;
        let cancelled = false;
        apiFetch<{ data: { permissions: string[]; roles?: { roleType: string }[] } }>(`/club-members/me?clubId=${activeId}`)
            .then((r) => !cancelled && setMe({ clubId: activeId, permissions: r.data.permissions, roles: r.data.roles ?? [] }))
            .catch(() => !cancelled && setMe(null));
        return () => {
            cancelled = true;
        };
    }, [activeId]);

    const switchClub = useCallback((clubId: string) => {
        storeClubId(clubId);
        setActiveId(clubId);
        setMe(null);
        setSwitches((n) => n + 1);
    }, []);
    const reload = useCallback(() => setAttempt((n) => n + 1), []);

    const value = useMemo<ActiveClubValue>(() => {
        const activeClub = clubs?.find((c) => c.clubId === activeId) ?? null;
        const current = me && me.clubId === activeId ? me : null;
        return { clubs, failed, hasWards, activeClub, permissions: current?.permissions ?? null, roles: current?.roles ?? [], switchClub, reload };
    }, [clubs, failed, hasWards, activeId, me, switchClub, reload]);

    return <Ctx.Provider value={value}>{children(switches)}</Ctx.Provider>;
}
