'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, secondaryButtonClass } from '@/lib/clubMembers';
import { type PrivacyNoticeStatus, privacyErrorKey } from '@/lib/privacyAdmin';
import { Chip } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

/**
 * Art. 14 GDPR: members who were not asked themselves (created by the board, no account) get the privacy notice from the
 * club. Here the board notes that the current version was handed over (`POST .../privacy-notice-sent`); the stamp keeps date
 * and version. Information only: it is no consent and blocks nothing.
 */
export default function MemberNoticeStamp({ clubId, clubMemberId, canStamp }: { clubId: string; clubMemberId: string; canStamp: boolean }) {
    const { t, language } = useLanguage();
    const [status, setStatus] = useState<PrivacyNoticeStatus | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const path = `/club-members/${encodeURIComponent(clubMemberId)}/privacy-notice`;
    const query = `?clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            setStatus((await apiFetch<{ data: PrivacyNoticeStatus }>(`${path}${query}`)).data);
        } catch {
            setLoadError(true);
        }
    }, [path, query]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function stamp() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`${path}-sent${query}`, { method: 'POST' });
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
    if (!status) return <LoadingText />;

    return (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('privacy.stamp.intro')}</p>
            {status.currentVersion === null ? (
                <p className="text-sm text-foreground">{t('privacy.stamp.noNotice')}</p>
            ) : (
                <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    {status.sentAt ? (
                        <>
                            <Chip tone={status.upToDate ? 'success' : 'warning'}>{t(status.upToDate ? 'privacy.stamp.upToDate' : 'privacy.stamp.outdated')}</Chip>
                            {t('privacy.stamp.sent', { date: formatDate(status.sentAt, language), version: status.sentVersion ?? '—' })}
                        </>
                    ) : (
                        <Chip tone="muted">{t('privacy.stamp.never')}</Chip>
                    )}
                </p>
            )}
            {canStamp && status.currentVersion !== null && !status.upToDate && (
                <button type="button" disabled={busy} onClick={() => void stamp()} className={secondaryButtonClass}>
                    {t('privacy.stamp.action', { version: status.currentVersion })}
                </button>
            )}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
