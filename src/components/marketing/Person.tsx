export type PersonPose = 'stand' | 'wave' | 'carry' | 'sit' | 'shrug' | 'child' | 'elder' | 'lead';
export type PersonTone = 1 | 2 | 3 | 4 | 5 | 6;

// Token-based tones only, so the figures follow every palette and both themes.
const TONES: Record<PersonTone, { fill: string; stroke: string }> = {
    1: { fill: 'fill-primary', stroke: 'stroke-primary' },
    2: { fill: 'fill-accent', stroke: 'stroke-accent' },
    3: { fill: 'fill-success', stroke: 'stroke-success' },
    4: { fill: 'fill-warning', stroke: 'stroke-warning' },
    5: { fill: 'fill-destructive', stroke: 'stroke-destructive' },
    6: { fill: 'fill-muted-foreground', stroke: 'stroke-muted-foreground' },
};

// Arms are strokes from the shoulders; the pose decides the polyline.
const ARMS: Record<PersonPose, string[]> = {
    stand: ['M19 38 L12 68', 'M41 38 L48 68'],
    wave: ['M19 38 L12 68', 'M41 38 L50 22 L52 10'],
    carry: ['M19 38 L14 64 L26 64', 'M41 38 L46 64 L34 64'],
    sit: ['M19 38 L12 66', 'M41 38 L48 66'],
    shrug: ['M19 38 L7 52 L13 40', 'M41 38 L53 52 L47 40'],
    child: ['M19 38 L12 68', 'M41 38 L50 24'],
    elder: ['M19 38 L13 66', 'M41 38 L48 64'],
    lead: ['M19 38 L12 68', 'M41 38 L47 52'],
};

const TORSO = 'M17 34 Q30 28 43 34 L47 82 L13 82 Z';
const LEGS = ['M20 82 L29 82 L28 116 L19 116 Z', 'M31 82 L40 82 L41 116 L32 116 Z'];
const SIT_LEGS = ['M20 82 L48 82 L48 94 L22 94 Z', 'M40 94 L48 94 L48 116 L40 116 Z'];

type Props = {
    pose: PersonPose;
    tone: PersonTone;
    /** Height in px; width is half of it. */
    size?: number;
    /** Planned look: outline only, no fill. */
    dashed?: boolean;
    className?: string;
    x?: number;
    y?: number;
};

/** Faceless paper-cut figure. Purely decorative: callers describe the scene, never a single figure. */
export default function Person({ pose, tone, size = 120, dashed = false, className = '', x, y }: Props) {
    const { fill, stroke } = TONES[tone];
    const outline = `fill-transparent ${stroke} stroke-[1.5] [stroke-dasharray:4_3]`;
    const shape = dashed ? outline : fill;
    const arm = dashed ? `${stroke} stroke-[1.5] [stroke-dasharray:4_3]` : `${stroke} stroke-[7]`;
    const legs = pose === 'sit' ? SIT_LEGS : LEGS;
    // Soft offset copy under the figure: the "real paper" shadow.
    const shadow = 'fill-foreground/15';

    const body = (
        <>
            {legs.map((d) => (
                <path key={d} d={d} className={shape} />
            ))}
            <path d={TORSO} className={shape} />
            {ARMS[pose].map((d) => (
                <path key={d} d={d} fill="none" strokeLinecap="round" strokeLinejoin="round" className={arm} />
            ))}
            <circle cx={30} cy={17} r={pose === 'child' ? 12 : 10} className={dashed ? outline : 'fill-muted stroke-border'} />
            {pose === 'carry' && <rect x={20} y={58} width={20} height={14} rx={1.5} className={dashed ? outline : 'fill-accent'} />}
            {pose === 'lead' && (
                <>
                    <rect x={43} y={44} width={13} height={17} rx={1.5} className={dashed ? outline : 'fill-card stroke-border'} />
                    <circle cx={30} cy={48} r={3.5} className={dashed ? outline : 'fill-accent'} />
                </>
            )}
            {pose === 'elder' && <path d="M50 64 L53 116" fill="none" strokeLinecap="round" className="stroke-foreground stroke-[3]" />}
            {pose === 'sit' && <path d="M14 96 L14 116 M50 96 L50 116" fill="none" className="stroke-foreground/40 stroke-[2]" />}
        </>
    );

    // Child is a smaller figure standing on the same baseline; the elder leans a little.
    const transform = pose === 'child' ? 'translate(9 34) scale(0.72)' : pose === 'elder' ? 'rotate(4 30 116)' : undefined;

    return (
        <svg viewBox="0 0 60 120" width={size / 2} height={size} x={x} y={y} aria-hidden="true" focusable="false" className={`overflow-visible ${className}`}>
            <g transform={transform}>
                {!dashed && (
                    <g transform="translate(2 3)" className={shadow}>
                        <path d={TORSO} />
                        {legs.map((d) => (
                            <path key={d} d={d} />
                        ))}
                        <circle cx={30} cy={17} r={pose === 'child' ? 12 : 10} />
                    </g>
                )}
                {body}
            </g>
        </svg>
    );
}
