export interface ColumnSeries {
    key: string;
    label: string;
    /** Tailwind fill class for the SVG bars, e.g. "fill-primary". */
    fillClass: string;
    /** Tailwind text class for the value under the bar, e.g. "text-primary". */
    textClass: string;
    /** Tailwind background class for the legend swatch (fill-* only works on SVG). */
    bgClass: string;
}

export interface ColumnDatum {
    label: string;
    values: Record<string, number>;
}

const PLOT_HEIGHT = 120;

/**
 * Grouped column chart as hand-rolled SVG (no charting dependency, same approach as the admin panel's BarChart).
 * Only SVG attributes and Tailwind classes are used -- no inline `style`, which this app's CSP forbids. The SVG
 * is stretched (`preserveAspectRatio="none"`) and therefore contains no text; labels and values are HTML cells with
 * the same width as their column, so they line up with the bars. The numbers are printed under every column, so
 * the chart does not rely on color alone.
 */
export function ColumnChart({ data, series, ariaLabel }: { data: ColumnDatum[]; series: ColumnSeries[]; ariaLabel: string }) {
    const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)));
    const colWidth = 100 / Math.max(1, data.length);
    const barWidth = (colWidth * 0.8) / series.length;

    return (
        <div>
            <svg viewBox={`0 0 100 ${PLOT_HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel} className="h-32 w-full">
                {[0, 0.5, 1].map((f) => (
                    <line
                        key={f}
                        x1="0"
                        x2="100"
                        y1={PLOT_HEIGHT - f * (PLOT_HEIGHT - 2) - 1}
                        y2={PLOT_HEIGHT - f * (PLOT_HEIGHT - 2) - 1}
                        className="stroke-border"
                        strokeWidth={f === 0 ? 1 : 0.5}
                        vectorEffect="non-scaling-stroke"
                    />
                ))}
                {data.map((d, i) =>
                    series.map((s, j) => {
                        const value = d.values[s.key] ?? 0;
                        const h = (value / max) * (PLOT_HEIGHT - 4);
                        return (
                            <rect
                                key={`${i}-${s.key}`}
                                x={i * colWidth + colWidth * 0.1 + j * barWidth}
                                y={PLOT_HEIGHT - 1 - Math.max(h, value > 0 ? 1 : 0)}
                                width={barWidth}
                                height={Math.max(h, value > 0 ? 1 : 0)}
                                className={s.fillClass}
                            >
                                <title>{`${d.label} — ${s.label}: ${value}`}</title>
                            </rect>
                        );
                    }),
                )}
            </svg>
            <div className="mt-1 flex">
                {data.map((d, i) => (
                    <div key={i} className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <span className="w-full truncate text-[10px] text-muted-foreground">{d.label}</span>
                        <span className="flex gap-1 text-[11px] font-semibold">
                            {series.map((s) => (
                                <span key={s.key} className={s.textClass}>
                                    {d.values[s.key] ?? 0}
                                </span>
                            ))}
                        </span>
                    </div>
                ))}
            </div>
            {series.length > 1 && (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                    {series.map((s) => (
                        <div key={s.key} className="flex items-center gap-1.5">
                            <span className={`h-2.5 w-2.5 rounded-sm ${s.bgClass}`} />
                            <span className="text-xs text-muted-foreground">{s.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
