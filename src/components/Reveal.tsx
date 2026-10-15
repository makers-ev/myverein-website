'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Fades/slides children in once they scroll into view; `delay` in ms for staggering. */
export default function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    // The CSP (style-src with nonce only) blocks a server-rendered `style` attribute; setting it through the CSSOM is allowed.
    useEffect(() => {
        if (ref.current) ref.current.style.transitionDelay = `${delay}ms`;
    }, [delay]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setShown(true);
                io.disconnect();
            }
        }, { threshold: 0.15 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`transition-all duration-700 motion-reduce:transition-none ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:opacity-100 motion-reduce:translate-y-0'} ${className}`}
        >
            {children}
        </div>
    );
}
