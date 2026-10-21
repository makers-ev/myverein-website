'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ConsentEvent, type MemberConsent, type MemberConsentsResponse, PROOF_SOURCE_MAX, consentErrorKey, proofProblem } from '@/lib/consents';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass, todayIso } from '@/lib/clubMembers';
import { Chip } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

const STATE_TONE = { granted: 'success', revoked: 'muted', none: 'muted' } as const;

/**
 * The consents of ONE person (`GET /club-members/:id/consents`). Three ways to use it:
 * - `canDecide`: the person themself or a guardian with `canConsent` -- "Einwilligen" / "Nicht einwilligen" per purpose.
 * - `board`: the board (`privacy:manage`) records a paper proof for the person: date AND source are mandatory (the backend
 *   answers 422 `proof_required` otherwise), granting and declining alike. This is also how members without an account and
 *   minors are handled by the club.
 * - neither: read-only (`privacy:read`).
 * Everything is voluntary and says so: declining or not deciding has no consequence for membership. A decision always
 * refers to the text version shown (`textVersionId`); if the text changed meanwhile (409 `consent_text_outdated`) the list
 * reloads and the person decides on the new wording. `showHistory` adds the append-only event list.
 */
export default function MemberConsents({
    clubId,
    clubMemberId,
    canDecide,
    board = false,
    showHistory = false,
    onChanged,
}: {
    clubId: string;
    clubMemberId: string;
    canDecide: boolean;
    board?: boolean;
    showHistory?: boolean;
    onChanged?: () => void;
}) {
    const { t, language } = useLanguage();
    const [data, setData] = useState<MemberConsentsResponse | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // The purpose whose paper proof form is open, with its inputs.
    const [proofFor, setProofFor] = useState<string | null>(null);
    const [proofDate, setProofDate] = useState('');
    const [proofSource, setProofSource] = useState('');
    const base = `/club-members/${encodeURIComponent(clubMemberId)}/consents`;
    const query = `?clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await apiFetch<{ data: MemberConsentsResponse }>(`${base}${query}`);
            setData(res.data);
        } catch {
            setLoadError(true);
        }
    }, [base, query]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function decide(c: MemberConsent, grant: boolean, proof?: { proofDate: string; proofSource: string }) {
        setBusyId(c.purposeId);
        setError(null);
        try {
            const url = `${base}/${encodeURIComponent(c.purposeId)}${query}`;
            if (grant) await apiFetch(url, { method: 'POST', body: { textVersionId: c.text.id, ...proof } });
            else await apiFetch(url, { method: 'DELETE', ...(proof ? { body: proof } : {}) });
            setProofFor(null);
            await load();
            onChanged?.();
        } catch (err) {
            setError(t(consentErrorKey(err)));
            await load();
        } finally {
            setBusyId(null);
        }
    }

    function openProof(c: MemberConsent) {
        setError(null);
        setProofFor(c.purposeId);
        setProofDate(todayIso());
        setProofSource('');
    }

    function submitProof(c: MemberConsent, grant: boolean) {
        const problem = proofProblem(proofDate, proofSource, todayIso());
        if (problem) {
            setError(t(problem));
            return;
        }
        void decide(c, grant, { proofDate, proofSource: proofSource.trim() });
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
    const consents = data.consents;
    if (consents.length === 0) return <p className="text-sm text-muted-foreground">{t('privacy.member.empty')}</p>;

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('privacy.voluntary')}</p>
            <ul className="space-y-3">
                {consents.map((c) => (
                    <li key={c.purposeId} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">{c.name}</span>
                            <span className="flex flex-wrap items-center gap-1.5">
                                {c.open && <Chip tone="warning">{t('privacy.member.open')}</Chip>}
                                {c.outdated && <Chip tone="primary">{t('privacy.member.outdated')}</Chip>}
                                {c.confirmation?.pending && <Chip tone="primary">{t('privacy.member.confirm')}</Chip>}
                                <Chip tone={STATE_TONE[c.state]}>{t(`privacy.state.${c.state}`)}</Chip>
                            </span>
                        </div>
                        {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
                        <details className="mt-2 text-sm">
                            <summary className="cursor-pointer font-medium text-primary">{t('privacy.member.showText', { version: c.text.version })}</summary>
                            <p className="mt-2 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-foreground">{c.text.body}</p>
                        </details>
                        {c.decidedAt && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                {t('privacy.member.decidedAt', { date: formatDate(c.decidedAt, language) })}
                                {c.givenBy ? ` · ${t(`privacy.given.${c.givenBy}`)}` : ''}
                            </p>
                        )}
                        {c.confirmation?.pending && <p className="mt-1 text-xs text-muted-foreground">{t('privacy.member.confirmHint')}</p>}
                        {canDecide && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" disabled={busyId === c.purposeId || (c.state === 'granted' && !c.outdated && !c.confirmation?.pending)} onClick={() => void decide(c, true)} className={primaryButtonClass}>
                                    {t(c.confirmation?.pending ? 'privacy.member.confirmAction' : 'privacy.member.grant')}
                                </button>
                                <button type="button" disabled={busyId === c.purposeId || c.state === 'revoked'} onClick={() => void decide(c, false)} className={secondaryButtonClass}>
                                    {t(c.state === 'granted' ? 'privacy.member.revoke' : 'privacy.member.decline')}
                                </button>
                            </div>
                        )}
                        {board &&
                            (proofFor === c.purposeId ? (
                                <fieldset className="mt-3 space-y-2 rounded-lg bg-muted/50 p-3" disabled={busyId === c.purposeId}>
                                    <legend className="px-1 text-xs font-semibold text-foreground">{t('privacy.proof.title')}</legend>
                                    <p className="text-xs text-muted-foreground">{t('privacy.proof.hint')}</p>
                                    <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
                                        <label className="block">
                                            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.proof.date')}</span>
                                            <input type="date" value={proofDate} max={todayIso()} onChange={(e) => setProofDate(e.target.value)} className={inputClass} required />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.proof.source')}</span>
                                            <input value={proofSource} maxLength={PROOF_SOURCE_MAX} placeholder={t('privacy.proof.sourcePlaceholder')} onChange={(e) => setProofSource(e.target.value)} className={inputClass} required />
                                        </label>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => submitProof(c, true)} className={primaryButtonClass}>
                                            {t('privacy.proof.grant')}
                                        </button>
                                        <button type="button" onClick={() => submitProof(c, false)} className={secondaryButtonClass}>
                                            {t('privacy.proof.decline')}
                                        </button>
                                        <button type="button" onClick={() => setProofFor(null)} className="text-sm text-muted-foreground hover:text-foreground">
                                            {t('privacy.cancel')}
                                        </button>
                                    </div>
                                </fieldset>
                            ) : (
                                <button type="button" onClick={() => openProof(c)} className={`mt-3 ${secondaryButtonClass}`}>
                                    {t('privacy.proof.open')}
                                </button>
                            ))}
                    </li>
                ))}
            </ul>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {showHistory && <ConsentHistory events={data.history ?? []} purposes={consents} />}
        </div>
    );
}

/** The append-only decisions of the person, newest first; the paper proof (date, source) shows where it exists. */
function ConsentHistory({ events, purposes }: { events: ConsentEvent[]; purposes: MemberConsent[] }) {
    const { t, language } = useLanguage();
    const name = (e: ConsentEvent) => purposes.find((p) => p.purposeId === e.purposeId)?.name ?? e.purposeKey;
    return (
        <section aria-label={t('privacy.history.title')}>
            <h3 className="text-sm font-semibold text-foreground">{t('privacy.history.title')}</h3>
            {events.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{t('privacy.history.empty')}</p>
            ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                    {events.map((e) => (
                        <li key={e.id} className="rounded-lg border border-border px-3 py-2">
                            <span className="font-medium text-foreground">{name(e)}</span>
                            <span className="text-muted-foreground">
                                {' · '}
                                {t(`privacy.history.action.${e.action}`)}
                                {' · '}
                                {formatDate(e.createdAt, language)}
                                {e.givenBy ? ` · ${t(`privacy.given.${e.givenBy}`)}` : ''}
                                {` · ${t('privacy.history.version', { version: e.version })}`}
                            </span>
                            {(e.proofDate || e.proofSource) && (
                                <p className="mt-0.5 text-xs text-muted-foreground">{t('privacy.history.proof', { date: e.proofDate ? formatDate(e.proofDate, language) : '—', source: e.proofSource ?? '—' })}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
