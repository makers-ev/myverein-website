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

interface MyClub {
    clubId: string;
    clubName: string | null;
}

type Tab = 'abstimmungen' | 'umlauf' | 'wahlen';

export default function AbstimmungenPageContent() {
    const { t } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [clubsError, setClubsError] = useState(false);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    // "Neuwahl planen" in the club info links here with ?tab=wahlen&role=...&department=...
    const params = useSearchParams();
    const [tab, setTab] = useState<Tab>(params.get('tab') === 'wahlen' ? 'wahlen' : 'abstimmungen');
    const prefillRole = params.get('role');
    const prefill = prefillRole ? { roleType: prefillRole, departmentId: params.get('department') } : null;
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        apiFetch<{ data: MyClub[] }>('/my-clubs')
            .then(({ data }) => {
                setClubs(data);
                setClubsError(false);
            })
            .catch(() => setClubsError(true));
    }, [retry]);

    const activeClub = clubs?.[0] ?? null;

    useEffect(() => {
        if (!activeClub) return;
        // Missing permissions only hide the management tabs; the backend enforces them anyway.
        apiFetch<{ data: { permissions?: string[] } }>(`/club-members/me?clubId=${activeClub.clubId}`)
            .then(({ data }) => setPermissions(data.permissions ?? []))
            .catch(() => setPermissions([]));
        apiFetch<{ data: { departments: { id: string; name: string }[] } }>(`/club-info?clubId=${activeClub.clubId}`)
            .then(({ data }) => setDepartments(data.departments))
            .catch(() => setDepartments([]));
    }, [activeClub]);

    const canManage = can(permissions, ASSEMBLY_MANAGE);
    const tabs: Tab[] = canManage ? ['abstimmungen', 'umlauf', 'wahlen'] : ['abstimmungen', 'wahlen'];
    const current: Tab = tabs.includes(tab) ? tab : 'abstimmungen';

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('assembly.page.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('assembly.page.subtitle')}</p>

            {clubsError ? (
                <LoadError className="mt-6" onRetry={() => setRetry((n) => n + 1)} />
            ) : clubs === null ? (
                <LoadingText className="mt-6" />
            ) : !activeClub ? (
                <p className="mt-6 text-sm text-muted-foreground">{t('assembly.page.noClub')}</p>
            ) : (
                <>
                    <div role="tablist" aria-label={t('assembly.page.title')} className="mt-6 flex gap-2 overflow-x-auto border-b border-border">
                        {tabs.map((value) => (
                            <button
                                key={value}
                                id={`ab-tab-${value}`}
                                type="button"
                                role="tab"
                                aria-selected={current === value}
                                aria-controls="ab-panel"
                                onClick={() => setTab(value)}
                                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${current === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                            >
                                {t(`assembly.page.tab.${value}`)}
                            </button>
                        ))}
                    </div>
                    <div id="ab-panel" role="tabpanel" aria-labelledby={`ab-tab-${current}`} className="mt-4">
                        {current === 'abstimmungen' && <VotingPanel clubId={activeClub.clubId} />}
                        {current === 'umlauf' && canManage && <BallotsManager clubId={activeClub.clubId} mode="circular" />}
                        {current === 'wahlen' && <ElectionsPanel clubId={activeClub.clubId} canManage={canManage} departments={departments} prefill={prefill} />}
                    </div>
                </>
            )}
        </div>
    );
}
