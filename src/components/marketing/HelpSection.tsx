'use client';

import { ArrowUpRight } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { docsUrl } from '@/lib/docs';

import { MK_SECTION, PaperCard, SectionHead } from './Sketch';

const LINKS: { id: 'setup' | 'handbook' | 'guides'; path: string }[] = [
    { id: 'setup', path: 'verein-aufsetzen' },
    { id: 'handbook', path: 'handbuch' },
    { id: 'guides', path: 'anleitungen' },
];

/** Prominent pointer to the documentation portal (German pages; links open in a new tab). */
export default function HelpSection() {
    const { t } = useLanguage();

    return (
        <section id="hilfe" className={MK_SECTION} aria-labelledby="mk-help-title">
            <SectionHead id="mk-help-title" title={`${t('mk.help.title.pre')} ${t('mk.help.title.mark')}`} intro={t('mk.help.intro')} />

            <ul className="mt-12 grid gap-4 md:grid-cols-3">
                {LINKS.map(({ id, path }) => (
                    <li key={id}>
                        <PaperCard className="flex h-full flex-col">
                            <h3 className="text-lg font-semibold text-foreground">{t(`mk.help.${id}.title`)}</h3>
                            <p className="mt-2 flex-1 leading-relaxed text-muted-foreground">{t(`mk.help.${id}.body`)}</p>
                            <a
                                href={docsUrl(path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t(`mk.help.${id}.label`)}
                                className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                {t(`mk.help.${id}.cta`)}
                                <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                            </a>
                        </PaperCard>
                    </li>
                ))}
            </ul>

            <p className="mt-6 text-sm text-muted-foreground">{t('mk.help.note')}</p>
        </section>
    );
}
