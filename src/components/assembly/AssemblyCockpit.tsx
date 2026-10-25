'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, LogIn, LogOut } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { type AgendaItem, type QuorumStatus, type VotingRollEntry, assemblyErrorKey } from '@/lib/assembly';
import { formatDate } from '@/lib/clubMembers';
import { useLanguage } from '@/contexts/LanguageContext';
import { dangerBtn, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import BallotsManager from '@/components/assembly/BallotsManager';
import { ErrorText, MemberPicker, Notice, type PickedMember } from '@/components/assembly/shared';

interface RollResponse {
    frozen: boolean;
    frozenAt: string | null;
    asOf: string;
    eligibleTotal: number;
    entries: VotingRollEntry[];
}

interface AttendanceEntry {
    clubMemberId: string | null;
    present: boolean;
}

interface ProxyRow {
    id: string;
    grantorClubMemberId: string | null;
    grantorName: string | null;
    holderClubMemberId: string | null;
    holderName: string | null;
}

/** Live quorum with numbers and a text verdict (icon and words, not only colour). */
function QuorumBar({ q }: { q: QuorumStatus }) {
    const { t } = useLanguage();
    return (
        <div className="rounded-xl border border-border bg-background p-4" aria-live="polite">
            <p className="text-lg font-bold text-foreground sm:text-2xl">{t(`assembly.quorum.${q.result}`)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
                {t('assembly.quorum.numbers', { present: q.presentEligible, proxies: q.proxiesRepresented, represented: q.represented, eligible: q.eligibleTotal })}
                {q.required !== null && ` · ${t('assembly.quorum.required', { required: q.required })}`}
            </p>
            {q.result === 'regeln_fehlen' && <p className="mt-1 text-xs text-warning">{t('assembly.quorum.rulesMissing')}</p>}
            {!q.rollFrozen && <p className="mt-1 text-xs text-muted-foreground">{t('assembly.quorum.live')}</p>}
        </div>
    );
}

/**
 * Cockpit while the assembly runs (Wave 11 W3): live quorum, check-in list (members without account included), proxies, freezing the
 * voting roll and the digital ballots. Large controls for tablet and projector use.
 */
export default function AssemblyCockpit({ clubId, meetingId, canManage }: { clubId: string; meetingId: string; canManage: boolean }) {
    const { t, language } = useLanguage();
    const [roll, setRoll] = useState<RollResponse | null>(null);
    const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
    const [quorum, setQuorum] = useState<QuorumStatus | null>(null);
    const [proxies, setProxies] = useState<ProxyRow[]>([]);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [failed, setFailed] = useState(false);
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [grantor, setGrantor] = useState<PickedMember | null>(null);
    const [holder, setHolder] = useState<PickedMember | null>(null);
    const [overrideFor, setOverrideFor] = useState<VotingRollEntry | null>(null);
    const [overrideReason, setOverrideReason] = useState('');
    const { confirm, dialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            const base = `/meetings/${meetingId}`;
            const [r, a, q, p, ag] = await Promise.all([
                apiFetch<{ data: RollResponse }>(`${base}/voting-roll?clubId=${clubId}`),
                apiFetch<{ data: AttendanceEntry[] }>(`${base}/attendance?clubId=${clubId}`),
                apiFetch<{ data: QuorumStatus }>(`${base}/quorum?clubId=${clubId}`),
                apiFetch<{ data: ProxyRow[] }>(`${base}/proxies?clubId=${clubId}`),
                apiFetch<{ data: AgendaItem[] }>(`${base}/agenda-items?clubId=${clubId}`),
            ]);
            setRoll(r.data);
            setAttendance(a.data);
            setQuorum(q.data);
            setProxies(p.data);
            setAgenda(ag.data);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [clubId, meetingId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    // The quorum is the number the room watches: refresh quietly every 20 seconds.
    useEffect(() => {
        const timer = setInterval(() => {
            apiFetch<{ data: QuorumStatus }>(`/meetings/${meetingId}/quorum?clubId=${clubId}`)
                .then((res) => setQuorum(res.data))
                .catch(() => undefined);
        }, 20_000);
        return () => clearInterval(timer);
    }, [clubId, meetingId]);

    const presentIds = useMemo(() => new Set(attendance.filter((a) => a.present && a.clubMemberId).map((a) => a.clubMemberId as string)), [attendance]);
    const proxyGrantors = useMemo(() => new Set(proxies.map((p) => p.grantorClubMemberId).filter((v): v is string => !!v)), [proxies]);

    const entries = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (roll?.entries ?? []).filter((e) => term === '' || (e.displayName ?? '').toLowerCase().includes(term));
    }, [roll, search]);

    if (failed && !roll) return <LoadError onRetry={() => void load()} />;
    if (!roll || !quorum) return <LoadingText />;

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
            return true;
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
            return false;
        } finally {
            setBusy(false);
        }
    }

    const setPresent = (clubMemberId: string, present: boolean) =>
        run(() => apiFetch(`/meetings/${meetingId}/attendance?clubId=${clubId}`, { method: 'PATCH', body: [{ clubMemberId, present }] }));

    async function freeze() {
        if (!(await confirm({ title: t('assembly.roll.freeze'), body: t('assembly.roll.freeze.confirm'), confirmLabel: t('assembly.roll.freeze') }))) return;
        await run(() => apiFetch(`/meetings/${meetingId}/voting-roll/freeze?clubId=${clubId}`, { method: 'POST', body: {} }));
    }

    async function saveOverride() {
        if (!overrideFor) return;
        const ok = await run(() => apiFetch(`/meetings/${meetingId}/voting-roll/${overrideFor.clubMemberId}?clubId=${clubId}`, { method: 'PATCH', body: { eligible: !overrideFor.eligible, reason: overrideReason.trim() } }));
        if (ok) {
            setOverrideFor(null);
            setOverrideReason('');
        }
    }

    async function addProxy() {
        if (!grantor || !holder) return;
        const ok = await run(() => apiFetch(`/meetings/${meetingId}/proxies?clubId=${clubId}`, { method: 'POST', body: { grantorClubMemberId: grantor.id, holderClubMemberId: holder.id } }));
        if (ok) {
            setGrantor(null);
            setHolder(null);
        }
    }

    const bigBtn = 'min-h-12 rounded-xl px-5 py-3 text-base font-semibold disabled:opacity-50';

    return (
        <div className="space-y-4">
            <QuorumBar q={quorum} />
            {error && <ErrorText>{error}</ErrorText>}

            <SectionCard
                title={t('assembly.roll.title')}
                action={
                    canManage &&
                    !roll.frozen && (
                        <button type="button" disabled={busy} onClick={() => void freeze()} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                            <Lock className="h-4 w-4" aria-hidden />
                            {t('assembly.roll.freeze')}
                        </button>
                    )
                }
            >
                <div className="space-y-3">
                    <p className="text-sm text-foreground">
                        {roll.frozen ? t('assembly.roll.frozen', { date: formatDate(roll.frozenAt, language), total: roll.eligibleTotal }) : t('assembly.roll.live', { total: roll.eligibleTotal, date: formatDate(roll.asOf, language) })}
                    </p>
                    {!roll.frozen && <Notice>{t('assembly.roll.freezeHint')}</Notice>}
                    <div>
                        <label htmlFor="ck-search" className={labelClass}>
                            {t('assembly.checkin.search')}
                        </label>
                        <input id="ck-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={inputClass} />
                    </div>
                    {entries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('assembly.checkin.empty')}</p>
                    ) : (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                            {entries.map((e) => {
                                const present = presentIds.has(e.clubMemberId);
                                const gaveProxy = proxyGrantors.has(e.clubMemberId);
                                return (
                                    <li key={e.clubMemberId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                                        <div className="min-w-0">
                                            <p className="text-base font-semibold text-foreground">{e.displayName ?? '—'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t(e.eligible ? 'assembly.roll.eligible' : 'assembly.roll.notEligible')} · {t(`assembly.basis.${e.basis}`)}
                                                {e.overrideReason && ` · ${e.overrideReason}`}
                                                {gaveProxy && ` · ${t('assembly.checkin.gaveProxy')}`}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {canManage && (
                                                <button type="button" disabled={busy} onClick={() => setOverrideFor(e)} className={`${secondaryBtn} !px-3 !py-2`}>
                                                    {t('assembly.roll.override')}
                                                </button>
                                            )}
                                            {present ? (
                                                <button type="button" disabled={busy} aria-pressed onClick={() => void setPresent(e.clubMemberId, false)} className={`${bigBtn} inline-flex items-center gap-2 bg-success/15 text-success`}>
                                                    <LogOut className="h-5 w-5" aria-hidden />
                                                    {t('assembly.checkin.leave')}
                                                    <span className="sr-only">{e.displayName}</span>
                                                </button>
                                            ) : (
                                                <button type="button" disabled={busy || gaveProxy} onClick={() => void setPresent(e.clubMemberId, true)} className={`${bigBtn} inline-flex items-center gap-2 bg-primary text-primary-foreground`}>
                                                    <LogIn className="h-5 w-5" aria-hidden />
                                                    {t('assembly.checkin.arrive')}
                                                    <span className="sr-only">{e.displayName}</span>
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </SectionCard>

            <SectionCard title={t('assembly.proxy.title')}>
                <div className="space-y-3">
                    {proxies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('assembly.proxy.empty')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {proxies.map((p) => (
                                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                                    <span>{t('assembly.proxy.line', { grantor: p.grantorName ?? '—', holder: p.holderName ?? '—' })}</span>
                                    {canManage && p.grantorClubMemberId && (
                                        <button type="button" disabled={busy} onClick={() => void run(() => apiFetch(`/meetings/${meetingId}/proxies/${p.grantorClubMemberId}?clubId=${clubId}`, { method: 'DELETE' }))} className={`${dangerBtn} !px-3 !py-1.5`}>
                                            {t('assembly.proxy.revoke')}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {canManage && (
                        <div className="space-y-3 border-t border-border pt-3">
                            <p className="text-sm font-semibold text-foreground">{t('assembly.proxy.record')}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    {grantor ? <p className="text-sm text-foreground">{t('assembly.proxy.grantor')}: <strong>{grantor.name}</strong></p> : <MemberPicker clubId={clubId} label={t('assembly.proxy.grantor')} onPick={setGrantor} />}
                                </div>
                                <div>
                                    {holder ? <p className="text-sm text-foreground">{t('assembly.proxy.holder')}: <strong>{holder.name}</strong></p> : <MemberPicker clubId={clubId} label={t('assembly.proxy.holder')} onPick={setHolder} excludeIds={grantor ? [grantor.id] : []} />}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" disabled={busy || !grantor || !holder} onClick={() => void addProxy()} className={primaryBtn}>
                                    {t('assembly.proxy.add')}
                                </button>
                                {(grantor || holder) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGrantor(null);
                                            setHolder(null);
                                        }}
                                        className={secondaryBtn}
                                    >
                                        {t('assembly.picker.clear')}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            {canManage && <BallotsManager clubId={clubId} mode="in_session" meetingId={meetingId} agendaItems={agenda} />}

            {overrideFor && (
                <SectionCard title={t('assembly.roll.override')}>
                    <div className="space-y-3">
                        <p className="text-sm text-foreground">{t(overrideFor.eligible ? 'assembly.roll.override.revoke' : 'assembly.roll.override.grant', { name: overrideFor.displayName ?? '—' })}</p>
                        <div>
                            <label htmlFor="ov-reason" className={labelClass}>
                                {t('assembly.roll.override.reason')} *
                            </label>
                            <input id="ov-reason" type="text" minLength={5} maxLength={500} value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} className={inputClass} />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" disabled={busy || overrideReason.trim().length < 5} onClick={() => void saveOverride()} className={primaryBtn}>
                                {t('assembly.roll.override.save')}
                            </button>
                            <button type="button" onClick={() => setOverrideFor(null)} className={secondaryBtn}>
                                {t('treffen.cancel')}
                            </button>
                        </div>
                    </div>
                </SectionCard>
            )}
            {dialog}
        </div>
    );
}
