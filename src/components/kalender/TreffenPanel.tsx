'use client';

import { useEffect, useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

interface Meeting {
    id: string;
    clubId: string;
    type: string;
    title: string;
    scheduledAt: string | null;
    agenda: string | null;
    minutes: string | null;
    status: 'terminfindung' | 'geplant' | 'abgehalten' | 'protokolliert';
}

interface MeetingInvitee {
    id: string;
    meetingId: string;
    memberId: string;
    response: string;
}

interface ClubMember {
    id: string;
    name: string | null;
}

interface MeetingResolution {
    id: string;
    meetingId: string;
    description: string;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    result: string;
}

interface OverlapCandidate {
    candidate: string;
    availability: { memberId: string; available: boolean }[];
}

const MEETING_STATUSES = ['terminfindung', 'geplant', 'abgehalten', 'protokolliert'] as const;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
            {children}
        </div>
    );
}

function StatusBadge({ status, t }: { status: Meeting['status']; t: (key: string) => string }) {
    return (
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{t(`treffen.status.${status}`)}</span>
    );
}

function MeetingList({ clubId, t, onSelect }: { clubId: string; t: (key: string, p?: Record<string, string | number>) => string; onSelect: (id: string) => void }) {
    const [meetings, setMeetings] = useState<Meeting[] | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [type, setType] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function load() {
        const { data } = await apiFetch<{ data: Meeting[] }>(`/meetings?clubId=${clubId}`);
        setMeetings(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim() || !type.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch(`/meetings?clubId=${clubId}`, {
                method: 'POST',
                body: { title: title.trim(), type: type.trim(), scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined },
            });
            setTitle('');
            setType('');
            setScheduledAt('');
            setShowCreate(false);
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSubmitting(false);
        }
    }

    if (meetings === null) return <p className="text-sm text-muted-foreground">…</p>;

    return (
        <SectionCard title={t('treffen.list.title')}>
            {meetings.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">{t('treffen.list.empty')}</p>
            ) : (
                <div className="mb-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <tbody>
                            {meetings.map((m) => (
                                <tr key={m.id} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50" onClick={() => onSelect(m.id)}>
                                    <td className="px-3 py-2 font-medium text-foreground">{m.title}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{m.type}</td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                        {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('de-DE') : t('treffen.scheduled-at.pending')}
                                    </td>
                                    <td className="px-3 py-2">
                                        <StatusBadge status={m.status} t={t} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreate ? (
                <form onSubmit={(e) => void handleCreate(e)} className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('treffen.title')}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <input
                        type="text"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        placeholder={t('treffen.type.placeholder')}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                    />
                    <button
                        type="submit"
                        disabled={submitting || !title.trim() || !type.trim()}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                        {t('treffen.submit')}
                    </button>
                </form>
            ) : (
                <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-primary hover:underline">
                    {t('treffen.create')}
                </button>
            )}
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </SectionCard>
    );
}

function MeetingDetail({
    clubId,
    meetingId,
    t,
    onBack,
}: {
    clubId: string;
    meetingId: string;
    t: (key: string, p?: Record<string, string | number>) => string;
    onBack: () => void;
}) {
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [invitees, setInvitees] = useState<MeetingInvitee[]>([]);
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [resolutions, setResolutions] = useState<MeetingResolution[]>([]);

    async function load() {
        const [meetingRes, inviteesRes, membersRes, resolutionsRes] = await Promise.all([
            apiFetch<{ data: Meeting }>(`/meetings/${meetingId}?clubId=${clubId}`),
            apiFetch<{ data: MeetingInvitee[] }>(`/meetings/${meetingId}/invitees?clubId=${clubId}`),
            apiFetch<{ data: ClubMember[] }>(`/club-members?clubId=${clubId}`),
            apiFetch<{ data: MeetingResolution[] }>(`/meetings/${meetingId}/resolutions?clubId=${clubId}`),
        ]);
        setMeeting(meetingRes.data);
        setInvitees(inviteesRes.data);
        setMembers(membersRes.data);
        setResolutions(resolutionsRes.data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingId]);

    const nameFor = (memberId: string) => members.find((m) => m.id === memberId)?.name ?? memberId;

    // --- Agenda/Protokoll + Status ---
    const [editing, setEditing] = useState(false);
    const [agenda, setAgenda] = useState('');
    const [minutes, setMinutes] = useState('');
    const [status, setStatus] = useState<Meeting['status']>('terminfindung');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!meeting) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAgenda(meeting.agenda ?? '');
        setMinutes(meeting.minutes ?? '');
        setStatus(meeting.status);
    }, [meeting]);

    async function handleSaveAgenda() {
        setSaveError(null);
        setSaved(false);
        try {
            await apiFetch(`/meetings/${meetingId}?clubId=${clubId}`, { method: 'PATCH', body: { agenda, minutes, status } });
            setSaved(true);
            setEditing(false);
            await load();
        } catch (err) {
            setSaveError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    // --- Invitees ---
    const [newInviteeId, setNewInviteeId] = useState('');
    const [inviteError, setInviteError] = useState<string | null>(null);

    async function handleAddInvitee() {
        if (!newInviteeId.trim()) return;
        setInviteError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/invitees?clubId=${clubId}`, { method: 'POST', body: { memberId: newInviteeId.trim() } });
            setNewInviteeId('');
            await load();
        } catch (err) {
            setInviteError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleRemoveInvitee(memberId: string) {
        setInviteError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/invitees/${memberId}?clubId=${clubId}`, { method: 'DELETE' });
            await load();
        } catch (err) {
            setInviteError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    // --- Overlap ---
    const [candidateInput, setCandidateInput] = useState('');
    const [candidates, setCandidates] = useState<string[]>([]);
    const [overlapResults, setOverlapResults] = useState<OverlapCandidate[] | null>(null);
    const [overlapError, setOverlapError] = useState<string | null>(null);

    function handleAddCandidate() {
        if (!candidateInput) return;
        setCandidates((prev) => [...prev, new Date(candidateInput).toISOString()]);
        setCandidateInput('');
        setOverlapResults(null);
    }

    async function handleCheckOverlap() {
        if (candidates.length === 0) return;
        setOverlapError(null);
        try {
            const params = candidates.map(encodeURIComponent).join(',');
            const { data } = await apiFetch<{ data: OverlapCandidate[] }>(`/meetings/${meetingId}/overlap?clubId=${clubId}&candidates=${params}`);
            setOverlapResults(data);
        } catch (err) {
            setOverlapError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    // --- Attendance ---
    const [attendance, setAttendance] = useState<Record<string, { present: boolean; hasVotingRight: boolean }>>({});
    const [attendanceError, setAttendanceError] = useState<string | null>(null);
    const [attendanceSaved, setAttendanceSaved] = useState(false);

    async function handleSaveAttendance() {
        setAttendanceError(null);
        setAttendanceSaved(false);
        try {
            const entries = invitees.map((inv) => ({
                memberId: inv.memberId,
                present: attendance[inv.memberId]?.present ?? false,
                hasVotingRight: attendance[inv.memberId]?.hasVotingRight ?? true,
            }));
            await apiFetch(`/meetings/${meetingId}/attendance?clubId=${clubId}`, { method: 'PATCH', body: entries });
            setAttendanceSaved(true);
        } catch (err) {
            setAttendanceError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    // --- Resolutions ---
    const [showResolutionForm, setShowResolutionForm] = useState(false);
    const [resDescription, setResDescription] = useState('');
    const [resFor, setResFor] = useState('0');
    const [resAgainst, setResAgainst] = useState('0');
    const [resAbstain, setResAbstain] = useState('0');
    const [resResult, setResResult] = useState('');
    const [resError, setResError] = useState<string | null>(null);

    async function handleCreateResolution(e: React.FormEvent) {
        e.preventDefault();
        if (!resDescription.trim() || !resResult.trim()) return;
        setResError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/resolutions?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    description: resDescription.trim(),
                    votesFor: Number(resFor) || 0,
                    votesAgainst: Number(resAgainst) || 0,
                    votesAbstain: Number(resAbstain) || 0,
                    result: resResult.trim(),
                },
            });
            setResDescription('');
            setResFor('0');
            setResAgainst('0');
            setResAbstain('0');
            setResResult('');
            setShowResolutionForm(false);
            await load();
        } catch (err) {
            setResError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    if (!meeting) return <p className="text-sm text-muted-foreground">…</p>;

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="text-sm font-medium text-primary hover:underline">
                {t('treffen.back')}
            </button>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">{meeting.title}</h2>
                    <p className="text-sm text-muted-foreground">{meeting.type}</p>
                </div>
                <StatusBadge status={meeting.status} t={t} />
            </div>

            <SectionCard title={t('treffen.agenda')}>
                {editing ? (
                    <div className="space-y-2">
                        <textarea
                            value={agenda}
                            onChange={(e) => setAgenda(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <p className="text-xs font-semibold text-foreground">{t('treffen.minutes')}</p>
                        <textarea
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        />
                        <div className="flex items-center gap-2">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as Meeting['status'])}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                                {MEETING_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {t(`treffen.status.${s}`)}
                                    </option>
                                ))}
                            </select>
                            <button onClick={() => void handleSaveAgenda()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                                {t('treffen.agenda-minutes.save')}
                            </button>
                        </div>
                        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-foreground">{meeting.agenda || t('treffen.agenda.empty')}</p>
                        <p className="mt-2 text-xs font-semibold text-foreground">{t('treffen.minutes')}</p>
                        <p className="text-sm text-foreground">{meeting.minutes || t('treffen.minutes.empty')}</p>
                        {saved && <p className="mt-2 text-xs text-success">{t('treffen.agenda-minutes.saved')}</p>}
                        <button onClick={() => setEditing(true)} className="mt-2 text-xs font-medium text-primary hover:underline">
                            {t('treffen.agenda-minutes.edit')}
                        </button>
                    </div>
                )}
            </SectionCard>

            <SectionCard title={t('treffen.invitees.title')}>
                {inviteError && <p className="mb-2 text-sm text-destructive">{inviteError}</p>}
                {invitees.length === 0 ? (
                    <p className="mb-3 text-sm text-muted-foreground">{t('treffen.attendance.empty')}</p>
                ) : (
                    <ul className="mb-3 space-y-1">
                        {invitees.map((inv) => (
                            <li key={inv.id} className="flex items-center justify-between text-sm">
                                <span className="text-foreground">
                                    {nameFor(inv.memberId)} — {t(`treffen.rsvp.response.${inv.response}`)}
                                </span>
                                <button onClick={() => void handleRemoveInvitee(inv.memberId)} className="text-xs text-destructive hover:underline">
                                    {t('treffen.invitees.remove')}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex items-center gap-2">
                    <select
                        value={newInviteeId}
                        onChange={(e) => setNewInviteeId(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                        <option value="">—</option>
                        {members
                            .filter((m) => !invitees.some((inv) => inv.memberId === m.id))
                            .map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name ?? m.id}
                                </option>
                            ))}
                    </select>
                    <button onClick={() => void handleAddInvitee()} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                        {t('treffen.invitees.add')}
                    </button>
                </div>
            </SectionCard>

            <SectionCard title={t('treffen.overlap.title')}>
                {candidates.length === 0 ? (
                    <p className="mb-2 text-xs text-muted-foreground">{t('treffen.overlap.empty')}</p>
                ) : (
                    <ul className="mb-2 space-y-1">
                        {candidates.map((c, i) => (
                            <li key={c + i} className="text-xs text-foreground">
                                {new Date(c).toLocaleString('de-DE')}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex items-center gap-2">
                    <input
                        type="datetime-local"
                        value={candidateInput}
                        onChange={(e) => setCandidateInput(e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                    />
                    <button onClick={handleAddCandidate} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                        {t('treffen.overlap.add-candidate')}
                    </button>
                    <button
                        onClick={() => void handleCheckOverlap()}
                        disabled={candidates.length === 0}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                        {t('treffen.overlap.check')}
                    </button>
                </div>
                {overlapError && <p className="mt-2 text-sm text-destructive">{overlapError}</p>}

                {overlapResults && (
                    <div className="mt-3 space-y-2">
                        {overlapResults.map((result) => {
                            const available = result.availability.filter((a) => a.available).length;
                            return (
                                <div key={result.candidate} className="border-t border-border pt-2 text-xs">
                                    <p className="font-semibold text-foreground">{new Date(result.candidate).toLocaleString('de-DE')}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        {result.availability.map((a) => (
                                            <span
                                                key={a.memberId}
                                                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                                    a.available ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                                                }`}
                                            >
                                                {a.available ? '✓' : '✕'}
                                            </span>
                                        ))}
                                        <span className="ml-1 text-muted-foreground">
                                            {t('treffen.overlap.count', { available, total: result.availability.length })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            <SectionCard title={t('treffen.attendance.title')}>
                {invitees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('treffen.attendance.empty')}</p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="px-3 py-2">Name</th>
                                    <th className="px-3 py-2">{t('treffen.attendance.present')}</th>
                                    <th className="px-3 py-2">{t('treffen.attendance.voting-right')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitees.map((inv) => {
                                    const row = attendance[inv.memberId] ?? { present: false, hasVotingRight: true };
                                    return (
                                        <tr key={inv.id} className="border-b border-border last:border-b-0">
                                            <td className="px-3 py-2 text-foreground">{nameFor(inv.memberId)}</td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={row.present}
                                                    onChange={(e) =>
                                                        setAttendance((prev) => ({ ...prev, [inv.memberId]: { ...row, present: e.target.checked } }))
                                                    }
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="checkbox"
                                                    checked={row.hasVotingRight}
                                                    onChange={(e) =>
                                                        setAttendance((prev) => ({ ...prev, [inv.memberId]: { ...row, hasVotingRight: e.target.checked } }))
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {attendanceError && <p className="mt-2 text-sm text-destructive">{attendanceError}</p>}
                {attendanceSaved && !attendanceError && <p className="mt-2 text-xs text-success">{t('treffen.attendance.saved')}</p>}
                {invitees.length > 0 && (
                    <button
                        onClick={() => void handleSaveAttendance()}
                        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    >
                        {t('treffen.attendance.save')}
                    </button>
                )}
            </SectionCard>

            <SectionCard title={t('treffen.resolutions.title')}>
                {resolutions.length === 0 ? (
                    <p className="mb-3 text-sm text-muted-foreground">{t('treffen.resolutions.empty')}</p>
                ) : (
                    <ul className="mb-3 space-y-2">
                        {resolutions.map((r) => (
                            <li key={r.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                                <p className="text-foreground">{r.description}</p>
                                <p className="text-xs text-muted-foreground">
                                    {r.votesFor}/{r.votesAgainst}/{r.votesAbstain} — {r.result}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
                {showResolutionForm ? (
                    <form onSubmit={(e) => void handleCreateResolution(e)} className="space-y-2">
                        <input
                            type="text"
                            value={resDescription}
                            onChange={(e) => setResDescription(e.target.value)}
                            placeholder={t('treffen.resolutions.description')}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="number"
                                value={resFor}
                                onChange={(e) => setResFor(e.target.value)}
                                placeholder={t('treffen.resolutions.votes-for')}
                                className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                            <input
                                type="number"
                                value={resAgainst}
                                onChange={(e) => setResAgainst(e.target.value)}
                                placeholder={t('treffen.resolutions.votes-against')}
                                className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                            <input
                                type="number"
                                value={resAbstain}
                                onChange={(e) => setResAbstain(e.target.value)}
                                placeholder={t('treffen.resolutions.votes-abstain')}
                                className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                            <input
                                type="text"
                                value={resResult}
                                onChange={(e) => setResResult(e.target.value)}
                                placeholder={t('treffen.resolutions.result.placeholder')}
                                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                            />
                            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                                {t('treffen.resolutions.submit')}
                            </button>
                        </div>
                        {resError && <p className="text-sm text-destructive">{resError}</p>}
                    </form>
                ) : (
                    <button onClick={() => setShowResolutionForm(true)} className="text-sm font-medium text-primary hover:underline">
                        {t('treffen.resolutions.create')}
                    </button>
                )}
            </SectionCard>
        </div>
    );
}

export default function TreffenPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

    return selectedMeetingId ? (
        <MeetingDetail clubId={clubId} meetingId={selectedMeetingId} t={t} onBack={() => setSelectedMeetingId(null)} />
    ) : (
        <MeetingList clubId={clubId} t={t} onSelect={setSelectedMeetingId} />
    );
}
