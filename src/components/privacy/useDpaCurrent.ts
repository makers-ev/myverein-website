'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import type { DpaCurrent } from '@/lib/privacyAdmin';

/**
 * The processor agreement (AV-Vertrag) status of the club (`GET /dpa/current`). `enabled` keeps the request away from people
 * who have no use for it; `reloadToken` re-reads after an acceptance. A failed request yields `null` (the banner then stays
 * silent, the status page shows its own error state).
 */
export function useDpaCurrent(clubId: string | null, enabled: boolean, reloadToken = 0): DpaCurrent | null {
    const [current, setCurrent] = useState<DpaCurrent | null>(null);

    const load = useCallback(async () => {
        if (!clubId || !enabled) return;
        try {
            setCurrent((await apiFetch<{ data: DpaCurrent }>(`/dpa/current?clubId=${encodeURIComponent(clubId)}`)).data);
        } catch {
            setCurrent(null);
        }
    }, [clubId, enabled]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load, reloadToken]);

    return enabled ? current : null;
}
