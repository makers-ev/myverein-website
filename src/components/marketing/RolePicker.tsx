'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import GroupPhoto from './GroupPhoto';
import { roles, roleStatus, roleWave, type Role } from './marketingData';
import { Marker, StatusBadge } from './Sketch';

const POINTS = [1, 2, 3, 4];

export default function RolePicker() {
    const { t } = useLanguage();
    const [role, setRole] = useState<Role>('mitglied');
    const status = roleStatus(role);
    const wave = roleWave(role);
    const planned = status === 'soon';

    return (
        <section id="fuer-wen" aria-labelledby="fuer-wen-title" className="scroll-mt-20 px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <h2 id="fuer-wen-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {t('mk.roles.title.before')} <Marker>{t('mk.roles.title.marked')}</Marker>
                </h2>
                <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t('mk.roles.intro')}</p>

                <div className="mt-8 rounded-md border border-border bg-card p-3 sm:p-6">
                    <GroupPhoto activeRole={role} />
                </div>

                <div role="group" aria-label={t('mk.roles.pick')} className="mt-6 flex flex-wrap gap-2">
                    {roles.map((r) => {
                        const isSoon = roleStatus(r) === 'soon';
                        return (
                            <button
                                key={r}
                                type="button"
                                aria-pressed={role === r}
                                onClick={() => setRole(r)}
                                className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                    isSoon ? 'border-dashed' : 'border-solid'
                                } ${
                                    role === r
                                        ? 'border-foreground/70 bg-accent text-accent-foreground'
                                        : 'border-border bg-card text-foreground hover:bg-muted'
                                }`}
                            >
                                {t(`mk.role.${r}.name`)}
                                {isSoon && <span className="ml-1 font-normal">· {t('mk.roles.soonShort', { wave: roleWave(r) ?? 0 })}</span>}
                            </button>
                        );
                    })}
                </div>

                <div
                    aria-live="polite"
                    className={`mt-6 rounded-md border-2 p-5 ${planned ? 'border-dashed border-muted-foreground bg-transparent' : 'border-solid border-foreground/70 bg-card'}`}
                >
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold text-foreground">{t(`mk.role.${role}.name`)}</h3>
                        <StatusBadge status={status} wave={wave} />
                    </div>
                    <p className="mt-2 text-muted-foreground">{t(`mk.roles.${role}.lead`)}</p>
                    <ul className="mt-4 space-y-2">
                        {POINTS.map((n) => (
                            <li key={n} className="flex gap-3 text-foreground">
                                <span aria-hidden="true" className={`mt-2 size-2 shrink-0 rounded-full ${planned ? 'border border-dashed border-muted-foreground' : 'bg-success'}`} />
                                {t(`mk.roles.${role}.p${n}`)}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 border-t border-dashed border-border pt-4 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{t('mk.roles.notLabel')}</span> {t(`mk.roles.${role}.not`)}
                    </p>
                </div>

                <p className="mk-note mt-6 text-lg text-foreground">{t('mk.roles.deny')}</p>
            </div>
        </section>
    );
}
