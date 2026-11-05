import type { ReactNode } from 'react';

/**
 * Header of the public content pages (features, changelog, roadmap, about, contact): display-serif title, one intro
 * paragraph, left aligned. App pages keep their own sans titles; the serif is for public headlines only.
 */
export function PageHeader({ title, intro, children, className = '' }: { title: ReactNode; intro?: ReactNode; children?: ReactNode; className?: string }) {
    return (
        <header className={`max-w-2xl ${className}`.trim()}>
            <h1 className="font-display text-4xl leading-[1.08] text-foreground sm:text-5xl">{title}</h1>
            {intro && <p className="mt-4 text-lg leading-8 text-muted-foreground">{intro}</p>}
            {children}
        </header>
    );
}
