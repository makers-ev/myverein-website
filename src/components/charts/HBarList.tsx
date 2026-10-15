export interface HBarItem {
    id: string;
    label: string;
    value: number;
}

/**
 * Labeled horizontal bars (label, count, proportional bar). Bar widths are SVG attributes, not inline styles (CSP).
 * Bars are relative to the largest entry.
 */
export function HBarList({ items, fillClass = 'fill-primary' }: { items: HBarItem[]; fillClass?: string }) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate text-foreground">{item.label}</span>
                        <span className="shrink-0 font-semibold text-foreground">{item.value}</span>
                    </div>
                    <svg viewBox="0 0 100 4" preserveAspectRatio="none" className="mt-1 h-2 w-full" aria-hidden="true">
                        <rect width="100" height="4" rx="1" className="fill-muted" />
                        <rect width={(item.value / max) * 100} height="4" rx="1" className={fillClass} />
                    </svg>
                </li>
            ))}
        </ul>
    );
}
