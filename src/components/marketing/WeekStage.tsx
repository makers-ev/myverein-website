'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import { getItem, weekDayIds } from './marketingData';
import { Draw, MK_SECTION, SectionHead, StatusSketch } from './Sketch';
import { useInView } from './useInView';

/** Stick figure as stroke paths: head, body, legs and arms. `base` is the y of the feet. */
function stick(x: number, base: number, arms: 'down' | 'up' | 'out' = 'down', height = 46): string[] {
    const head = base - height;
    const neck = head + 8;
    const hip = base - height * 0.4;
    const armY = neck + 6;
    const armPaths = {
        down: `M${x - 9} ${armY + 14} L${x} ${armY} L${x + 9} ${armY + 14}`,
        up: `M${x - 9} ${armY - 8} L${x} ${armY} L${x + 9} ${armY - 8}`,
        out: `M${x - 12} ${armY + 4} L${x} ${armY} L${x + 12} ${armY + 4}`,
    };
    return [
        `M${x - 5} ${head} a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0`,
        `M${x} ${neck} L${x} ${hip}`,
        `M${x - 8} ${base} L${x} ${hip} L${x + 8} ${base}`,
        armPaths[arms],
    ];
}

type Scene = { people: string[]; props: string[] };

const SCENES: Record<string, Scene> = {
    mo: {
        people: stick(36, 88, 'out'),
        props: ['M72 28 h34 v44 h-34 z', 'M80 50 l6 7 l12 -15', 'M80 64 h18', 'M118 40 h26 M118 52 h18'],
    },
    di: {
        people: [...stick(30, 88, 'up'), ...stick(62, 88), ...stick(94, 88, 'out')],
        props: ['M128 66 h-18 m6 -6 l-6 6 l6 6', 'M122 30 h26 v20 h-26 z', 'M128 40 h14'],
    },
    mi: {
        people: [...stick(46, 60, 'up', 34), ...stick(114, 60, 'down', 34)],
        props: ['M14 62 h132', 'M26 62 v26 M134 62 v26', 'M66 12 h30 v28 h-30 z', 'M72 22 h18 M72 30 h12'],
    },
    do: {
        people: stick(34, 88, 'out'),
        props: ['M64 56 h30 v24 h-30 z M64 66 h30', 'M112 44 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M124 44 h24 M142 44 v8 M136 44 v6'],
    },
    fr: {
        people: stick(36, 88, 'out'),
        props: ['M92 18 h30 v62 h-30 z', 'M100 36 q7 -7 14 0 M104 42 q3 -3 6 0', 'M99 52 h8 v8 h-8 z M111 52 h8 v8 h-8 z M99 64 h8 v8 h-8 z'],
    },
    sa: {
        people: stick(34, 88, 'down', 42),
        props: ['M50 50 L47 88', 'M80 24 h64 M80 40 h64 M80 56 h64 M80 72 h64', 'M84 32 l4 4 l7 -9'],
    },
    so: {
        people: stick(30, 88, 'up'),
        props: ['M80 84 H148', 'M92 84 V58 M108 84 V38 M124 84 V64 M140 84 V48', 'M62 26 h14 v28 h-14 z M69 38 h.1'],
    },
};

type Day = { id: (typeof weekDayIds)[number]; item: string; extras: string[] };

// Each day shows one live feature from marketingData (never a copy of its own) plus related ones as small extras.
const DAYS: Day[] = [
    { id: 'mo', item: 'application', extras: ['member-number', 'account-invite'] },
    { id: 'di', item: 'recurring-events', extras: ['training-attendance', 'calendar', 'ical'] },
    { id: 'mi', item: 'meetings', extras: ['scheduling-poll', 'voting', 'minutes'] },
    { id: 'do', item: 'material-lending', extras: ['damage-report', 'keys'] },
    { id: 'fr', item: 'wifi-qr', extras: ['places', 'shift-planning', 'rides'] },
    { id: 'sa', item: 'members-no-account', extras: ['csv-import-export', 'member-search'] },
    { id: 'so', item: 'club-stats', extras: ['hours-report', 'exit-checklist', 'status-lifecycle'] },
];

function DayScene({ id }: { id: string }) {
    const scene = SCENES[id];
    return (
        <div aria-hidden="true" className="relative aspect-[8/5] w-full max-w-[15rem] text-foreground">
            <Draw paths={scene.people} viewBox="0 0 160 100" className="absolute inset-0 size-full" pathClassName="stroke-foreground stroke-[2]" />
            <Draw paths={scene.props} viewBox="0 0 160 100" className="absolute inset-0 size-full" pathClassName="stroke-accent stroke-[2]" delay={4} />
        </div>
    );
}

