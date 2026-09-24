'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import StandorteTab, { type Location } from '@/components/standorte/StandorteTab';
import MaterialTab from '@/components/standorte/MaterialTab';

interface MyClub {
    clubId: string;
    memberId: string;
    clubName: string | null;
    orgRole: string;
}

type Tab = 'standorte' | 'material';

export default function StandortePageContent() {
    const { t } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [locations, setLocations] = useState<Location[] | null>(null);
    const [tab, setTab] = useState<Tab>('standorte');
    const [permissions, setPermissions] = useState<string[]>([]);

    const activeClub = clubs?.[0] ?? null;

    useEffect(() => {
        void apiFetch<{ data: MyClub[] }>('/my-clubs').then(({ data }) => setClubs(data));
    }, []);

    async function refreshLocations(clubId: string) {
        const { data } = await apiFetch<{ data: Location[] }>(`/locations?clubId=${clubId}`);
        setLocations(data);
    }

    useEffect(() => {
        if (!activeClub) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshLocations(activeClub.clubId);
        // Missing permissions only hide write UI; the backend enforces them anyway.
        apiFetch<{ data: { permissions?: string[] } }>(`/club-members/me?clubId=${activeClub.clubId}`)
            .then(({ data }) => setPermissions(data.permissions ?? []))
            .catch(() => setPermissions([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClub?.clubId]);

    return (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('standorte.page.title')}</h1>

            {clubs === null ? (
                <p className="mt-6 text-sm text-muted-foreground">…</p>
            ) : !activeClub ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.no-club.body')}</p>
                </div>
            ) : (
                <>
                    <div className="mt-6 flex gap-2 border-b border-border">
                        {(['standorte', 'material'] as const).map((value) => (
                            <button
                                key={value}
                                onClick={() => setTab(value)}
                                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                    tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t(`standorte.tab.${value}`)}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        {locations === null ? (
                            <p className="text-sm text-muted-foreground">…</p>
                        ) : (
                            <>
                                {tab === 'standorte' && (
                                    <StandorteTab
                                        clubId={activeClub.clubId}
                                        locations={locations}
                                        canWrite={permissions.includes('locations:write')}
                                        onLocationsChanged={() => void refreshLocations(activeClub.clubId)}
                                    />
                                )}
                                {tab === 'material' && (
                                    <MaterialTab clubId={activeClub.clubId} locations={locations} canWrite={permissions.includes('inventory:write')} />
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
