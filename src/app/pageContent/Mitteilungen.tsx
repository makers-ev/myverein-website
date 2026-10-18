'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { communicationGate, ownDepartmentIds, selectableDepartments, type Announcement } from '@/lib/communication';
import { useLanguage } from '@/contexts/LanguageContext';
import ComposePanel from '@/components/mitteilungen/ComposePanel';
import NoClubSection from '@/components/verein/NoClubSection';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';

interface MyClub {
    clubId: string;
    clubName: string | null;
}

interface MeLite {
    permissions: string[];
    roles: { id: string; roleType: string; departmentId?: string | null }[];
}

interface Department {
    id: string;
    name: string;
}

type Tab = 'verfassen';

export default function MitteilungenPageContent() {
    const { t } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [clubsError, setClubsError] = useState(false);
    const [ctx, setCtx] = useState<{ clubId: string; me: MeLite; departments: Department[] } | { clubId: string; error: true } | null>(null);
    const [tab] = useState<Tab>('verfassen');
    const [notice, setNotice] = useState<string | null>(null);
    // Bumping the key gives a fresh compose form after a send/draft.
    const [composeKey, setComposeKey] = useState(0);

    const activeClub = clubs?.[0] ?? null;

    const loadClubs = useCallback(() => {
        apiFetch<{ data: MyClub[] }>('/my-clubs')
            .then(({ data }) => {
                setClubs(data);
                setClubsError(false);
            })
            .catch(() => setClubsError(true));
    }, []);

    useEffect(loadClubs, [loadClubs]);

    const loadContext = useCallback((clubId: string) => {
        Promise.all([apiFetch<{ data: MeLite }>(`/club-members/me?clubId=${clubId}`), apiFetch<{ data: { departments: Department[] } }>(`/club-info?clubId=${clubId}`)])
            .then(([me, info]) => setCtx({ clubId, me: me.data, departments: info.data.departments }))
            .catch(() => setCtx({ clubId, error: true }));
    }, []);

    useEffect(() => {
        if (activeClub) loadContext(activeClub.clubId);
    }, [activeClub, loadContext]);

    const context = activeClub && ctx && ctx.clubId === activeClub.clubId ? ctx : null;
    const ready = context && !('error' in context) ? context : null;
    const gate = communicationGate(ready?.me.permissions);

    function handleDone(result: { kind: 'draft' | 'sent' | 'scheduled'; announcement: Announcement | null }) {
        setNotice(t(`mitteilungen.done.${result.kind}`));
        setComposeKey((n) => n + 1);
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('mitteilungen.page.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('mitteilungen.page.subtitle')}</p>

            {clubsError ? (
                <LoadError className="mt-6" onRetry={loadClubs} />
            ) : clubs === null ? (
                <LoadingText className="mt-6" />
            ) : !activeClub ? (
                <NoClubSection onRefreshClubs={loadClubs} />
            ) : context && 'error' in context ? (
                <LoadError className="mt-6" onRetry={() => loadContext(activeClub.clubId)} />
            ) : !ready ? (
                <LoadingText className="mt-6" />
            ) : !gate.canAuthor ? (
                <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t('mitteilungen.noRights')}</p>
            ) : (
                <>
                    <div role="tablist" className="mt-6 flex gap-2 overflow-x-auto border-b border-border">
                        <button role="tab" aria-selected={tab === 'verfassen'} className="whitespace-nowrap border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary">
                            {t('mitteilungen.tab.verfassen')}
                        </button>
                    </div>
                    {notice && (
                        <p role="status" className="mt-4 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                            {notice}
                        </p>
                    )}
                    <div className="mt-4">
                        <ComposePanel
                            key={composeKey}
                            clubId={activeClub.clubId}
                            gate={gate}
                            departments={selectableDepartments(gate, ready.departments, ownDepartmentIds(ready.me.roles))}
                            onDone={handleDone}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
