'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import { roleStatus, type Role } from './marketingData';
import Person, { type PersonPose, type PersonTone } from './Person';

type Figure = { role: Role; pose: PersonPose; tone: PersonTone; x: number; row: 'back' | 'front' };

// Back row stands taller and higher; the front row overlaps it a little, like a real group photo.
const FIGURES: Figure[] = [
    { role: 'vorstand', pose: 'lead', tone: 1, x: 30, row: 'back' },
    { role: 'vorstand', pose: 'stand', tone: 3, x: 112, row: 'back' },
    { role: 'mitglied', pose: 'wave', tone: 2, x: 194, row: 'back' },
    { role: 'abteilungsleitung', pose: 'lead', tone: 4, x: 280, row: 'back' },
    { role: 'abteilungsleitung', pose: 'carry', tone: 6, x: 366, row: 'back' },
    { role: 'mitglied', pose: 'stand', tone: 5, x: 452, row: 'back' },
    { role: 'mitglied', pose: 'shrug', tone: 3, x: 538, row: 'back' },
    { role: 'mitglied', pose: 'wave', tone: 1, x: 620, row: 'back' },
    { role: 'eltern', pose: 'stand', tone: 4, x: 60, row: 'front' },
    { role: 'ohne-konto', pose: 'child', tone: 2, x: 140, row: 'front' },
    { role: 'ohne-konto', pose: 'elder', tone: 5, x: 320, row: 'front' },
    { role: 'mitglied', pose: 'sit', tone: 6, x: 440, row: 'front' },
    { role: 'eltern', pose: 'wave', tone: 1, x: 570, row: 'front' },
];

const ROW = { back: { size: 170, y: 56 }, front: { size: 150, y: 142 } } as const;

/**
 * Illustrated club group photo. `activeRole` lifts the matching figures and dims the rest; figures of a role that is
 * not available yet (e.g. parents) are drawn as dashed outlines. The role picker owns the selection.
 */
export default function GroupPhoto({ activeRole = null, className = '' }: { activeRole?: Role | null; className?: string }) {
    const { t } = useLanguage();
    const label = activeRole ? t('mk.group.alt.active', { role: t(`mk.role.${activeRole}.name`) }) : t('mk.group.alt');

    return (
        <svg viewBox="0 0 720 300" role="img" aria-label={label} className={`h-auto w-full ${className}`}>
            <rect x={10} y={278} width={700} height={10} rx={2} className="fill-muted" />
            {(['back', 'front'] as const).map((row) =>
                FIGURES.map((f, i) => ({ f, i }))
                    .filter(({ f }) => f.row === row)
                    .map(({ f, i }) => {
                        const { size, y } = ROW[row];
                        const active = activeRole === f.role;
                        const dimmed = activeRole !== null && !active;
                        const planned = roleStatus(f.role) === 'soon';
                        return (
                            <g
                                key={i}
                                className={`transition-all duration-300 motion-reduce:transition-none ${
                                    active ? '-translate-y-2' : ''
                                } ${dimmed ? 'opacity-35' : 'opacity-100'}`}
                            >
                                {active && <ellipse cx={f.x + size / 4} cy={y + size + 4} rx={size / 3.2} ry={5} className="fill-accent/50" />}
                                <Person pose={f.pose} tone={f.tone} size={size} x={f.x} y={y} dashed={planned} />
                            </g>
                        );
                    }),
            )}
        </svg>
    );
}
