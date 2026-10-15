'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import { getItem, quizToolIds } from './marketingData';
import Person, { type PersonPose } from './Person';
import { Marker, PaperCard, StatusBadge } from './Sketch';

/** Each tool lists the items that replace (parts of) it. Status always comes from marketingData, never from here. */
const TOOLS: { id: (typeof quizToolIds)[number]; items: string[] }[] = [
    { id: 'excel', items: ['csv-import-export', 'members-no-account'] },
    { id: 'whatsapp', items: ['calendar', 'broadcast'] },
    { id: 'doodle', items: ['scheduling-poll'] },
    { id: 'attendance', items: ['meetings', 'training-attendance'] },
    { id: 'notes', items: ['bulletin-board', 'places'] },
];

// The figure relaxes with every tool that is fully replaced today (not merely ticked): weighed down, then upright, waving, sitting back.
const POSES: PersonPose[] = ['carry', 'shrug', 'stand', 'stand', 'wave', 'sit'];

export default function ToolQuiz() {
    const { t } = useLanguage();
    const [checked, setChecked] = useState<string[]>([]);

    const toggle = (id: string) => setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const picked = TOOLS.filter((tool) => checked.includes(tool.id));
    // A tool counts as fully replaced today only when none of its items is still planned.
    const nowCount = picked.filter((tool) => tool.items.every((id) => getItem(id).status === 'live')).length;
    const soonCount = picked.length - nowCount;

    return (
        <section id="werkzeuge" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="mk-quiz-title">
            <h2 id="mk-quiz-title" className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {t('mk.quiz.title.pre')} <Marker>{t('mk.quiz.title.mark')}</Marker>
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t('mk.quiz.intro')}</p>

            <div className="mt-10 grid gap-8 lg:grid-cols-[auto_1fr_1.2fr] lg:items-start">
                <div className="mx-auto" role="img" aria-label={t('mk.quiz.figure.alt')}>
                    <Person pose={POSES[nowCount]} tone={nowCount === 5 ? 3 : 2} size={150} />
                </div>

                <fieldset className="space-y-3">
                    <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t('mk.quiz.legend')}</legend>
                    {TOOLS.map((tool) => (
                        <label
                            key={tool.id}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-4 py-2 text-card-foreground transition hover:bg-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
                        >
                            <input
                                type="checkbox"
                                checked={checked.includes(tool.id)}
                                onChange={() => toggle(tool.id)}
                                className="size-5 shrink-0 accent-primary"
                            />
                            <span className="font-medium">{t(`mk.quiz.tool.${tool.id}`)}</span>
                        </label>
                    ))}
                </fieldset>

                <div aria-live="polite" className="min-h-40">
                    {picked.length === 0 ? (
                        <p className="mk-note text-muted-foreground">{t('mk.quiz.empty')}</p>
                    ) : (
                        <PaperCard tilt="r" tape>
                            <p className="text-xl font-extrabold text-foreground">
                                {nowCount > 0 ? t('mk.quiz.result', { n: nowCount, total: picked.length }) : t('mk.quiz.none')}
                            </p>
                            {soonCount > 0 && <p className="mt-1 text-sm text-muted-foreground">{t('mk.quiz.soon', { n: soonCount })}</p>}
                            <ul className="mt-4 space-y-4">
                                {picked.map((tool) => (
                                    <li key={tool.id}>
                                        <p className="font-bold text-foreground">{t(`mk.quiz.tool.${tool.id}`)}</p>
                                        <ul className="mt-2 space-y-2">
                                            {tool.items.map((id) => {
                                                const item = getItem(id);
                                                return (
                                                    <li key={id} className="flex flex-wrap items-center gap-2 text-sm">
                                                        <StatusBadge status={item.status} />
                                                        <span className="text-foreground">{t(`${item.i18nKey}.title`)}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-4 text-xs text-muted-foreground">{t('mk.quiz.privacy')}</p>
                        </PaperCard>
                    )}
                </div>
            </div>
        </section>
    );
}
