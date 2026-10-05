'use client';

import { useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ClubApplication {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    category: string | null;
    birthDate: string | null;
    status: string;
    createdAt: string;
}

/**
 * Open Aufnahmeantraege for the board (members:write). Approve/reject call
 * POST /club-applications/:id/(approve|reject); the parent reloads both the
 * application list and the member list through `onDecided`.
 */
export default function ApplicationsPanel({
    applications,
    loadError,
    clubId,
    onDecided,
}: {
    applications: ClubApplication[] | null;
    loadError: boolean;
    clubId: string;
    onDecided: () => Promise<void> | void;
}) {
    const { t } = useLanguage();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function decide(id: string, action: 'approve' | 'reject') {
        setBusyId(id);
        setError(null);
        try {
            await apiFetch(`/club-applications/${id}/${action}?clubId=${clubId}`, { method: 'POST' });
            setConfirmId(null);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
            // Not rethrown: a failed refresh must not mask the decision outcome or become an unhandled rejection.
            // A 404/409 means someone else already decided -- refresh so the stale row disappears.
            if (err instanceof ApiError && (err.status === 404 || err.status === 409)) await Promise.resolve(onDecided()).catch(() => {});
            setBusyId(null);
            return;
        }
        try {
            await onDecided();
        } catch {
            // Decision went through; a stale list is fixed by the next refresh.
        } finally {
            setBusyId(null);
        }
    }

    return (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                {t('verein.applications.title')}
                {applications && applications.length > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{applications.length}</span>
                )}
            </h2>

            {loadError ? (
                <p className="text-sm text-destructive">{t('verein.applications.error')}</p>
            ) : applications === null ? (
                <p className="text-sm text-muted-foreground">…</p>
            ) : applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('verein.applications.empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {applications.map((a) => {
                        const busy = busyId === a.id;
                        return (
                            <li key={a.id} className="rounded-lg border border-border px-3 py-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {a.name ?? '—'}
                                            {a.category && (
                                                <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                                    {t(`verein.category.${a.category}`)}
                                                </span>
                                            )}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {a.email ?? '—'} · {t('verein.applications.submitted')}{' '}
                                            {new Date(a.createdAt).toLocaleDateString('de-DE')}
                                            {a.birthDate && (
                                                <>
                                                    {' · '}
                                                    {t('verein.applications.birthDate')}{' '}
                                                    {new Date(`${a.birthDate.slice(0, 10)}T00:00`).toLocaleDateString('de-DE')}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    {confirmId === a.id ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-foreground">
                                                {t('verein.applications.reject.confirm', { name: a.name ?? '—' })}
                                            </span>
                                            <button
                                                onClick={() => void decide(a.id, 'reject')}
                                                disabled={busy}
                                                className="rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                            >
                                                {t('verein.applications.reject.yes')}
                                            </button>
                                            <button
                                                onClick={() => setConfirmId(null)}
                                                disabled={busy}
                                                className="text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                {t('verein.roles.add.cancel')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => void decide(a.id, 'approve')}
                                                disabled={busy}
                                                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                                            >
                                                {t('verein.applications.approve')}
                                            </button>
                                            <button
                                                onClick={() => setConfirmId(a.id)}
                                                disabled={busy}
                                                className="rounded-md border border-border px-3 py-1 text-xs text-foreground hover:bg-muted disabled:opacity-50"
                                            >
                                                {t('verein.applications.reject')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </div>
    );
}