export default function WeekStage() {
    const { t } = useLanguage();
    const [active, setActive] = useState(0);
    const { ready } = useInView();
    const dayRefs = useRef<(HTMLLIElement | null)[]>([]);
    const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    // While a click-triggered scroll runs, the observer must not fight it by activating the days it passes.
    const locked = useRef(false);
    const unlockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const unlock = useCallback(() => {
        locked.current = false;
        clearTimeout(unlockTimer.current);
    }, []);

    useEffect(() => {
        if (!ready || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(
            (entries) => {
                if (locked.current) return;
                const hit = entries.find((entry) => entry.isIntersecting);
                if (hit) setActive(dayRefs.current.indexOf(hit.target as HTMLLIElement));
            },
            { rootMargin: '-40% 0px -50% 0px' },
        );
        dayRefs.current.forEach((el) => el && io.observe(el));

        // The observer only reports days crossing the reading line; above the first and below the last day nothing crosses.
        let frame = 0;
        const clampToEdges = () => {
            frame = 0;
            if (locked.current) return;
            const first = dayRefs.current[0];
            const last = dayRefs.current[DAYS.length - 1];
            if (!first || !last) return;
            if (first.getBoundingClientRect().top > window.innerHeight * 0.4) setActive(0);
            else if (last.getBoundingClientRect().bottom < window.innerHeight * 0.5) setActive(DAYS.length - 1);
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(clampToEdges);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('scrollend', unlock);
        return () => {
            io.disconnect();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('scrollend', unlock);
            cancelAnimationFrame(frame);
            clearTimeout(unlockTimer.current);
        };
    }, [ready, unlock]);

    const goTo = (index: number, focus = false) => {
        const next = (index + DAYS.length) % DAYS.length;
        setActive(next);
        locked.current = true;
        clearTimeout(unlockTimer.current);
        // `scrollend` releases the lock; the timeout covers browsers without it and scrolls that do not move.
        unlockTimer.current = setTimeout(unlock, 1500);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        dayRefs.current[next]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        if (focus) tabRefs.current[next]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent, index: number) => {
        const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
        if (step) {
            event.preventDefault();
            goTo(index + step, true);
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            goTo(event.key === 'Home' ? 0 : DAYS.length - 1, true);
        }
    };

    return (
        <section id="woche" aria-labelledby="woche-title" className="scroll-mt-20 border-y border-border bg-muted/30">
            <div className={MK_SECTION}>
                <SectionHead id="woche-title" title={`${t('mk.week.title.before')} ${t('mk.week.title.marked')}`} intro={t('mk.week.intro')} />

                <nav aria-label={t('mk.week.nav')} className="sticky top-16 z-40 -mx-4 mt-10 border-b border-border bg-background px-4 py-3 sm:mx-0 sm:rounded-xl sm:border sm:px-3">
                    <ul className="grid grid-cols-7 gap-1.5">
                        {DAYS.map((day, index) => (
                            <li key={day.id}>
                                <a
                                    ref={(el) => {
                                        tabRefs.current[index] = el;
                                    }}
                                    href={`#woche-${day.id}`}
                                    aria-current={active === index ? 'step' : undefined}
                                    aria-label={t(`mk.week.${day.id}.name`)}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        goTo(index);
                                    }}
                                    onKeyDown={(event) => onKeyDown(event, index)}
                                    className={`flex min-h-11 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                        active === index ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {t(`mk.week.${day.id}.short`)}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <ol className={`mt-8 space-y-4 ${ready ? 'mk-week-js' : ''}`}>
                    {DAYS.map((day, index) => {
                        const item = getItem(day.item);
                        return (
                            <li
                                key={day.id}
                                id={`woche-${day.id}`}
                                ref={(el) => {
                                    dayRefs.current[index] = el;
                                }}
                                className={`mk-day scroll-mt-40 ${active === index ? 'is-active' : ''}`}
                            >
                                <StatusSketch status={item.status} bodyClassName="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-center lg:gap-10">
                                    <div className="flex items-center justify-center rounded-xl bg-muted/60 p-5 lg:self-stretch">
                                        <DayScene id={day.id} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-medium text-muted-foreground">{t(`mk.week.${day.id}.name`)}</h3>
                                        <p className="mt-1 text-xl font-medium leading-snug text-foreground sm:text-2xl sm:leading-snug">{t(`mk.week.${day.id}.story`)}</p>
                                        <p className="mt-4 font-medium text-foreground">{t(`${item.i18nKey}.title`)}</p>
                                        <p className="mt-1 text-muted-foreground">{t(`${item.i18nKey}.body`)}</p>
                                        <ul className="mt-4 flex flex-wrap gap-2">
                                            {day.extras.map((extraId) => {
                                                const extra = getItem(extraId);
                                                return (
                                                    <li
                                                        key={extraId}
                                                        className={`rounded-md border px-2.5 py-1 text-sm ${
                                                            extra.status === 'live'
                                                                ? 'border-solid border-border bg-background text-foreground'
                                                                : 'border-dashed border-muted-foreground text-muted-foreground'
                                                        }`}
                                                    >
                                                        {t(`${extra.i18nKey}.title`)}
                                                        {extra.status === 'soon' && ` · ${t('mk.status.soon')}`}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                </StatusSketch>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
