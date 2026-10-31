'use client';

import { ArrowUpRight } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { docsUrl } from '@/lib/docs';

import { Marker, PaperCard } from './Sketch';

const LINKS: { id: 'setup' | 'handbook' | 'guides'; path: string }[] = [
    { id: 'setup', path: 'verein-aufsetzen' },
    { id: 'handbook', path: 'handbuch' },
    { id: 'guides', path: 'anleitungen' },
];

/** Prominent pointer to the documentation portal (German pages; links open in a new tab). */
export default function HelpSection() {
    const { t } = useLanguage();

    return (
        <section id="hilfe" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="mk-help-title">
            <h2 id="mk-help-title" className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {t('mk.help.title.pre')} <Marker>{t('mk.help.title.mark')}</Marker>
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t('mk.help.intro')}</p>

            <ul className="mt-8 grid gap-6 md:grid-cols-3">
                {LINKS.map(({ id, path }, i) => (
                    <li key={id}>
                        <PaperCard tilt={i === 1 ? 'r' : 'l'} tape className="h-full">
                            <h3 className="text-lg font-bold text-foreground">{t(`mk.help.${id}.title`)}</h3>
                            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`mk.help.${id}.body`)}</p>
                            <a
                                href={docsUrl(path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t(`mk.help.${id}.label`)}
                                className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                {t(`mk.help.${id}.cta`)}
                                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            </a>
                        </PaperCard>
                    </li>
                ))}
            </ul>

            <p className="mk-note mt-6 text-sm text-muted-foreground">{t('mk.help.note')}</p>
        </section>
    );
}
