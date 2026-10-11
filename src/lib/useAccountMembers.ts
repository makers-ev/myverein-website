import { useEffect, useState } from 'react';

import { loadAccountMembers, type AccountMember } from './clubMembers';

/**
 * Account members of a club for name resolution and pickers (see `loadAccountMembers`). Ignores answers that arrive
 * after unmount or a club switch. `error` is set for real failures (not for a 403, which yields an empty list).
 */
export function useAccountMembers(clubId: string): { members: AccountMember[]; loading: boolean; error: boolean } {
    const [state, setState] = useState<{ clubId: string; members: AccountMember[]; error: boolean } | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadAccountMembers(clubId)
            .then((members) => {
                if (!cancelled) setState({ clubId, members, error: false });
            })
            .catch(() => {
                if (!cancelled) setState({ clubId, members: [], error: true });
            });
        return () => {
            cancelled = true;
        };
    }, [clubId]);

    const current = state?.clubId === clubId ? state : null;
    return { members: current?.members ?? [], loading: current === null, error: current?.error ?? false };
}
