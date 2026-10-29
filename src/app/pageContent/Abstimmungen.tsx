'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { apiFetch } from '@/lib/api-client';
import { ASSEMBLY_MANAGE } from '@/lib/assembly';
import { can } from '@/lib/clubPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import BallotsManager from '@/components/assembly/BallotsManager';
import ElectionsPanel from '@/components/assembly/ElectionsPanel';
import VotingPanel from '@/components/assembly/VotingPanel';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useActiveClub } from '@/components/shell/ActiveClubProvider';

type Tab = 'abstimmungen' | 'umlauf' | 'wahlen';

export default function AbstimmungenPageContent() {
    const { t } = useLanguage();
    // The club is the one of the shell's switcher (no second selector here).
    const { clubs, failed: clubsError, activeClub, reload } = useActiveClub();
    // Rights and departments are loaded per club; `loaded` names the club they belong to so a switch never shows the old club's rights.
    const [access, setAccess] = useState<{ clubId: string; permissions: string[]; departments: { id: string; name: string }[]; failed: boolean } | null>(null);
    // "Neuwahl planen" in the club info links here with ?tab=wahlen&role=...&department=...
    const params = useSearchParams();
    const [tab, setTab] = useState<Tab>(params.get('tab') === 'wahlen' ? 'wahlen' : 'abstimmungen');
    const prefillRole = params.get('role');
    const prefill = prefillRole ? { roleType: prefillRole, departmentId: params.get('department') } : null;
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        if (!activeClub) return;
        let cancelled = false;
        const id = activeClub.clubId;
        // The management tabs depend on the rights: nothing is rendered before they are known (no flash of the member view).
        Promise.all([
            apiFetch<{ data: { permissions?: string[] } }>(`/club-members/me?clubId=${id}`),
            apiFetch<{ data: { departments: { id: string; name: string }[] } }>(`/club-info?clubId=${id}`).catch(() => ({ data: { departments: [] } })),
        ])
            .then(([me, info]) => {
                if (!cancelled) setAccess({ clubId: id, permissions: me.data.permissions ?? [], departments: info.data.departments, failed: false });
            })
            .catch(() => {
                if (!cancelled) setAccess({ clubId: id, permissions: [], departments: [], failed: true });
            });
        return () => {
            cancelled = true;
        };
    }, [activeClub, retry]);

    const current = access && activeClub && access.clubId === activeClub.clubId ? access : null;
    const permissions = current?.permissions ?? [];
    const departments = current?.departments ?? [];
    const canManage = can(permissions, ASSEMBLY_MANAGE);
    const tabs: Tab[] = canManage ? ['abstimmungen', 'umlauf', 'wahlen'] : ['abstimmungen', 'wahlen'];
    const currentTab: Tab = tabs.includes(tab) ? tab : 'abstimmungen';

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('assembly.page.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('assembly.page.subtitle')}</p>

            {clubsError ? (
                <LoadError className="mt-6" onRetry={reload} />
            ) : clubs === null ? (
                <LoadingText className="mt-6" />
            ) : !activeClub ? (
                <p className="mt-6 text-sm text-muted-foreground">{t('assembly.page.noClub')}</p>
            ) : (
                <>
                    {!current ? (
                        <LoadingText className="mt-6" />
                    ) : current.failed ? (
                        <LoadError className="mt-6" onRetry={() => { setAccess(null); setRetry((n) => n + 1); }} />
                    ) : (
                        <>
                            <div role="tablist" aria-label={t('assembly.page.title')} className="mt-6 flex gap-2 overflow-x-auto border-b border-border">
                                {tabs.map((value) => (
                                    <button
                                        key={value}
                                        id={`ab-tab-${value}`}
                                        type="button"
                                        role="tab"
                                        aria-selected={currentTab === value}
                                        aria-controls="ab-panel"
                                        onClick={() => setTab(value)}
                                        className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${currentTab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {t(`assembly.page.tab.${value}`)}
                                    </button>
                                ))}
                            </div>
                            <div id="ab-panel" role="tabpanel" aria-labelledby={`ab-tab-${currentTab}`} className="mt-4">
                                {currentTab === 'abstimmungen' && <VotingPanel key={activeClub.clubId} clubId={activeClub.clubId} />}
                                {currentTab === 'umlauf' && canManage && <BallotsManager key={activeClub.clubId} clubId={activeClub.clubId} mode="circular" />}
                                {currentTab === 'wahlen' && <ElectionsPanel key={activeClub.clubId} clubId={activeClub.clubId} canManage={canManage} departments={departments} prefill={prefill} />}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
