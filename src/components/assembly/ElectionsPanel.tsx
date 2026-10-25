'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import {
    type Ballot,
    DEPARTMENT_ROLE_TYPES,
    ELECTION_ROLE_TYPES,
    type Election,
    type ElectionCandidate,
    type ElectionListItem,
    assemblyErrorKey,
    canDecide,
    roundCandidates,
    runningRound,
} from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { dangerBtn, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard, Toggle } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { BallotCard } from '@/components/assembly/BallotsManager';
import { ErrorText, MemberPicker, Notice, type PickedMember } from '@/components/assembly/shared';

interface MeetingRef {
    id: string;
    title: string;
    type: string;
    scheduledAt: string | null;
}

interface DepartmentRef {
    id: string;
    name: string;
}

function CandidateRow({ clubId, election, candidate, canManage, ownId, busy, run }: { clubId: string; election: Election; candidate: ElectionCandidate; canManage: boolean; ownId: string | null; busy: boolean; run: (a: () => Promise<unknown>) => void }) {
    const { t } = useLanguage();
    const own = ownId !== null && candidate.id === ownId;
    const base = `/elections/${election.id}/candidates/${candidate.id}`;
    const patch = (status: string) => run(() => apiFetch(`${base}?clubId=${clubId}`, { method: 'PATCH', body: { status } }));
    const accept = (value: boolean) => run(() => apiFetch(`${base}/accept?clubId=${clubId}`, { method: 'POST', body: { accept: value } }));
    return (
        <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{candidate.displayName ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                    {t(`assembly.candidate.${candidate.status}`)}
                    {canManage && candidate.hasAccount === false && ` · ${t('assembly.picker.noAccount')}`}
                </p>
            </div>
            <div className="flex flex-wrap gap-2">
                {(own || canManage) && (candidate.status === 'proposed' || candidate.status === 'declined' || candidate.status === 'withdrawn') && (
                    <button type="button" disabled={busy} onClick={() => patch('willing')} className={`${secondaryBtn} !px-3 !py-1.5`}>
                        {t('assembly.candidate.action.willing')}
                    </button>
                )}
                {(own || canManage) && candidate.status === 'proposed' && (
                    <button type="button" disabled={busy} onClick={() => patch('declined')} className={`${secondaryBtn} !px-3 !py-1.5`}>
                        {t('assembly.candidate.action.decline')}
                    </button>
                )}
                {(own || canManage) && candidate.status === 'willing' && (
                    <button type="button" disabled={busy} onClick={() => patch('withdrawn')} className={`${secondaryBtn} !px-3 !py-1.5`}>
                        {t('assembly.candidate.action.withdraw')}
                    </button>
                )}
                {(own || canManage) && candidate.status === 'elected' && (
                    <>
                        <button type="button" disabled={busy} onClick={() => accept(true)} className={`${primaryBtn} !px-3 !py-1.5`}>
                            {t(own ? 'assembly.candidate.action.accept' : 'assembly.candidate.action.acceptFor')}
                        </button>
                        <button type="button" disabled={busy} onClick={() => accept(false)} className={`${secondaryBtn} !px-3 !py-1.5`}>
                            {t('assembly.candidate.action.rejectOffice')}
                        </button>
                    </>
                )}
                {canManage && ['proposed', 'declined', 'withdrawn'].includes(candidate.status) && (
                    <button type="button" disabled={busy} aria-label={`${t('assembly.candidate.action.remove')}: ${candidate.displayName ?? ''}`} onClick={() => run(() => apiFetch(`${base}?clubId=${clubId}`, { method: 'DELETE' }))} className={`${dangerBtn} !px-3 !py-1.5`}>
                        {t('assembly.candidate.action.remove')}
                    </button>
                )}
            </div>
        </li>
    );
}

function ElectionDetail({ clubId, id, canManage, onBack }: { clubId: string; id: string; canManage: boolean; onBack: () => void }) {
    const { t } = useLanguage();
    const [election, setElection] = useState<Election | null>(null);
    const [roundBallots, setRoundBallots] = useState<Ballot[]>([]);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string[]>([]);
    const [secret, setSecret] = useState(false);
    const [lotIds, setLotIds] = useState<string[] | null>(null);
    const [lotNote, setLotNote] = useState('');
    const [secretAllowed, setSecretAllowed] = useState(false);
    const { confirm, dialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            const [e, b, r] = await Promise.all([
                apiFetch<{ data: Election }>(`/elections/${id}?clubId=${clubId}`),
                apiFetch<{ data: Ballot[] }>(`/ballots?clubId=${clubId}&electionId=${id}`),
                apiFetch<{ data: { rules: { secretBallotDigitalAllowed: boolean } } }>(`/club-settings/assembly?clubId=${clubId}`),
            ]);
            setElection(e.data);
            setRoundBallots([...b.data].sort((x, y) => (x.round ?? 0) - (y.round ?? 0)));
            setSecretAllowed(r.data.rules.secretBallotDigitalAllowed);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [clubId, id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (failed && !election) return <LoadError onRetry={() => void load()} />;
    if (!election) return <LoadingText />;

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
        } catch (err) {
            const code = (err as { details?: { code?: string } }).details?.code;
            if (code === 'tie_needs_lot') setLotIds([]);
            setError(t(assemblyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    const willing = roundCandidates(election);
    const running = runningRound(election);
    const lastTied = roundBallots.length > 0 ? ((roundBallots[roundBallots.length - 1]!.result?.tiedOptionIds ?? []) as string[]) : [];
    const tiedCandidates = election.candidates.filter((c) => lastTied.some((o) => roundBallots[roundBallots.length - 1]?.options.find((opt) => opt.id === o)?.candidateClubMemberId === c.clubMemberId));
    const editable = election.status !== 'decided' && election.status !== 'closed';

    return (
        <div className="space-y-4">
            <button type="button" onClick={onBack} className="text-sm font-medium text-primary hover:underline">
                ← {t('assembly.elections.back')}
            </button>
            <SectionCard title={`${t(`verein.role.${election.roleType}`)} · ${t('assembly.elections.seats', { count: election.seats })}`}>
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        {t(`assembly.election.status.${election.status}`)}
                        {election.termMonths ? ` · ${t('assembly.elections.term', { months: election.termMonths })}` : ''}
                        {election.electionLeadName ? ` · ${t('assembly.elections.lead', { name: election.electionLeadName })}` : ''}
                        {` · ${t('assembly.elections.openSeats', { count: election.openSeats })}`}
                    </p>
                    {error && <ErrorText>{error}</ErrorText>}

                    <h3 className="text-sm font-bold text-foreground">{t('assembly.elections.candidates')}</h3>
                    {election.candidates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('assembly.elections.candidates.empty')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {election.candidates.map((c) => (
                                <CandidateRow key={c.id} clubId={clubId} election={election} candidate={c} canManage={canManage} ownId={election.me?.candidateId ?? null} busy={busy} run={(a) => void run(a)} />
                            ))}
                        </ul>
                    )}
                    {canManage && editable && <ProposeCandidate clubId={clubId} electionId={election.id} exclude={election.candidates.map((c) => c.clubMemberId).filter((v): v is string => !!v)} busy={busy} run={(a) => void run(a)} />}
                </div>
            </SectionCard>

            <SectionCard title={t('assembly.elections.rounds')}>
                <div className="space-y-3">
                    <Notice>{t('assembly.elections.accessible')}</Notice>
                    {roundBallots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('assembly.elections.rounds.empty')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {roundBallots.map((b) => (
                                <BallotCard key={b.id} clubId={clubId} ballot={b} onChanged={() => void load()} />
                            ))}
                        </ul>
                    )}

                    {canManage && editable && !running && (
                        <fieldset className="space-y-2 rounded-lg border border-border p-3">
                            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('assembly.elections.round.new')}</legend>
                            {!election.meetingId && <Notice tone="warning">{t('assembly.elections.needMeeting')}</Notice>}
                            {willing.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('assembly.elections.round.noWilling')}</p>
                            ) : (
                                <div className="space-y-1">
                                    <p className={labelClass}>{t('assembly.elections.round.candidates')}</p>
                                    {willing.map((c) => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                                            <input type="checkbox" checked={selected.includes(c.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} />
                                            {c.displayName ?? '—'}
                                        </label>
                                    ))}
                                </div>
                            )}
                            <Toggle checked={secret} onChange={setSecret} disabled={!secretAllowed} describedBy="el-secret-hint" label={t('assembly.ballots.secret')} />
                            {!secretAllowed && (
                                <p id="el-secret-hint" className="text-xs text-muted-foreground">
                                    {t('assembly.ballots.secret.disabled')} {t('assembly.ballots.secret.notAllowed')}
                                </p>
                            )}
                            <button
                                type="button"
                                disabled={busy || !election.meetingId || selected.length === 0}
                                onClick={() => void run(async () => { await apiFetch(`/elections/${election.id}/rounds?clubId=${clubId}`, { method: 'POST', body: { candidateIds: selected, secret } }); setSelected([]); })}
                                className={primaryBtn}
                            >
                                {t('assembly.elections.round.create')}
                            </button>
                        </fieldset>
                    )}

                    {canManage && canDecide(election) && (
                        <div className="space-y-2">
                            {lotIds !== null && (
                                <fieldset className="space-y-2 rounded-lg border border-warning/40 p-3">
                                    <legend className="px-1 text-xs font-bold uppercase tracking-wide text-warning">{t('assembly.elections.lot.title')}</legend>
                                    <p className="text-sm text-foreground">{t('assembly.elections.lot.explain')}</p>
                                    {tiedCandidates.map((c) => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                                            <input type="checkbox" checked={lotIds.includes(c.id)} onChange={(e) => setLotIds((s) => (e.target.checked ? [...(s ?? []), c.id] : (s ?? []).filter((x) => x !== c.id)))} />
                                            {c.displayName ?? '—'}
                                        </label>
                                    ))}
                                    <div>
                                        <label htmlFor="lot-note" className={labelClass}>
                                            {t('assembly.elections.lot.note')} *
                                        </label>
                                        <input id="lot-note" type="text" minLength={5} maxLength={1000} value={lotNote} onChange={(e) => setLotNote(e.target.value)} className={inputClass} />
                                    </div>
                                </fieldset>
                            )}
                            <button
                                type="button"
                                disabled={busy || (lotIds !== null && (lotIds.length === 0 || lotNote.trim().length < 5))}
                                onClick={async () => {
                                    // The lot form is an explicit step of its own: no second confirmation behind it.
                                    if (lotIds === null && !(await confirm({ title: t('assembly.elections.decide'), body: t('assembly.elections.decide.confirm'), confirmLabel: t('assembly.elections.decide') }))) return;
                                    await run(() => apiFetch(`/elections/${election.id}/decide?clubId=${clubId}`, { method: 'POST', body: lotIds !== null && lotIds.length > 0 ? { lot: { candidateIds: lotIds, note: lotNote.trim() } } : {} }));
                                }}
                                className={primaryBtn}
                            >
                                {t('assembly.elections.decide')}
                            </button>
                        </div>
                    )}
                    {election.status === 'decided' && <Notice>{t('assembly.elections.decided')}</Notice>}
                </div>
            </SectionCard>
            {dialog}
        </div>
    );
}

