'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Boxes,
    Building2,
    CalendarDays,
    ChevronDown,
    Clock,
    FileCheck,
    GraduationCap,
    Handshake,
    IdCard,
    LayoutGrid,
    MapPin,
    Megaphone,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
} from 'lucide-react';

import Reveal from '@/components/Reveal';
import { useLanguage } from '@/contexts/LanguageContext';
import { supportedLanguages } from '@/contexts/supportedLanguages';

const OVERVIEW_CARDS = [
    { slug: 'mitglieder', icon: Users },
    { slug: 'kalender', icon: CalendarDays },
    { slug: 'verfuegbarkeit', icon: Clock },
    { slug: 'material', icon: Boxes },
    { slug: 'standorte', icon: MapPin },
    { slug: 'vereinsinfo', icon: Building2 },
] as const;

const PERSONA_CARDS = [
    { slug: 'mitglieder', icon: UserCheck },
    { slug: 'vorstand', icon: ShieldCheck },
    { slug: 'abteilungsleitung', icon: GraduationCap },
    { slug: 'erziehungsberechtigte', icon: Users },
    { slug: 'externe', icon: Handshake },
] as const;

const STATS = [
    { id: 'modules', value: OVERVIEW_CARDS.length },
    { id: 'languages', value: supportedLanguages.length },
    { id: 'platforms', value: 2 },
    { id: 'roles', value: PERSONA_CARDS.length },
] as const;

const NEXT_CARDS = [
    { slug: 'zeiterfassung', icon: Clock },
    { slug: 'mitgliedsausweis', icon: IdCard },
    { slug: 'dsgvo', icon: FileCheck },
    { slug: 'kommunikation', icon: Megaphone },
] as const;

/** Counts 0 -> `to` once on mount. */
function CountUp({ to }: { to: number }) {
    const [n, setN] = useState(0);
    useEffect(() => {
        const start = performance.now();
        let raf = requestAnimationFrame(function tick(now) {
            const p = Math.min((now - start) / 1200, 1);
            setN(Math.round(to * (1 - (1 - p) ** 3)));
            if (p < 1) raf = requestAnimationFrame(tick);
        });
        return () => cancelAnimationFrame(raf);
    }, [to]);
    return <>{n}</>;
}

