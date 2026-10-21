'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type MemberConsent, type MemberConsentsResponse, consentErrorKey } from '@/lib/consents';
import { formatDate, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { Chip } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

const STATE_TONE = { granted: 'success', revoked: 'muted', none: 'muted' } as const;

/**
 * The consents of ONE person (`GET /club-members/:id/consents`) with "Einwilligen" / "Nicht einwilligen" per purpose --
 * for the person themself or a guardian with `canConsent` (`canDecide`). Everything is voluntary and says so: declining or
 * not deciding has no consequence for membership. A decision always refers to the text version shown (`textVersionId`);
 * if the text changed meanwhile (409 `consent_text_outdated`) the list reloads and the person decides on the new wording.
 * Reusable for the guardian area and, later, the member's own privacy page.
 */
export default function MemberConsents({ clubId, clubMemberId, canDecide, onChanged }: { clubId: string; clubMemberId: string; canDecide: boolean; onChanged?: () => void }) {
    const { t, language } = useLanguage();
    const [data, setData] = useState<MemberConsent[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const base = `/club-members/${encodeURIComponent(clubMemberId)}/consents`;
    const query = `?clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await apiFetch<{ data: MemberConsentsResponse }>(`${base}${query}`);
            setData(res.data.consents);
        } catch {
            setLoadError(true);
        }
    }, [base, query]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function decide(c: MemberConsent, grant: boolean) {
        setBusyId(c.purposeId);
        setError(null);
        try {
            if (grant) await apiFetch(`${base}/${encodeURIComponent(c.purposeId)}${query}`, { method: 'POST', body: { textVersionId: c.text.id } });
            else await apiFetch(`${base}/${encodeURIComponent(c.purposeId)}${query}`, { method: 'DELETE' });
            await load();
            onChanged?.();
        } catch (err) {
            setError(t(consentErrorKey(err)));
            await load();
        } finally {
            setBusyId(null);
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
    if (!data) return <LoadingText />;
    if (data.length === 0) return <p className="text-sm text-muted-foreground">{t('privacy.member.empty')}</p>;

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('privacy.voluntary')}</p>
            <ul className="space-y-3">
                {data.map((c) => (
                    <li key={c.purposeId} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">{c.name}</span>
                            <span className="flex flex-wrap items-center gap-1.5">
                                {c.open && <Chip tone="warning">{t('privacy.member.open')}</Chip>}
                                {c.outdated && <Chip tone="primary">{t('privacy.member.outdated')}</Chip>}
                                <Chip tone={STATE_TONE[c.state]}>{t(`privacy.state.${c.state}`)}</Chip>
                            </span>
                        </div>
                        {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                        <details className="mt-2 text-sm">
                            <summary className="cursor-pointer font-medium text-primary">{t('privacy.member.showText', { version: c.text.version })}</summary>
                            <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-foreground">{c.text.body}</p>
                        </details>
                        {c.decidedAt && <p className="mt-2 text-xs text-muted-foreground">{t('privacy.member.decidedAt', { date: formatDate(c.decidedAt, language) })}</p>}
                        {canDecide && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" disabled={busyId === c.purposeId || (c.state === 'granted' && !c.outdated)} onClick={() => void decide(c, true)} className={primaryButtonClass}>
                                    {t('privacy.member.grant')}
                                </button>
                                <button type="button" disabled={busyId === c.purposeId || c.state === 'revoked'} onClick={() => void decide(c, false)} className={secondaryButtonClass}>
                                    {t(c.state === 'granted' ? 'privacy.member.revoke' : 'privacy.member.decline')}
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
