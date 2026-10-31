import { useCallback, useEffect, useRef } from 'react';

/**
 * Stable callback that runs `fn` at most once per `windowMs`; errors of an async `fn` are swallowed (used for the
 * "signed photo URL expired, refetch the resource" reaction, which must never loop or surface as unhandled rejection).
 */
export function useThrottledCallback(fn: () => unknown, windowMs = 15_000): () => void {
    const last = useRef(0);
    const fnRef = useRef(fn);
    useEffect(() => {
        fnRef.current = fn;
    });
    return useCallback(() => {
        const now = Date.now();
        if (now - last.current < windowMs) return;
        last.current = now;
        try {
            void Promise.resolve(fnRef.current()).catch(() => undefined);
        } catch {
            // synchronous failure: nothing to do
        }
    }, [windowMs]);
}