export default function HomepagePageContent() {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);
    const [activeStat, setActiveStat] = useState<(typeof STATS)[number]['id'] | null>(null);

    useEffect(() => {
        // Triggers the CSS fade-in transition below on next paint after mount --
        // not syncing with an external system, so this is the documented
        // "trigger an animation" exception to react-hooks/set-state-in-effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsVisible(true);
    }, []);

    return (
        <div>
            {/* Hero */}
            <section className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8">
                <div className="relative overflow-hidden rounded-3xl bg-primary/10 px-6 pb-12 pt-14 text-center sm:px-12 sm:pt-20 lg:pt-24">
                <div aria-hidden className="animate-drift absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/15" />
                <div aria-hidden className="animate-drift absolute -bottom-20 -left-12 h-52 w-52 rounded-full bg-accent/15 [animation-delay:-7s]" />
                <div className="relative">
                <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
                        {t('home.hero-title')}
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                        {t('home.hero-subtitle')}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/contact#beta"
                            className="btn-shimmer rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:brightness-110"
                        >
                            {t('home.cta-primary')}
                        </Link>
                        <a
                            href="#overview"
                            className="rounded-xl border border-border px-6 py-3 font-semibold text-foreground transition hover:bg-muted"
                        >
                            {t('home.cta-secondary')}
                        </a>
                    </div>
                </div>
                </div>
                </div>
            </section>

            {/* In-page navigation */}
            <nav
                aria-label="Section navigation"
                className="sticky top-16 z-30 border-y border-border bg-background/90 backdrop-blur-md"
            >
                <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 py-3 text-sm font-medium text-muted-foreground sm:px-6 lg:px-8">
                    <a href="#overview" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
                        {t('home.pagenav-overview')}
                    </a>
                    <a href="#fuer-wen" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
                        {t('home.pagenav-fuer-wen')}
                    </a>
                    <a href="#roadmap-teaser" className="shrink-0 whitespace-nowrap transition-colors hover:text-foreground">
                        {t('home.pagenav-next')}
                    </a>
                </div>
            </nav>


            {/* Stats -- click one to see what it means */}
            <Reveal>
                <div className="mx-auto max-w-5xl px-4 pt-14 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                        {STATS.map(({ id, value }) => {
                            const active = activeStat === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    aria-expanded={active}
                                    onClick={() => setActiveStat(active ? null : id)}
                                    className={`rounded-2xl border px-3 py-4 transition hover:-translate-y-0.5 ${active ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted/60'}`}
                                >
                                    <div className="bg-gradient-to-br from-primary to-accent bg-clip-text text-4xl font-extrabold text-transparent">
                                        <CountUp to={value} />
                                    </div>
                                    <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                                        {t(`home.stat.${id}`)}
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${active ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {activeStat && (
                        <p key={activeStat} className="animate-fade mx-auto mt-4 max-w-2xl rounded-2xl border border-border bg-card px-5 py-4 text-center text-sm text-muted-foreground">
                            {t(`home.stat.${activeStat}.desc`)}
                        </p>
                    )}
                </div>
            </Reveal>

            {/* Functionality overview */}
            <section id="overview" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <Reveal className="mx-auto max-w-2xl text-center"><div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('home.overview-eyebrow')}</span>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('home.overview-title')}</h2>
                    <p className="mt-4 text-muted-foreground">{t('home.overview-subtitle')}</p>
                </div>
                </Reveal>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {OVERVIEW_CARDS.map(({ slug, icon: Icon }, i) => (
                        <Reveal key={slug} delay={i * 80} className="h-full">
                        <div className="group h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                            <div className="inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-2.5 transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-3 font-bold text-card-foreground">{t(`home.card.${slug}.title`)}</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.card.${slug}.body`)}</p>
                        </div>
                        </Reveal>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <Link
                        href="/features"
                        className="inline-flex items-center gap-1.5 font-semibold text-primary hover:brightness-110"
                    >
                        <LayoutGrid className="h-4 w-4" />
                        {t('home.overview-cta')}
                    </Link>
                </div>
            </section>

            {/* Target audience / "für wen" */}
            <section id="fuer-wen" className="scroll-mt-28 border-y border-border bg-muted/30 py-16 sm:py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <Reveal className="mx-auto max-w-2xl text-center"><div>
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('home.personas-eyebrow')}</span>
                        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('home.personas-title')}</h2>
                        <p className="mt-4 text-muted-foreground">{t('home.personas-subtitle')}</p>
                    </div>
                    </Reveal>

                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {PERSONA_CARDS.map(({ slug, icon: Icon }, i) => (
                            <Reveal key={slug} delay={i * 80} className="h-full">
                            <div className="group h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                                <div className="inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 p-2.5 transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="mt-3 font-bold text-card-foreground">{t(`home.persona.${slug}.title`)}</h3>
                                <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.persona.${slug}.body`)}</p>
                            </div>
                        </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* "Was als Nächstes kommt" teaser */}
            <section id="roadmap-teaser" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <Reveal className="mx-auto max-w-2xl text-center"><div>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('home.next-eyebrow')}</span>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('home.next-title')}</h2>
                    <p className="mt-4 text-muted-foreground">{t('home.next-subtitle')}</p>
                </div>
                </Reveal>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {NEXT_CARDS.map(({ slug, icon: Icon }, i) => (
                        <Reveal key={slug} delay={i * 80} className="h-full">
                        <div className="h-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
                            <div className="inline-flex rounded-xl bg-primary/15 p-2.5">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-3 font-bold text-card-foreground">{t(`home.next.${slug}.title`)}</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.next.${slug}.body`)}</p>
                        </div>
                    </Reveal>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <Link
                        href="/roadmap"
                        className="inline-flex items-center gap-1.5 font-semibold text-primary hover:brightness-110"
                    >
                        <Sparkles className="h-4 w-4" />
                        {t('home.next-cta')}
                    </Link>
                </div>
            </section>

            {/* Closing CTA */}
            <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
                <div className="rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
                    <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('home.final-cta-title')}</h2>
                    <p className="mx-auto mt-3 max-w-md opacity-90">{t('home.final-cta-body')}</p>
                    <Link
                        href="/contact#beta"
                        className="btn-shimmer mt-7 inline-block rounded-xl bg-background px-7 py-3 font-semibold text-foreground transition hover:brightness-95"
                    >
                        {t('home.cta-primary')}
                    </Link>
                </div>
            </section>
        </div>
    );
}
