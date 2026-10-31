'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { type WardClub, flattenWards, wardKey } from '@/lib/familie';
import { useLanguage } from '@/contexts/LanguageContext';
import HelpLink from '@/components/HelpLink';
import { EmptyState } from '@/components/standorte/ui';
import WardView from '@/components/familie/WardView';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';

/**
 * `/familie` -- the guardian area (Wave 10 W3). A guardian account is not a club member: everything here is bound to a ward
 * via `GET /my-wards` and `/guardian/wards/:id/*` (several children, several clubs). No club internals are shown.
 */
export default function FamiliePageContent() {
    const { t } = useLanguage();
    const [clubs, setClubs] = useState<WardClub[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);

    const load = useCallback(() => {
        apiFetch<{ data: WardClub[] }>('/my-wards')
            .then(({ data }) => {
                setClubs(data);
                setFailed(false);
            })
            .catch(() => setFailed(true));
    }, []);

    useEffect(load, [load]);

    const wards = clubs ? flattenWards(clubs) : [];
    // A single child is shown right away; with several the guardian picks one (the first stays preselected).
    const current = wards.find((w) => wardKey(w) === selected) ?? wards[0] ?? null;
    const multiClub = (clubs?.length ?? 0) > 1;

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1">
                <h1 className="text-2xl font-bold text-foreground">{t('familie.page.title')}</h1>
                <HelpLink topic="family" />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t('familie.page.subtitle')}</p>

            {failed ? (
                <LoadError className="mt-6" onRetry={load} />
            ) : clubs === null ? (
                <LoadingText className="mt-6" />
            ) : !current ? (
                <div className="mt-6">
                    <EmptyState icon={<Users className="h-6 w-6" aria-hidden />} text={t('familie.empty')} />
                </div>
            ) : (
                <>
                    {wards.length > 1 && (
                        <div role="tablist" aria-label={t('familie.wards.label')} className="mt-6 flex flex-wrap gap-2">
                            {wards.map((w) => {
                                const active = wardKey(w) === wardKey(current);
                                return (
                                    <button
                                        key={wardKey(w)}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setSelected(wardKey(w))}
                                        className={`rounded-xl border px-4 py-2 text-left text-sm transition-colors ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted'}`}
                                    >
                                        <span className="block font-semibold">{w.firstName ?? w.name}</span>
                                        {multiClub && <span className="block text-xs text-muted-foreground">{w.clubName}</span>}
                                        {w.openConsents > 0 && <span className="mt-1 inline-block rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">{t('familie.wards.openConsents', { count: w.openConsents })}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <h2 className="mt-6 text-lg font-bold text-foreground">
                        {current.name}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">{current.clubName}</span>
                    </h2>
                    <div className="mt-3">
                        <WardView key={wardKey(current)} ward={current} onConsentsChanged={load} />
                    </div>
                </>
            )}
        </div>
    );
}
