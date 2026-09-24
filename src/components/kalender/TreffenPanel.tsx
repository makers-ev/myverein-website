'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, Plus, X } from 'lucide-react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/Modal';
import { inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';

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

type TFn = (key: string, p?: Record<string, string | number>) => string;

const MEETING_STATUSES = ['terminfindung', 'geplant', 'abgehalten', 'protokolliert'] as const;

const STATUS_STYLES: Record<Meeting['status'], string> = {
    terminfindung: 'bg-warning/15 text-warning',
    geplant: 'bg-primary/10 text-primary',
    abgehalten: 'bg-success/15 text-success',
    protokolliert: 'bg-muted text-muted-foreground',
};

const RESPONSE_STYLES: Record<string, string> = {
    zugesagt: 'bg-success/15 text-success',
    abgesagt: 'bg-destructive/15 text-destructive',
};

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function StatusBadge({ status, t }: { status: Meeting['status']; t: (key: string) => string }) {
    return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>{t(`treffen.status.${status}`)}</span>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
    return (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {children}
        </p>
    );
}

function MeetingList({ clubId, t, onSelect }: { clubId: string; t: TFn; onSelect: (id: string) => void }) {
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
        <SectionCard
            title={t('treffen.list.title')}
            action={
                <button type="button" onClick={() => setShowCreate(true)} className={`${primaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                    <Plus className="h-4 w-4" aria-hidden />
                    {t('treffen.create')}
                </button>
            }
        >
            {meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('treffen.list.empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {meetings.map((m) => (
                        <li key={m.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(m.id)}
                                className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                            >
                                <CalendarClock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-foreground">{m.title}</span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {m.type} · {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString('de-DE') : t('treffen.scheduled-at.pending')}
                                    </span>
                                </span>
                                <StatusBadge status={m.status} t={t} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title={t('treffen.create')}
                footer={
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowCreate(false)} className={secondaryBtn}>
                            {t('treffen.cancel')}
                        </button>
                        <button type="submit" form="meeting-form" disabled={submitting || !title.trim() || !type.trim()} className={primaryBtn}>
                            {t('treffen.submit')}
                        </button>
                    </div>
                }
            >
                <form id="meeting-form" onSubmit={(e) => void handleCreate(e)} className="space-y-4">
                    <div>
                        <label htmlFor="mt-title" className={labelClass}>
                            {t('treffen.title')} *
                        </label>
                        <input id="mt-title" type="text" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor="mt-type" className={labelClass}>
                            {t('treffen.type')} *
                        </label>
                        <input
                            id="mt-type"
                            type="text"
                            required
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            placeholder={t('treffen.type.placeholder')}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label htmlFor="mt-scheduled" className={labelClass}>
                            {t('treffen.scheduled-at')}
                        </label>
                        <input id="mt-scheduled" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} />
                        <p className="mt-1 text-xs text-muted-foreground">{t('treffen.scheduled-at.hint')}</p>
                    </div>
                    {error && <ErrorText>{error}</ErrorText>}
                </form>
            </Modal>
        </SectionCard>
    );
}

function MeetingDetail({ clubId, meetingId, t, onBack }: { clubId: string; meetingId: string; t: TFn; onBack: () => void }) {
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

    const voteFields = [
        ['res-for', 'treffen.resolutions.votes-for', resFor, setResFor],
        ['res-against', 'treffen.resolutions.votes-against', resAgainst, setResAgainst],
        ['res-abstain', 'treffen.resolutions.votes-abstain', resAbstain, setResAbstain],
    ] as const;

    return (
        <div className="space-y-4">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t('treffen.back')}
            </button>

            <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-foreground">{meeting.title}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {meeting.type} · {meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString('de-DE') : t('treffen.scheduled-at.pending')}
                    </p>
                </div>
                <StatusBadge status={meeting.status} t={t} />
            </div>

            <SectionCard title={t('treffen.agenda')}>
                {editing ? (
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="mt-agenda" className={labelClass}>
                                {t('treffen.agenda')}
                            </label>
                            <textarea id="mt-agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={4} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="mt-minutes" className={labelClass}>
                                {t('treffen.minutes')}
                            </label>
                            <textarea id="mt-minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} rows={4} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="mt-status" className={labelClass}>
                                {t('treffen.status.edit')}
                            </label>
                            <select
                                id="mt-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as Meeting['status'])}
                                className={`${inputClass} sm:w-auto`}
                            >
                                {MEETING_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {t(`treffen.status.${s}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => void handleSaveAgenda()} className={primaryBtn}>
                                {t('treffen.agenda-minutes.save')}
                            </button>
                            <button type="button" onClick={() => setEditing(false)} className={secondaryBtn}>
                                {t('treffen.cancel')}
                            </button>
                        </div>
                        {saveError && <ErrorText>{saveError}</ErrorText>}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="whitespace-pre-line text-sm text-foreground">
                            {meeting.agenda || <span className="text-muted-foreground">{t('treffen.agenda.empty')}</span>}
                        </p>
                        <div>
                            <p className={labelClass}>{t('treffen.minutes')}</p>
                            <p className="whitespace-pre-line text-sm text-foreground">
                                {meeting.minutes || <span className="text-muted-foreground">{t('treffen.minutes.empty')}</span>}
                            </p>
                        </div>
                        {saved && <p className="text-xs text-success">{t('treffen.agenda-minutes.saved')}</p>}
                        <button type="button" onClick={() => setEditing(true)} className={`${secondaryBtn} !px-3 !py-1.5`}>
                            {t('treffen.agenda-minutes.edit')}
                        </button>
                    </div>
                )}
            </SectionCard>

            <SectionCard title={t('treffen.invitees.title')}>
                {inviteError && <div className="mb-3"><ErrorText>{inviteError}</ErrorText></div>}
                {invitees.length === 0 ? (
                    <p className="mb-3 text-sm text-muted-foreground">{t('treffen.attendance.empty')}</p>
                ) : (
                    <ul className="mb-3 flex flex-wrap gap-2">
                        {invitees.map((inv) => (
                            <li key={inv.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-sm">
                                <span className="text-foreground">{nameFor(inv.memberId)}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RESPONSE_STYLES[inv.response] ?? 'bg-muted text-muted-foreground'}`}>
                                    {t(`treffen.rsvp.response.${inv.response}`)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void handleRemoveInvitee(inv.memberId)}
                                    aria-label={`${t('treffen.invitees.remove')}: ${nameFor(inv.memberId)}`}
                                    className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1">
                        <label htmlFor="mt-invitee" className={labelClass}>
                            {t('treffen.invitees.add')}
                        </label>
                        <select id="mt-invitee" value={newInviteeId} onChange={(e) => setNewInviteeId(e.target.value)} className={inputClass}>
                            <option value="">—</option>
                            {members
                                .filter((m) => !invitees.some((inv) => inv.memberId === m.id))
                                .map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name ?? m.id}
                                    </option>
                                ))}
                        </select>
                    </div>
                    <button type="button" onClick={() => void handleAddInvitee()} disabled={!newInviteeId} className={primaryBtn}>
                        {t('treffen.invitees.invite')}
                    </button>
                </div>
            </SectionCard>

            <SectionCard title={t('treffen.overlap.title')}>
                {candidates.length === 0 ? (
                    <p className="mb-3 text-sm text-muted-foreground">{t('treffen.overlap.empty')}</p>
                ) : (
                    <ul className="mb-3 flex flex-wrap gap-2">
                        {candidates.map((c, i) => (
                            <li key={c + i} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                {new Date(c).toLocaleString('de-DE')}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex flex-wrap items-end gap-2">
                    <div>
                        <label htmlFor="mt-candidate" className={labelClass}>
                            {t('treffen.overlap.candidate')}
                        </label>
                        <input
                            id="mt-candidate"
                            type="datetime-local"
                            value={candidateInput}
                            onChange={(e) => setCandidateInput(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <button type="button" onClick={handleAddCandidate} disabled={!candidateInput} className={secondaryBtn}>
                        {t('treffen.overlap.add-candidate')}
                    </button>
                    <button type="button" onClick={() => void handleCheckOverlap()} disabled={candidates.length === 0} className={primaryBtn}>
                        {t('treffen.overlap.check')}
                    </button>
                </div>
                {overlapError && <div className="mt-3"><ErrorText>{overlapError}</ErrorText></div>}

                {overlapResults && (
                    <ul className="mt-4 space-y-2">
                        {overlapResults.map((result) => {
                            const available = result.availability.filter((a) => a.available).length;
                            const total = result.availability.length;
                            return (
                                <li key={result.candidate} className="rounded-lg border border-border bg-background p-3 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold text-foreground">{new Date(result.candidate).toLocaleString('de-DE')}</p>
                                        <span className="text-muted-foreground">{t('treffen.overlap.count', { available, total })}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-success" style={{ width: `${total ? (available / total) * 100 : 0}%` }} />
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {result.availability.map((a) => (
                                            <span
                                                key={a.memberId}
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                    a.available ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                                                }`}
                                            >
                                                {a.available ? '✓' : '✕'} {nameFor(a.memberId)}
                                            </span>
                                        ))}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </SectionCard>

            <SectionCard title={t('treffen.attendance.title')}>
                {invitees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('treffen.attendance.empty')}</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="px-3 py-2">{t('treffen.attendance.name')}</th>
                                    <th className="px-3 py-2 text-center">{t('treffen.attendance.present')}</th>
                                    <th className="px-3 py-2 text-center">{t('treffen.attendance.voting-right')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitees.map((inv) => {
                                    const row = attendance[inv.memberId] ?? { present: false, hasVotingRight: true };
                                    return (
                                        <tr key={inv.id} className="border-b border-border last:border-b-0">
                                            <td className="px-3 py-2 text-foreground">{nameFor(inv.memberId)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${t('treffen.attendance.present')}: ${nameFor(inv.memberId)}`}
                                                    checked={row.present}
                                                    onChange={(e) =>
                                                        setAttendance((prev) => ({ ...prev, [inv.memberId]: { ...row, present: e.target.checked } }))
                                                    }
                                                    className="h-4 w-4 accent-primary"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${t('treffen.attendance.voting-right')}: ${nameFor(inv.memberId)}`}
                                                    checked={row.hasVotingRight}
                                                    onChange={(e) =>
                                                        setAttendance((prev) => ({ ...prev, [inv.memberId]: { ...row, hasVotingRight: e.target.checked } }))
                                                    }
                                                    className="h-4 w-4 accent-primary"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {attendanceError && <div className="mt-3"><ErrorText>{attendanceError}</ErrorText></div>}
                {attendanceSaved && !attendanceError && <p className="mt-2 text-xs text-success">{t('treffen.attendance.saved')}</p>}
                {invitees.length > 0 && (
                    <button type="button" onClick={() => void handleSaveAttendance()} className={`${primaryBtn} mt-3`}>
                        {t('treffen.attendance.save')}
                    </button>
                )}
            </SectionCard>

            <SectionCard
                title={t('treffen.resolutions.title')}
                action={
                    <button type="button" onClick={() => setShowResolutionForm(true)} className={`${secondaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                        <Plus className="h-4 w-4" aria-hidden />
                        {t('treffen.resolutions.create')}
                    </button>
                }
            >
                {resolutions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('treffen.resolutions.empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {resolutions.map((r) => (
                            <li key={r.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-foreground">{r.description}</p>
                                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{r.result}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
                                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">
                                        {t('treffen.resolutions.votes-for')}: {r.votesFor}
                                    </span>
                                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive">
                                        {t('treffen.resolutions.votes-against')}: {r.votesAgainst}
                                    </span>
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                        {t('treffen.resolutions.votes-abstain')}: {r.votesAbstain}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <Modal
                    open={showResolutionForm}
                    onClose={() => setShowResolutionForm(false)}
                    title={t('treffen.resolutions.create')}
                    footer={
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowResolutionForm(false)} className={secondaryBtn}>
                                {t('treffen.cancel')}
                            </button>
                            <button type="submit" form="resolution-form" disabled={!resDescription.trim() || !resResult.trim()} className={primaryBtn}>
                                {t('treffen.resolutions.submit')}
                            </button>
                        </div>
                    }
                >
                    <form id="resolution-form" onSubmit={(e) => void handleCreateResolution(e)} className="space-y-4">
                        <div>
                            <label htmlFor="res-description" className={labelClass}>
                                {t('treffen.resolutions.description')} *
                            </label>
                            <textarea
                                id="res-description"
                                rows={3}
                                autoFocus
                                value={resDescription}
                                onChange={(e) => setResDescription(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {voteFields.map(([id, label, value, setter]) => (
                                <div key={id}>
                                    <label htmlFor={id} className={labelClass}>
                                        {t(label)}
                                    </label>
                                    <input id={id} type="number" min={0} value={value} onChange={(e) => setter(e.target.value)} className={inputClass} />
                                </div>
                            ))}
                        </div>
                        <div>
                            <label htmlFor="res-result" className={labelClass}>
                                {t('treffen.resolutions.result')} *
                            </label>
                            <input
                                id="res-result"
                                type="text"
                                value={resResult}
                                onChange={(e) => setResResult(e.target.value)}
                                placeholder={t('treffen.resolutions.result.placeholder')}
                                className={inputClass}
                            />
                        </div>
                        {resError && <ErrorText>{resError}</ErrorText>}
                    </form>
                </Modal>
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
