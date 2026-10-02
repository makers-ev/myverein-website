'use client';

import Link from 'next/link';
import {
    Boxes,
    Building2,
    CalendarDays,
    Clock,
    GraduationCap,
    Handshake,
    KeyRound,
    LayoutGrid,
    MapPin,
    ShieldCheck,
    UserCheck,
    Users,
    Wifi,
    Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';

import Reveal from '@/components/Reveal';
import { useLanguage } from '@/contexts/LanguageContext';

// `span` is the tile's column span in a 6-column grid (lg and up).
const OVERVIEW_CARDS = [
    { slug: 'mitglieder', icon: Users, span: 'lg:col-span-4', big: true },
    { slug: 'kalender', icon: CalendarDays, span: 'lg:col-span-2' },
    { slug: 'verfuegbarkeit', icon: Clock, span: 'lg:col-span-2' },
    { slug: 'material', icon: Boxes, span: 'lg:col-span-2' },
    { slug: 'standorte', icon: MapPin, span: 'lg:col-span-2' },
    { slug: 'vereinsinfo', icon: Building2, span: 'sm:col-span-2 lg:col-span-6', big: true },
] as const;

const PERSONA_CARDS = [
    { slug: 'mitglieder', icon: UserCheck, span: 'lg:col-span-2' },
    { slug: 'vorstand', icon: ShieldCheck, span: 'lg:col-span-4', big: true },
    { slug: 'abteilungsleitung', icon: GraduationCap, span: 'lg:col-span-2' },
    { slug: 'erziehungsberechtigte', icon: Users, span: 'lg:col-span-2' },
    { slug: 'externe', icon: Handshake, span: 'sm:col-span-2 lg:col-span-2' },
] as const;

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function MockTile({ className = '', label, icon, children }: { className?: string; label: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                {icon}
                {label}
            </div>
            {children}
        </div>
    );
}

function Chip({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'primary' | 'accent' }) {
    const tones = {
        plain: 'border-border bg-card text-foreground',
        primary: 'border-primary/30 bg-primary/10 text-foreground',
        accent: 'border-accent/40 bg-accent/10 text-foreground',
    };
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

function HeroMock() {
    const { t } = useLanguage();
    const icon = 'h-3.5 w-3.5 text-primary';
    const members = [
        { name: 'Jana Keller', role: 'role-board', tone: 'primary' },
        { name: 'Tim Brandt', role: 'role-lead', tone: 'accent' },
        { name: 'Mehmet Yilmaz', role: 'role-member', tone: 'plain' },
    ] as const;
    return (
        <>
            <p className="sr-only">{t('home.mock.sr')}</p>
            <div aria-hidden className="grid grid-cols-2 gap-3">
                <MockTile className="col-span-2" label={t('home.mock.event')} icon={<CalendarDays className={icon} />}>
                    <div className="mt-3 text-base font-bold text-foreground">{t('home.mock.event-title')}</div>
                    <div className="text-sm tabular-nums text-muted-foreground">{t('home.mock.event-when')}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Chip tone="primary">{t('home.mock.rsvp-yes')} · Jana</Chip>
                        <Chip tone="primary">{t('home.mock.rsvp-yes')} · Tim</Chip>
                        <Chip>{t('home.mock.rsvp-maybe')} · Mehmet</Chip>
                    </div>
                </MockTile>

                <MockTile className="row-span-2" label={t('home.mock.members')} icon={<Users className={icon} />}>
                    <ul className="mt-3 space-y-3">
                        {members.map((m) => (
                            <li key={m.name} className="text-sm">
                                <div className="font-medium text-foreground">{m.name}</div>
                                <div className="mt-1">
                                    <Chip tone={m.tone}>{t(`home.mock.${m.role}`)}</Chip>
                                </div>
                            </li>
                        ))}
                    </ul>
                </MockTile>

                <MockTile label={t('home.mock.location')} icon={<MapPin className={icon} />}>
                    <div className="mt-3 text-sm font-bold text-foreground">{t('home.mock.location-name')}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <KeyRound className="h-3.5 w-3.5" />
                        {t('home.mock.keyholder')}: Tim Brandt
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wifi className="h-3.5 w-3.5" />
                        Verein-Gast
                    </div>
                </MockTile>

                <MockTile label={t('home.mock.material')} icon={<Boxes className={icon} />}>
                    <div className="mt-3 text-sm font-bold text-foreground">{t('home.mock.item')}</div>
                    <div className="text-xs tabular-nums text-muted-foreground">{t('home.mock.loaned')}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-accent">
                        <Wrench className="h-3.5 w-3.5" />
                        {t('home.mock.maintenance')}
                    </div>
                </MockTile>
            </div>
        </>
    );
}

export default function HomepagePageContent() {
    const { t } = useLanguage();

    return (
        <div>
            {/* Hero */}
            <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
                <div className="lg:col-span-5">
                    <h1 className="text-[clamp(2.25rem,6vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-foreground">
                        {t('home.hero-title')}
                    </h1>
                    <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
                        {t('home.hero-subtitle')}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link
                            href="/contact#beta"
                            className={`rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:brightness-110 ${focusRing}`}
                        >
                            {t('home.cta-primary')}
                        </Link>
                        <a
                            href="#overview"
                            className={`rounded-xl border border-border px-6 py-3 font-bold text-foreground transition hover:bg-muted ${focusRing}`}
                        >
                            {t('home.cta-secondary')}
                        </a>
                    </div>
                </div>
                <div className="lg:col-span-7">
                    <HeroMock />
                </div>
            </section>

            {/* Modules bento */}
            <section id="overview" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
                <Reveal className="max-w-2xl">
                    <h2 className="text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold leading-tight tracking-tight text-foreground">{t('home.overview-title')}</h2>
                    <p className="mt-3 text-muted-foreground">{t('home.overview-subtitle')}</p>
                </Reveal>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    {OVERVIEW_CARDS.map((card) => {
                        const { slug, icon: Icon, span } = card;
                        const big = 'big' in card;
                        return (
                            <div key={slug} className={`rounded-2xl border border-border p-5 sm:p-6 ${big ? 'bg-muted' : 'bg-card'} ${span}`}>
                                <Icon className="h-5 w-5 text-primary" aria-hidden />
                                <h3 className={`mt-4 font-bold text-card-foreground ${big ? 'text-xl' : 'text-base'}`}>{t(`home.card.${slug}.title`)}</h3>
                                <p className={`mt-2 text-sm leading-relaxed ${big ? 'max-w-xl text-foreground/80' : 'text-muted-foreground'}`}>{t(`home.card.${slug}.body`)}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6">
                    <Link
                        href="/features"
                        className={`inline-flex items-center gap-1.5 rounded font-bold text-primary hover:brightness-110 ${focusRing}`}
                    >
                        <LayoutGrid className="h-4 w-4" aria-hidden />
                        {t('home.overview-cta')}
                    </Link>
                </div>
            </section>

            {/* Personas bento */}
            <section id="fuer-wen" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
                <Reveal className="max-w-2xl">
                    <h2 className="text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold leading-tight tracking-tight text-foreground">{t('home.personas-title')}</h2>
                    <p className="mt-3 text-muted-foreground">{t('home.personas-subtitle')}</p>
                </Reveal>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    {PERSONA_CARDS.map((card) => {
                        const { slug, icon: Icon, span } = card;
                        const big = 'big' in card;
                        return (
                            <div key={slug} className={`rounded-2xl border border-border p-5 sm:p-6 ${big ? 'bg-muted' : 'bg-card'} ${span}`}>
                                <Icon className="h-5 w-5 text-primary" aria-hidden />
                                <h3 className={`mt-4 font-bold text-card-foreground ${big ? 'text-xl' : 'text-base'}`}>{t(`home.persona.${slug}.title`)}</h3>
                                <p className={`mt-2 text-sm leading-relaxed ${big ? 'max-w-xl text-foreground/80' : 'text-muted-foreground'}`}>{t(`home.persona.${slug}.body`)}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Closing CTA */}
            <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
                <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-muted p-6 sm:flex-row sm:items-center sm:p-8">
                    <div className="max-w-xl">
                        <h2 className="text-[clamp(1.5rem,3vw,1.875rem)] font-extrabold leading-tight tracking-tight text-foreground">{t('home.final-cta-title')}</h2>
                        <p className="mt-2 text-foreground/80">{t('home.final-cta-body')}</p>
                    </div>
                    <Link
                        href="/contact#beta"
                        className={`shrink-0 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:brightness-110 ${focusRing}`}
                    >
                        {t('home.cta-primary')}
                    </Link>
                </div>
            </section>
        </div>
    );
}
