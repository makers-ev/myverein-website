'use client';

import { Code2, ExternalLink, Github, Info, Users } from 'lucide-react';
import Image from 'next/image';

import { useLanguage } from '@/contexts/LanguageContext';

const DEVELOPERS = [
    { name: 'Eyüp Kadeh', github: 'Eyuep42' },
    { name: 'Luca-Pascal Junge', github: 'lpj-app' },
];

function SectionHeading({ icon: Icon, children }: { icon: typeof Info; children: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
            </div>
            <h2 className="font-semibold text-foreground">{children}</h2>
        </div>
    );
}

export default function AboutPageContent() {
    const { t } = useLanguage();

    return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('about.title')}</h1>

            <section className="mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <SectionHeading icon={Info}>{t('about.what.title')}</SectionHeading>
                <p className="mt-3 text-sm text-muted-foreground">{t('about.what.body')}</p>
            </section>

            <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <SectionHeading icon={Users}>{t('about.makers.title')}</SectionHeading>
                <p className="mt-3 text-sm text-muted-foreground">{t('about.makers.body')}</p>
                <a
                    href="https://the-makers.space"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:brightness-110"
                >
                    the-makers.space
                    <ExternalLink className="h-4 w-4" />
                </a>
            </section>

            <section className="mt-4">
                <SectionHeading icon={Code2}>{t('about.developers.title')}</SectionHeading>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {DEVELOPERS.map((dev) => (
                        <div key={dev.github} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                            <Image
                                src={`/about/${dev.github.toLowerCase()}.jpg`}
                                alt={dev.name}
                                width={48}
                                height={48}
                                unoptimized // /_next/image fetches via a host proxy.ts rejects
                                className="h-12 w-12 shrink-0 rounded-full object-cover"
                            />
                            <div className="min-w-0">
                                <p className="font-semibold text-foreground">{dev.name}</p>
                                <p className="text-sm text-muted-foreground">{t('about.developers.role')}</p>
                                <a
                                    href={`https://github.com/${dev.github}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:brightness-110"
                                >
                                    <Github className="h-4 w-4" />
                                    {dev.github}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
