'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import GroupPhoto from './GroupPhoto';
import { rolePointCount, roles, roleStatus, type Role } from './marketingData';
import { MK_SECTION, SectionHead, StatusBadge } from './Sketch';

const POINTS = Array.from({ length: rolePointCount }, (_, i) => i + 1);

export default function RolePicker() {
    const { t } = useLanguage();
    const [role, setRole] = useState<Role>('mitglied');
    const status = roleStatus(role);
    const planned = status === 'soon';

    return (
        <section id="fuer-wen" aria-labelledby="fuer-wen-title" className={`scroll-mt-20 ${MK_SECTION}`}>
            <SectionHead id="fuer-wen-title" title={`${t('mk.roles.title.before')} ${t('mk.roles.title.marked')}`} intro={t('mk.roles.intro')} />

            <div className="mt-12 rounded-3xl border border-border bg-muted/50 p-4 sm:p-8">
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
                            className={`min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                isSoon ? 'border-dashed' : 'border-solid'
                            } ${
                                role === r
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-card text-foreground hover:bg-muted'
                            }`}
                        >
                            {t(`mk.role.${r}.name`)}
                            {isSoon && <span className="ml-1 font-normal opacity-80">· {t('mk.roles.soonShort')}</span>}
                        </button>
                    );
                })}
            </div>

            <div
                aria-live="polite"
                className={`mt-4 rounded-2xl border p-6 sm:p-8 ${planned ? 'border-dashed border-muted-foreground bg-transparent' : 'border-solid border-border bg-card shadow-xs'}`}
            >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <h3 className="text-xl font-semibold text-foreground">{t(`mk.role.${role}.name`)}</h3>
                    <StatusBadge status={status} />
                </div>
                <p className="mt-2 max-w-2xl text-muted-foreground">{t(`mk.roles.${role}.lead`)}</p>
                <ul className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-2">
                    {POINTS.map((n) => (
                        <li key={n} className="flex gap-3 text-foreground">
                            <span aria-hidden="true" className={`mt-2 size-2 shrink-0 rounded-full ${planned ? 'border border-dashed border-muted-foreground' : 'bg-success'}`} />
                            {t(`mk.roles.${role}.p${n}`)}
                        </li>
                    ))}
                </ul>
                <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t('mk.roles.notLabel')}</span> {t(`mk.roles.${role}.not`)}
                </p>
            </div>

            <p className="mt-6 max-w-2xl text-lg text-foreground">{t('mk.roles.deny')}</p>
        </section>
    );
}
