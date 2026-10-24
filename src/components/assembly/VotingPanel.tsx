'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Circle, CircleDot, Square, SquareCheck } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { type Ballot, type BallotDetail, assemblyErrorKey, groupForVoter, isAlreadyVoted, isYesNo, selectionValid, timeLeft, toggleSelection } from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard } from '@/components/standorte/ui';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import BallotResult from '@/components/assembly/BallotResult';
import { ErrorText, Notice, formatWhen } from '@/components/assembly/shared';

type Step = 'choose' | 'review';

/** Current time, refreshed every 30 seconds (countdown and the "deadline passed" lock). */
function useNow(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);
    return now;
}

function Countdown({ until, now }: { until: string | null; now: number }) {
    const { t } = useLanguage();
    const left = timeLeft(until, now);
    return (
        <span role="timer" aria-live="off">
            {!left ? t('assembly.vote.noDeadline') : left.over ? t('assembly.vote.deadlinePassed') : t('assembly.vote.timeLeft', { days: left.days, hours: left.hours, minutes: left.minutes })}
        </span>
    );
}

/** Confirmation after a counted vote; stays on screen when the ballot detail reloads. A secret ballot confirms the participation only. */
function VotedConfirmation({ secret, synced = false }: { secret: boolean; synced?: boolean }) {
    const { t } = useLanguage();
    return (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
            <div>
                <p className="text-base font-bold text-foreground">{t(secret ? 'assembly.vote.done.secret' : 'assembly.vote.done.open')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{synced ? t('assembly.vote.synced') : t(secret ? 'assembly.vote.done.secretNote' : 'assembly.vote.done.openNote')}</p>
            </div>
        </div>
    );
}

/**
 * One vote in two steps (choose, check the summary) plus the binding click: three clicks in total. The server never answers with the
 * choice. `forClubMemberId` votes for a grantor as the proxy holder. The confirmation itself is rendered by the parent so it survives
 * the reload of the ballot.
 */
function VoteFlow({ clubId, ballot, forClubMemberId, forName, locked, onVoted, onFailed }: { clubId: string; ballot: BallotDetail; forClubMemberId?: string; forName?: string | null; locked: boolean; onVoted: (alreadyCounted: boolean) => void; onFailed: () => void }) {
    const { t } = useLanguage();
    const groupName = useId();
    const [selected, setSelected] = useState<string[]>([]);
    const [step, setStep] = useState<Step>('choose');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submitting = useRef(false);
    const headingRef = useRef<HTMLParagraphElement>(null);
    const errorRef = useRef<HTMLDivElement>(null);
    const single = ballot.maxChoices === 1 || isYesNo(ballot);
    const valid = selectionValid(ballot, selected);

    // Focus follows the step: the new step's heading, or the error after a failed vote.
    const [moved, setMoved] = useState(0);
    useEffect(() => {
        if (moved === 0) return;
        (errorRef.current?.textContent ? errorRef.current : headingRef.current)?.focus();
    }, [moved]);

    async function submit() {
        if (submitting.current || locked) return;
        submitting.current = true;
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/ballots/${ballot.id}/vote?clubId=${clubId}`, { method: 'POST', body: { optionIds: selected, ...(forClubMemberId ? { forClubMemberId } : {}) } });
            onVoted(false);
        } catch (err) {
            // A second submit that lost the race: the vote is recorded, so this is a success.
            if (isAlreadyVoted(err)) {
                onVoted(true);
            } else {
                setError(t(assemblyErrorKey(err)));
                setStep('choose');
                setMoved((n) => n + 1);
                // The ballot may have closed or changed meanwhile: show its real state.
                onFailed();
            }
        } finally {
            submitting.current = false;
            setBusy(false);
        }
    }

    if (locked) return <Notice tone="warning">{t('assembly.vote.closedNow')}</Notice>;

    if (step === 'review') {
        return (
            <div className="space-y-3">
                <p ref={headingRef} tabIndex={-1} className="text-base font-semibold text-foreground outline-none">
                    {t('assembly.vote.review')}
                </p>
                {forName && <p className="text-sm text-foreground">{t('assembly.vote.forProxy', { name: forName })}</p>}
                <ul className="rounded-lg border border-border bg-background p-3 text-base text-foreground">
                    {selected.map((id) => (
                        <li key={id}>{ballot.options.find((o) => o.id === id)?.label}</li>
                    ))}
                </ul>
                <Notice>{t(ballot.secret ? 'assembly.vote.explain.secret' : 'assembly.vote.explain.open')}</Notice>
                <p className="text-sm text-muted-foreground">{t('assembly.vote.final')}</p>
                <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void submit()} className={`${primaryBtn} min-h-12 !px-6 !text-base`}>
                        {t('assembly.vote.submit')}
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                            setStep('choose');
                            setMoved((n) => n + 1);
                        }}
                        className={`${secondaryBtn} min-h-12`}
                    >
                        {t('assembly.vote.back')}
                    </button>
                </div>
            </div>
        );
    }

    const hintId = `${groupName}-hint`;
    return (
        <fieldset className="space-y-3">
            <legend className="text-base font-semibold text-foreground">
                {forName ? t('assembly.vote.chooseFor', { name: forName }) : t('assembly.vote.choose')}
                {!single && <span className="ml-2 text-sm font-normal text-muted-foreground">{t('assembly.vote.maxChoices', { count: ballot.maxChoices })}</span>}
            </legend>
            <div ref={errorRef} tabIndex={-1} className="outline-none">
                {error && <ErrorText>{error}</ErrorText>}
            </div>
            <p ref={headingRef} tabIndex={-1} className="sr-only">
                {forName ? t('assembly.vote.chooseFor', { name: forName }) : t('assembly.vote.choose')}
            </p>
            <div className="space-y-2">
                {ballot.options.map((o) => {
                    const on = selected.includes(o.id);
                    const Icon = single ? (on ? CircleDot : Circle) : on ? SquareCheck : Square;
                    return (
                        <label
                            key={o.id}
                            className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base font-medium text-foreground focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${on ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted'}`}
                        >
                            <input type={single ? 'radio' : 'checkbox'} name={groupName} checked={on} onChange={() => setSelected((s) => toggleSelection(ballot, s, o.id))} className="sr-only" />
                            <Icon className={`h-6 w-6 shrink-0 ${on ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden />
                            {o.label}
                        </label>
                    );
                })}
            </div>
            <button
                type="button"
                aria-disabled={!valid}
                aria-describedby={valid ? undefined : hintId}
                onClick={() => {
                    if (!valid) return;
                    setStep('review');
                    setMoved((n) => n + 1);
                }}
                className={`${primaryBtn} min-h-12 !px-6 !text-base ${valid ? '' : 'cursor-not-allowed opacity-50'}`}
            >
                {t('assembly.vote.next')}
            </button>
            {!valid && (
                <p id={hintId} className="text-sm text-muted-foreground">
                    {single ? t('assembly.vote.next.hint') : t('assembly.vote.next.hintMax', { count: ballot.maxChoices })}
                </p>
            )}
        </fieldset>
    );
}

/** A ballot open for voting: what it is about, the rules, the deadline and the vote (plus one per proxy). */
function OpenBallot({ clubId, ballot, onVoted }: { clubId: string; ballot: Ballot; onVoted: () => void }) {
    const { t, language } = useLanguage();
    const now = useNow();
    const [detail, setDetail] = useState<BallotDetail | null>(null);
    const [failed, setFailed] = useState(false);
    // Who was voted for in this session ("self" or the grantor id): the confirmation stays even after the detail reloads.
    const [voted, setVoted] = useState<Record<string, 'counted' | 'synced'>>({});

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
    const over = timeLeft(ballot.closesAt, now)?.over === true;
    const record = (key: string) => (alreadyCounted: boolean) => {
        setVoted((v) => ({ ...v, [key]: alreadyCounted ? 'synced' : 'counted' }));
        void load().then(onVoted);
    };

    return (
        <li className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground">{ballot.title}</h3>
                    <p className="text-xs text-muted-foreground">
                        {t(ballot.mode === 'circular' ? 'assembly.vote.kind.circular' : 'assembly.vote.kind.session')} · {t(ballot.secret ? 'assembly.ballot.secret' : 'assembly.ballot.open')}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                        <Countdown until={ballot.closesAt} now={now} />
                        {ballot.closesAt && <span className="ml-1 text-xs font-normal text-muted-foreground">({formatWhen(ballot.closesAt, language)})</span>}
                    </p>
                </div>
            </div>

            {/* Open ballots are expanded right away: choose, check, confirm = three clicks. */}
            <div className="mt-4 space-y-4">
                {failed && !detail && <LoadError onRetry={() => void load()} />}
                {!detail && !failed && <LoadingText />}
                {detail && me && (
                    <>
                        {detail.description && <p className="whitespace-pre-line text-sm text-foreground">{detail.description}</p>}
                        {detail.secret && <Notice>{t('assembly.vote.secretNotice')}</Notice>}
                        {!me.eligible && <Notice tone="warning">{t('assembly.vote.notEligible')}</Notice>}
                        {voted.self ? (
                            <VotedConfirmation secret={detail.secret} synced={voted.self === 'synced'} />
                        ) : (
                            me.eligible &&
                            me.hasVoted && (
                                <div role="status" className="flex items-center gap-2 text-sm font-medium text-success">
                                    <CheckCircle2 className="h-5 w-5" aria-hidden />
                                    {t(detail.secret ? 'assembly.vote.alreadyVoted.secret' : 'assembly.vote.alreadyVoted')}
                                </div>
                            )
                        )}
                        {me.eligible && !me.hasVoted && me.checkedIn === false && detail.mode === 'in_session' && <Notice tone="warning">{t('assembly.vote.notCheckedIn')}</Notice>}
                        {me.canVote && !voted.self && <VoteFlow clubId={clubId} ballot={detail} locked={over} onVoted={record('self')} onFailed={() => void load()} />}
                        {me.proxies.map((p) =>
                            voted[p.grantorClubMemberId] ? (
                                <VotedConfirmation key={p.grantorClubMemberId} secret={detail.secret} synced={voted[p.grantorClubMemberId] === 'synced'} />
                            ) : p.hasVoted ? (
                                <p key={p.grantorClubMemberId} className="text-sm text-muted-foreground">
                                    {t('assembly.vote.proxyVoted', { name: p.displayName ?? '—' })}
                                </p>
                            ) : (
                                <div key={p.grantorClubMemberId} className="rounded-lg border border-border p-3">
                                    <VoteFlow clubId={clubId} ballot={detail} forClubMemberId={p.grantorClubMemberId} forName={p.displayName} locked={over} onVoted={record(p.grantorClubMemberId)} onFailed={() => void load()} />
                                </div>
                            ),
                        )}
                        <p className="text-xs text-muted-foreground">{t('assembly.vote.assumption')}</p>
                    </>
                )}
            </div>
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
