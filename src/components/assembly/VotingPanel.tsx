'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, CircleDot, Square, SquareCheck } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { type Ballot, type BallotDetail, assemblyErrorKey, groupForVoter, isYesNo, selectionValid, timeLeft, toggleSelection } from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard } from '@/components/standorte/ui';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import BallotResult from '@/components/assembly/BallotResult';
import { ErrorText, Notice, formatWhen } from '@/components/assembly/shared';

type Step = 'choose' | 'review' | 'done';

function Countdown({ until }: { until: string | null }) {
    const { t } = useLanguage();
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);
    const left = timeLeft(until, now);
    if (!left) return <span>{t('assembly.vote.noDeadline')}</span>;
    if (left.over) return <span>{t('assembly.vote.deadlinePassed')}</span>;
    return <span>{t('assembly.vote.timeLeft', { days: left.days, hours: left.hours, minutes: left.minutes })}</span>;
}

/**
 * One vote in three steps: choose, check the summary, confirm. The server never answers with the choice; for a secret ballot the
 * person only gets the confirmation that they took part. `forClubMemberId` votes for a grantor as the proxy holder.
 */
function VoteFlow({ clubId, ballot, forClubMemberId, forName, onVoted }: { clubId: string; ballot: BallotDetail; forClubMemberId?: string; forName?: string | null; onVoted: () => void }) {
    const { t } = useLanguage();
    const [selected, setSelected] = useState<string[]>([]);
    const [step, setStep] = useState<Step>('choose');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const single = ballot.maxChoices === 1 || isYesNo(ballot);

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/ballots/${ballot.id}/vote?clubId=${clubId}`, { method: 'POST', body: { optionIds: selected, ...(forClubMemberId ? { forClubMemberId } : {}) } });
            setStep('done');
            onVoted();
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
            setStep('choose');
        } finally {
            setBusy(false);
        }
    }

    if (step === 'done') {
        return (
            <div role="status" className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
                <div>
                    <p className="text-base font-bold text-foreground">{t(ballot.secret ? 'assembly.vote.done.secret' : 'assembly.vote.done.open')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t(ballot.secret ? 'assembly.vote.done.secretNote' : 'assembly.vote.done.openNote')}</p>
                </div>
            </div>
        );
    }

    if (step === 'review') {
        return (
            <div className="space-y-3">
                <p className="text-base font-semibold text-foreground">{t('assembly.vote.review')}</p>
                {forName && <p className="text-sm text-foreground">{t('assembly.vote.forProxy', { name: forName })}</p>}
                <ul className="rounded-lg border border-border bg-background p-3 text-base text-foreground">
                    {selected.map((id) => (
                        <li key={id}>{ballot.options.find((o) => o.id === id)?.label}</li>
                    ))}
                </ul>
                <Notice>{t(ballot.secret ? 'assembly.vote.explain.secret' : 'assembly.vote.explain.open')}</Notice>
                <p className="text-sm text-muted-foreground">{t('assembly.vote.final')}</p>
                {error && <ErrorText>{error}</ErrorText>}
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void submit()} className={`${primaryBtn} min-h-12 !px-6 !text-base`} autoFocus>
                        {t('assembly.vote.submit')}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setStep('choose')} className={`${secondaryBtn} min-h-12`}>
                        {t('assembly.vote.back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-foreground">
                {forName ? t('assembly.vote.chooseFor', { name: forName }) : t('assembly.vote.choose')}
                {!single && <span className="ml-2 text-sm font-normal text-muted-foreground">{t('assembly.vote.maxChoices', { count: ballot.maxChoices })}</span>}
            </legend>
            <div role={single ? 'radiogroup' : 'group'} className="space-y-2">
                {ballot.options.map((o) => {
                    const on = selected.includes(o.id);
                    const Icon = single ? (on ? CircleDot : Circle) : on ? SquareCheck : Square;
                    return (
                        <button
                            key={o.id}
                            type="button"
                            role={single ? 'radio' : 'checkbox'}
                            aria-checked={on}
                            onClick={() => setSelected((s) => toggleSelection(ballot, s, o.id))}
                            className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${on ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted'}`}
                        >
                            <Icon className={`h-6 w-6 shrink-0 ${on ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden />
                            {o.label}
                        </button>
                    );
                })}
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <button type="button" disabled={!selectionValid(ballot, selected)} onClick={() => setStep('review')} className={`${primaryBtn} min-h-12 !px-6 !text-base`}>
                {t('assembly.vote.next')}
            </button>
        </fieldset>
    );
}

/** A ballot open for voting: what it is about, the rules, the deadline and the three-step vote (plus one per proxy). */
function OpenBallot({ clubId, ballot, onVoted }: { clubId: string; ballot: Ballot; onVoted: () => void }) {
    const { t } = useLanguage();
    const [detail, setDetail] = useState<BallotDetail | null>(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: BallotDetail }>(`/ballots/${ballot.id}?clubId=${clubId}`);
            setDetail(res.data);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [ballot.id, clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const me = detail?.me;
    return (
        <li className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground">{ballot.title}</h3>
                    <p className="text-xs text-muted-foreground">
                        {t(ballot.mode === 'circular' ? 'assembly.vote.kind.circular' : 'assembly.vote.kind.session')} · {t(ballot.secret ? 'assembly.ballot.secret' : 'assembly.ballot.open')}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                        <Countdown until={ballot.closesAt} />
                        {ballot.closesAt && <span className="ml-1 text-xs font-normal text-muted-foreground">({formatWhen(ballot.closesAt, 'de')})</span>}
                    </p>
                </div>
            </div>

            {/* Open ballots are expanded right away: choose, check, confirm = three clicks. */}
            {(
                <div className="mt-4 space-y-4">
                    {failed && !detail && <LoadError onRetry={() => void load()} />}
                    {!detail && !failed && <LoadingText />}
                    {detail && me && (
                        <>
                            {detail.description && <p className="whitespace-pre-line text-sm text-foreground">{detail.description}</p>}
                            {detail.secret && <Notice>{t('assembly.vote.secretNotice')}</Notice>}
                            {!me.eligible && <Notice tone="warning">{t('assembly.vote.notEligible')}</Notice>}
                            {me.eligible && me.hasVoted && (
                                <div role="status" className="flex items-center gap-2 text-sm font-medium text-success">
                                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                                    {t(detail.secret ? 'assembly.vote.alreadyVoted.secret' : 'assembly.vote.alreadyVoted')}
                                </div>
                            )}
                            {me.eligible && !me.hasVoted && me.checkedIn === false && detail.mode === 'in_session' && <Notice tone="warning">{t('assembly.vote.notCheckedIn')}</Notice>}
                            {me.canVote && <VoteFlow clubId={clubId} ballot={detail} onVoted={() => void load().then(onVoted)} />}
                            {me.proxies
                                .filter((p) => !p.hasVoted)
                                .map((p) => (
                                    <div key={p.grantorClubMemberId} className="rounded-lg border border-border p-3">
                                        <VoteFlow clubId={clubId} ballot={detail} forClubMemberId={p.grantorClubMemberId} forName={p.displayName} onVoted={() => void load().then(onVoted)} />
                                    </div>
                                ))}
                            {me.proxies.filter((p) => p.hasVoted).map((p) => (
                                <p key={p.grantorClubMemberId} className="text-sm text-muted-foreground">
                                    {t('assembly.vote.proxyVoted', { name: p.displayName ?? '—' })}
                                </p>
                            ))}
                        </>
                    )}
                </div>
            )}
        </li>
    );
}

/** "Abstimmungen" for members: open, upcoming and finished ballots with designed empty, loading and error states. */
export default function VotingPanel({ clubId }: { clubId: string }) {
    const { t, language } = useLanguage();
    const [ballots, setBallots] = useState<Ballot[] | null>(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: Ballot[] }>(`/ballots?clubId=${clubId}`);
            setBallots(res.data);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (failed && !ballots) return <LoadError onRetry={() => void load()} />;
    if (!ballots) return <LoadingText />;

    const groups = groupForVoter(ballots);
    const none = groups.open.length + groups.upcoming.length + groups.closed.length === 0;

    return (
        <div className="space-y-4">
            {none && (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <p className="text-base font-semibold text-foreground">{t('assembly.vote.empty.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('assembly.vote.empty.body')}</p>
                </div>
            )}

            {groups.open.length > 0 && (
                <SectionCard title={t('assembly.vote.section.open')}>
                    <ul className="space-y-3">
                        {groups.open.map((b) => (
                            <OpenBallot key={b.id} clubId={clubId} ballot={b} onVoted={() => void load()} />
                        ))}
                    </ul>
                </SectionCard>
            )}

            {groups.upcoming.length > 0 && (
                <SectionCard title={t('assembly.vote.section.upcoming')}>
                    <ul className="space-y-2">
                        {groups.upcoming.map((b) => (
                            <li key={b.id} className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">
                                <p className="font-semibold">{b.title}</p>
                                <p className="text-xs text-muted-foreground">{t('assembly.vote.startsAt', { when: formatWhen(b.opensAt, language) })}</p>
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            )}

            {groups.closed.length > 0 && (
                <SectionCard title={t('assembly.vote.section.closed')}>
                    <ul className="space-y-2">
                        {groups.closed.map((b) => (
                            <li key={b.id} className="space-y-2 rounded-lg border border-border bg-background p-3">
                                <p className="text-sm font-semibold text-foreground">{b.title}</p>
                                <p className="text-xs text-muted-foreground">{t('assembly.vote.endedAt', { when: formatWhen(b.closedAt ?? b.closesAt, language) })}</p>
                                {b.status === 'finalized' && b.result ? <BallotResult ballot={b} /> : <p className="text-sm text-muted-foreground">{t('assembly.vote.resultPending')}</p>}
                            </li>
                        ))}
                    </ul>
                </SectionCard>
            )}
        </div>
    );
}
