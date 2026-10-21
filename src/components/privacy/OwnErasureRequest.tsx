'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate } from '@/lib/clubMembers';
import { type OwnDataRequest, isOpenRequest, privacyErrorKey } from '@/lib/privacyAdmin';
import { Chip } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import LoadingText from '@/components/LoadingText';

/**
 * The member asks the club to erase their data (`POST /club-members/me/erasure-request`) instead of deleting the account on the
 * spot: the board sees the request with its one-month deadline, checks the blockers (open loans, board role, ...) and runs the
 * erasure. Own requests (`GET /club-members/me/data-requests`) are listed with their status.
 */
export default function OwnErasureRequest({ clubId }: { clubId: string }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [requests, setRequests] = useState<OwnDataRequest[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const query = `?clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            setRequests((await apiFetch<{ data: OwnDataRequest[] }>(`/club-members/me/data-requests${query}`)).data);
        } catch {
            setLoadError(true);
        }
    }, [query]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function request() {
        const ok = await confirm({ title: t('privacy.own.erasure.confirm.title'), body: t('privacy.own.erasure.confirm.body'), confirmLabel: t('privacy.own.erasure.confirm.action'), danger: true });
        if (!ok) return;
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/club-members/me/erasure-request${query}`, { method: 'POST' });
            await load();
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    if (loadError)
        return (
            <p role="alert" className="text-sm text-destructive">
                {t('common.error')}{' '}
                <button type="button" onClick={() => void load()} className="font-semibold underline">
                    {t('common.retry')}
                </button>
            </p>
        );
    if (!requests) return <LoadingText />;
    const openErasure = requests.find((r) => r.kind === 'erasure' && isOpenRequest(r));

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('privacy.own.erasure.intro')}</p>
            {openErasure ? (
                <p role="status" className="text-sm text-foreground">
                    {t('privacy.own.erasure.pending', { date: formatDate(openErasure.dueAt, language) })}
                </p>
            ) : (
                <button type="button" disabled={busy} onClick={() => void request()} className="rounded-lg border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50">
                    {t('privacy.own.erasure.action')}
                </button>
            )}
            {requests.length > 0 && (
                <ul className="space-y-1.5 text-sm">
                    {requests.map((r) => (
                        <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-foreground">
                            <Chip tone={isOpenRequest(r) ? 'warning' : r.status === 'done' ? 'success' : 'muted'}>{t(`privacy.request.status.${r.status}`)}</Chip>
                            <span>{t(`privacy.request.kind.${r.kind}`)}</span>
                            <span className="text-muted-foreground">{t('privacy.own.request.received', { date: formatDate(r.receivedAt, language) })}</span>
                        </li>
                    ))}
                </ul>
            )}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {dialog}
        </div>
    );
}
