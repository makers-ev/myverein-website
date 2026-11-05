'use client';

import { Code2, ExternalLink, Github, Info, Users } from 'lucide-react';
import Image from 'next/image';

import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';

const DEVELOPERS = [
    { name: 'Eyüp Kadeh', github: 'Eyuep42' },
    { name: 'Luca-Pascal Junge', github: 'lpj-app' },
];

function SectionHeading({ icon: Icon, children }: { icon: typeof Info; children: string }) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">{children}</h2>
        </div>
    );
}

export default function AboutPageContent() {
    const { t } = useLanguage();

    return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
            <PageHeader title={t('about.title')} />

            <section className="mt-10 rounded-2xl border border-border bg-card p-6">
                <SectionHeading icon={Info}>{t('about.what.title')}</SectionHeading>
                <p className="mt-3 leading-relaxed text-muted-foreground">{t('about.what.body')}</p>
            </section>

            <section className="mt-4 rounded-2xl border border-border bg-card p-6">
                <SectionHeading icon={Users}>{t('about.makers.title')}</SectionHeading>
                <p className="mt-3 leading-relaxed text-muted-foreground">{t('about.makers.body')}</p>
                <a
                    href="https://the-makers.space"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                    the-makers.space
                    <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                </a>
            </section>

            <section className="mt-10">
                <SectionHeading icon={Code2}>{t('about.developers.title')}</SectionHeading>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {DEVELOPERS.map((dev) => (
                        <div key={dev.github} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5">
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
                                    className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    <Github className="h-4 w-4" strokeWidth={1.5} />
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
