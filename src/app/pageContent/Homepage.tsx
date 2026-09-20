'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Boxes,
    Building2,
    CalendarDays,
    Clock,
    FileCheck,
    GraduationCap,
    Handshake,
    IdCard,
    MapPin,
    Megaphone,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

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

const NEXT_CARDS = [
    { slug: 'zeiterfassung', icon: Clock },
    { slug: 'mitgliedsausweis', icon: IdCard },
    { slug: 'dsgvo', icon: FileCheck },
    { slug: 'kommunikation', icon: Megaphone },
] as const;

export default function HomepagePageContent() {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

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
            <section className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8 lg:pt-28">
                <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                        {t('home.hero-title')}
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                        {t('home.hero-subtitle')}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/contact#beta"
                            className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110"
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

            {/* Functionality overview */}
            <section id="overview" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('home.overview-eyebrow')}</span>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('home.overview-title')}</h2>
                    <p className="mt-4 text-muted-foreground">{t('home.overview-subtitle')}</p>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {OVERVIEW_CARDS.map(({ slug, icon: Icon }) => (
                        <div key={slug} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                            <div className="inline-flex rounded-xl bg-primary/10 p-2.5">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-3 font-bold text-card-foreground">{t(`home.card.${slug}.title`)}</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.card.${slug}.body`)}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Target audience / "für wen" */}
            <section id="fuer-wen" className="scroll-mt-28 border-y border-border bg-muted/30 py-16 sm:py-20">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('home.personas-eyebrow')}</span>
                        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('home.personas-title')}</h2>
                        <p className="mt-4 text-muted-foreground">{t('home.personas-subtitle')}</p>
                    </div>

                    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        {PERSONA_CARDS.map(({ slug, icon: Icon }) => (
                            <div key={slug} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                <div className="inline-flex rounded-xl bg-primary/10 p-2.5">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="mt-3 font-bold text-card-foreground">{t(`home.persona.${slug}.title`)}</h3>
                                <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.persona.${slug}.body`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* "Was als Nächstes kommt" teaser */}
            <section id="roadmap-teaser" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('home.next-eyebrow')}</span>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('home.next-title')}</h2>
                    <p className="mt-4 text-muted-foreground">{t('home.next-subtitle')}</p>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {NEXT_CARDS.map(({ slug, icon: Icon }) => (
                        <div key={slug} className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
                            <div className="inline-flex rounded-xl bg-primary/15 p-2.5">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="mt-3 font-bold text-card-foreground">{t(`home.next.${slug}.title`)}</h3>
                            <p className="mt-1.5 text-sm text-muted-foreground">{t(`home.next.${slug}.body`)}</p>
                        </div>
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
            <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{t('home.final-cta-title')}</h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t('home.final-cta-body')}</p>
                <Link
                    href="/contact#beta"
                    className="mt-7 inline-block rounded-xl bg-primary px-7 py-3 font-semibold text-primary-foreground transition hover:brightness-110"
                >
                    {t('home.cta-primary')}
                </Link>
            </section>
        </div>
    );
}
