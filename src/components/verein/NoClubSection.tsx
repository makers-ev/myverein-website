'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import ClubRegistrationWizard from '@/components/verein/ClubRegistrationWizard';
import JoinClubCard from '@/components/verein/JoinClubCard';
import RegistrationStatusCard from '@/components/verein/RegistrationStatusCard';
import type { ClubRegistration, RegistrationNotice } from '@/components/verein/clubRegistration';

/**
 * "No club" state of /verein: join by club code (JoinClubCard) next to "Verein gruenden"
 * (Wave 6). The newest registration of the user decides what is shown instead of the plain
 * founding card: a draft offers to resume, pending/needs_info/rejected/approved show the
 * status view. `onRefreshClubs` re-reads /my-clubs (used once a registration was approved).
 */
export default function NoClubSection({ onRefreshClubs }: { onRefreshClubs: () => void }) {
    const { t } = useLanguage();
    const [registrations, setRegistrations] = useState<ClubRegistration[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [notice, setNotice] = useState<RegistrationNotice | null>(null);
    // `null` = overview; otherwise the wizard is open, with the registration to continue (or none).
    const [wizard, setWizard] = useState<{ initial: ClubRegistration | null } | null>(null);

    async function loadMine(): Promise<ClubRegistration[] | null> {
        try {
            const { data } = await apiFetch<{ data: ClubRegistration[] }>('/club-registrations/mine');
            setRegistrations(data);
            setLoadError(false);
            return data;
        } catch {
            setLoadError(true);
            // Keep an empty list so the founding card still renders next to the error.
            setRegistrations((prev) => prev ?? []);
            return null;
        }
    }

    // setState runs after the awaited request, not synchronously in the effect body
    // (the lint rule cannot see through the async function call, same as Verein.tsx).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadMine();
    }, []);

    async function handleRefresh() {
        setRefreshing(true);
        try {
            await loadMine();
        } finally {
            setRefreshing(false);
        }
    }

    // Used by the wizard after submit and when POST answered 409 (an open registration already exists).
    async function handleWizardDone(wizardNotice?: RegistrationNotice) {
        setNotice(wizardNotice ?? null);
        await loadMine();
        setWizard(null);
    }

    // Leaving the wizard keeps the server-side draft -- reload so "continue draft" shows up.
    function handleWizardCancel() {
        setWizard(null);
        void loadMine();
    }

    function openWizard(initial: ClubRegistration | null) {
        setNotice(null);
        setWizard({ initial });
    }

    // The club may not appear in /my-clubs immediately; if this component is still mounted afterwards, say so.
    function handleOpenClub() {
        setNotice('recheck');
        onRefreshClubs();
    }

    if (registrations === null) {
        return <p className="mt-6 text-sm text-muted-foreground">…</p>;
    }

    if (wizard) {
        return <ClubRegistrationWizard initial={wizard.initial} onCancel={handleWizardCancel} onDone={handleWizardDone} />;
    }

    const latest = registrations[0] ?? null;
    const draft = latest?.status === 'draft' ? latest : null;
    const statusView = latest && latest.status !== 'draft' ? latest : null;

    return (
        <>
            {loadError && (
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 px-3 py-2" role="alert">
                    <p className="text-sm text-destructive">{t('verein.create.loadError')}</p>
                    <button type="button" onClick={() => void handleRefresh()} disabled={refreshing} className="text-sm font-medium text-primary hover:underline disabled:opacity-50">
                        {t('verein.create.retry')}
                    </button>
                </div>
            )}

            {notice && (
                <p className="mt-6 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground" role="status">
                    {t(`verein.create.notice.${notice}`)}
                </p>
            )}

            <div className="grid items-start gap-4 md:grid-cols-2">
                <JoinClubCard onRefresh={onRefreshClubs} className="mt-6" />
                {statusView ? (
                    <RegistrationStatusCard
                        registration={statusView}
                        refreshing={refreshing}
                        onEdit={() => openWizard(statusView)}
                        onNew={() => openWizard(null)}
                        onRefresh={() => void handleRefresh()}
                        onOpenClub={handleOpenClub}
                    />
                ) : (
                    <div className="mt-6 rounded-xl border border-border bg-card p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">{t('verein.create.card.title')}</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {draft ? t('verein.create.card.resume.body', { name: draft.clubName }) : t('verein.create.card.body')}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => openWizard(draft)}
                            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                        >
                            {t(draft ? 'verein.create.card.resume' : 'verein.create.card.start')}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
