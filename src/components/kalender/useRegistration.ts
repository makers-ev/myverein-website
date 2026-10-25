'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import type { RegistrationInfo } from '@/lib/eventRegistration';

/** Registration settings of one event (`GET /events/:id/registration`); `null` while loading, `'error'` when it failed. */
export function useRegistration(clubId: string, eventId: string, enabled = true): { info: RegistrationInfo | null | 'error'; reload: () => void } {
    const [info, setInfo] = useState<RegistrationInfo | null | 'error'>(null);
    const [tick, setTick] = useState(0);
    const reload = useCallback(() => setTick((n) => n + 1), []);

    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        apiFetch<{ data: RegistrationInfo }>(`/events/${eventId}/registration?clubId=${clubId}`)
            .then((res) => alive && setInfo(res.data))
            .catch(() => alive && setInfo((prev) => (prev && prev !== 'error' ? prev : 'error')));
        return () => {
            alive = false;
        };
    }, [clubId, eventId, enabled, tick]);

    return { info, reload };
}
