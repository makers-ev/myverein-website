'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { chooseClub } from '@/lib/activeClub';
import { isGuestRole } from '@/lib/loans';
import { useLanguage } from '@/contexts/LanguageContext';
import HelpLink from '@/components/HelpLink';
import StandorteTab, { type Location } from '@/components/standorte/StandorteTab';
import MaterialTab from '@/components/standorte/MaterialTab';
import OccupancyTab from '@/components/standorte/OccupancyTab';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';

interface MyClub {
    clubId: string;
    memberId: string;
    clubName: string | null;
    orgRole: string;
}

type Tab = 'standorte' | 'material' | 'belegung';

export default function StandortePageContent() {
    const { t } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [locations, setLocations] = useState<Location[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [tab, setTab] = useState<Tab>('standorte');
    const [permissions, setPermissions] = useState<string[]>([]);
    // Better Auth member id of the caller (what loans record as borrower).
    const [ownMemberId, setOwnMemberId] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false);

    const activeClub = chooseClub(clubs) ?? null;

    function loadClubs() {
        apiFetch<{ data: MyClub[] }>('/my-clubs')
            .then(({ data }) => {
                setClubs(data);
                setLoadError(false);
            })
            .catch(() => setLoadError(true));
    }

    // setClubs/setLoadError run inside promise callbacks, not synchronously in the effect body.
    useEffect(loadClubs, []);

    async function refreshLocations(clubId: string) {
        try {
            const { data } = await apiFetch<{ data: Location[] }>(`/locations?clubId=${clubId}`);
            setLocations(data);
            setLoadError(false);
        } catch {
            // Keep a list that is already shown; only the very first load turns into the error state.
            if (locations === null) setLoadError(true);
        }
    }

    useEffect(() => {
        if (!activeClub) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshLocations(activeClub.clubId);
        // Missing permissions only hide write UI; the backend enforces them anyway.
        apiFetch<{ data: { permissions?: string[]; memberId?: string | null; orgRole?: string | null } }>(`/club-members/me?clubId=${activeClub.clubId}`)
            .then(({ data }) => {
                setPermissions(data.permissions ?? []);
                setOwnMemberId(data.memberId ?? null);
                setIsGuest(isGuestRole(data.orgRole));
            })
            .catch(() => {
                setPermissions([]);
                setOwnMemberId(null);
                setIsGuest(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClub?.clubId]);

    return (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1">
                <h1 className="text-2xl font-bold text-foreground">{t('standorte.page.title')}</h1>
                <HelpLink topic="places" />
            </div>

            {loadError ? (
                <LoadError className="mt-6" onRetry={() => (activeClub ? void refreshLocations(activeClub.clubId) : loadClubs())} />
            ) : clubs === null ? (
                <LoadingText className="mt-6" />
            ) : !activeClub ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.no-club.body')}</p>
                </div>
            ) : (
                <>
                    <div className="mt-6 flex gap-2 border-b border-border">
                        {(['standorte', 'material', 'belegung'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={tab === value}
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
                            <LoadingText />
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
                                {tab === 'belegung' && isGuest && <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">{t('occupancy.guest')}</p>}
                                {tab === 'belegung' && !isGuest && <OccupancyTab clubId={activeClub.clubId} locations={locations} canWrite={permissions.includes('locations:write')} />}
                                {tab === 'material' && (
                                    <MaterialTab clubId={activeClub.clubId} locations={locations} canWrite={permissions.includes('inventory:write')} ownMemberId={ownMemberId} isGuest={isGuest} />
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
