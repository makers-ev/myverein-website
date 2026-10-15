'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

type Options = {
    threshold?: number;
    rootMargin?: string;
    /** Stay "in view" once seen (default). Set false to toggle with visibility. */
    once?: boolean;
};

const subscribeNever = () => () => {};

/**
 * SSR-safe in-view detection. `ready` is false on the server and during hydration and true afterwards, so a component
 * only applies its hidden "before" state (via the `mk-ready` class) once JS runs; the server markup is always the final,
 * readable state. `stateClass` bundles both flags as the `mk-ready` / `is-in` classes the mk- CSS reacts to.
 */
export function useInView<T extends Element = HTMLDivElement>({
    threshold = 0.2,
    rootMargin = '0px 0px -8% 0px',
    once = true,
}: Options = {}): { ref: RefObject<T | null>; inView: boolean; ready: boolean; stateClass: string } {
    const ref = useRef<T | null>(null);
    const [seen, setSeen] = useState(false);
    const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
    const supported = ready && typeof IntersectionObserver !== 'undefined';

    useEffect(() => {
        const el = ref.current;
        if (!el || !supported) return;
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setSeen(true);
                    if (once) io.disconnect();
                } else if (!once) {
                    setSeen(false);
                }
            },
            { threshold, rootMargin },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [supported, threshold, rootMargin, once]);

    // Without IntersectionObserver everything simply shows its end state.
    const inView = ready && (seen || !supported);
    return { ref, inView, ready, stateClass: `${ready ? 'mk-ready' : ''} ${inView ? 'is-in' : ''}`.trim() };
}