function ProposeCandidate({ clubId, electionId, exclude, busy, run }: { clubId: string; electionId: string; exclude: string[]; busy: boolean; run: (a: () => Promise<unknown>) => void }) {
    const { t } = useLanguage();
    const [willing, setWilling] = useState(false);
    return (
        <div className="space-y-2 border-t border-border pt-3">
            <MemberPicker
                clubId={clubId}
                label={t('assembly.elections.propose')}
                excludeIds={exclude}
                disabled={busy}
                onPick={(m: PickedMember) => run(() => apiFetch(`/elections/${electionId}/candidates?clubId=${clubId}`, { method: 'POST', body: { clubMemberId: m.id, willing } }))}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={willing} onChange={(e) => setWilling(e.target.checked)} />
                {t('assembly.elections.propose.willing')}
            </label>
        </div>
    );
}

/** Elections of offices (Wave 11 W6): candidates, voting rounds (digital ballots), tie lot, acceptance and the hand-over into the roles. */
export default function ElectionsPanel({ clubId, canManage, departments, prefill }: { clubId: string; canManage: boolean; departments: DepartmentRef[]; prefill?: { roleType: string; departmentId: string | null } | null }) {
    const { t } = useLanguage();
    const [list, setList] = useState<ElectionListItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(!!prefill && canManage);
    const [meetings, setMeetings] = useState<MeetingRef[]>([]);
    const [roleType, setRoleType] = useState<string>(prefill && (ELECTION_ROLE_TYPES as readonly string[]).includes(prefill.roleType) ? prefill.roleType : 'vorsitz');
    const [departmentId, setDepartmentId] = useState(prefill?.departmentId ?? '');
    const [seats, setSeats] = useState('1');
    const [termMonths, setTermMonths] = useState('');
    const [meetingId, setMeetingId] = useState('');
    const [lead, setLead] = useState<PickedMember | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: ElectionListItem[] }>(`/elections?clubId=${clubId}`);
            setList(res.data);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        if (!canManage) return;
        apiFetch<{ data: MeetingRef[] }>(`/meetings?clubId=${clubId}`)
            .then((res) => setMeetings(res.data.filter((m) => m.type === 'mitgliederversammlung')))
            .catch(() => setMeetings([]));
    }, [clubId, canManage]);

    if (selected) return <ElectionDetail clubId={clubId} id={selected} canManage={canManage} onBack={() => { setSelected(null); void load(); }} />;
    if (failed && !list) return <LoadError onRetry={() => void load()} />;
    if (!list) return <LoadingText />;

    const needsDepartment = DEPARTMENT_ROLE_TYPES.includes(roleType);

    async function create(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: ElectionListItem }>(`/elections?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    roleType,
                    seats: Number(seats) || 1,
                    ...(needsDepartment && departmentId ? { departmentId } : {}),
                    ...(termMonths.trim() ? { termMonths: Number(termMonths) } : {}),
                    ...(meetingId ? { meetingId } : {}),
                    ...(lead ? { electionLeadClubMemberId: lead.id } : {}),
                },
            });
            setShowForm(false);
            setLead(null);
            await load();
            setSelected(res.data.id);
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    return (
        <SectionCard
            title={t('assembly.elections.title')}
            action={
                canManage && (
                    <button type="button" onClick={() => setShowForm((s) => !s)} aria-expanded={showForm} className={`${primaryBtn} !px-3 !py-1.5`}>
                        {t('assembly.elections.new')}
                    </button>
                )
            }
        >
            <div className="space-y-3">
                {showForm && canManage && (
                    <form onSubmit={(e) => void create(e)} className="space-y-3 rounded-lg border border-border p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor="el-role" className={labelClass}>
                                    {t('assembly.elections.office')} *
                                </label>
                                <select id="el-role" value={roleType} onChange={(e) => setRoleType(e.target.value)} className={inputClass}>
                                    {ELECTION_ROLE_TYPES.map((r) => (
                                        <option key={r} value={r}>
                                            {t(`verein.role.${r}`)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {needsDepartment && (
                                <div>
                                    <label htmlFor="el-dep" className={labelClass}>
                                        {t('assembly.elections.department')} *
                                    </label>
                                    <select id="el-dep" required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                                        <option value="">—</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label htmlFor="el-seats" className={labelClass}>
                                    {t('assembly.elections.seatsLabel')} *
                                </label>
                                <input id="el-seats" type="number" min={1} max={20} required value={seats} onChange={(e) => setSeats(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="el-term" className={labelClass}>
                                    {t('assembly.elections.termMonths')}
                                </label>
                                <input id="el-term" type="number" min={1} max={120} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} className={inputClass} />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="el-meeting" className={labelClass}>
                                    {t('assembly.elections.meeting')}
                                </label>
                                <select id="el-meeting" value={meetingId} onChange={(e) => setMeetingId(e.target.value)} className={inputClass}>
                                    <option value="">{t('assembly.elections.meeting.none')}</option>
                                    {meetings.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                {lead ? (
                                    <p className="text-sm text-foreground">
                                        {t('assembly.elections.leadLabel')}: <strong>{lead.name}</strong>{' '}
                                        <button type="button" onClick={() => setLead(null)} className="text-primary underline">
                                            {t('assembly.picker.clear')}
                                        </button>
                                    </p>
                                ) : (
                                    <MemberPicker clubId={clubId} label={t('assembly.elections.leadLabel')} onPick={setLead} />
                                )}
                            </div>
                        </div>
                        {error && <ErrorText>{error}</ErrorText>}
                        <div className="flex gap-2">
                            <button type="submit" disabled={saving || (needsDepartment && !departmentId)} className={primaryBtn}>
                                {t('assembly.elections.create')}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className={secondaryBtn}>
                                {t('treffen.cancel')}
                            </button>
                        </div>
                    </form>
                )}

                {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('assembly.elections.empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {list.map((e) => (
                            <li key={e.id}>
                                <button type="button" onClick={() => setSelected(e.id)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 text-left hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                                    <span className="text-sm font-semibold text-foreground">
                                        {t(`verein.role.${e.roleType}`)} · {t('assembly.elections.seats', { count: e.seats })}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{t(`assembly.election.status.${e.status}`)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </SectionCard>
    );
}
