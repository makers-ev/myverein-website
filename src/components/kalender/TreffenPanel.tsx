'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react';

import { useAccountMembers } from '@/lib/useAccountMembers';
import { formatDate, memberErrorKey } from '@/lib/clubMembers';
import { apiFetch } from '@/lib/api-client';
import {
    buildAttendancePatch,
    effectiveAttendance,
    formatMeetingDateTime,
    fromDatetimeLocal,
    MEETING_TYPES,
    meetingTypeKey,
    isValidVoteCount,
    resolutionChanges,
    statusForSchedule,
    toDatetimeLocal,
    type AttendanceEdit,
    type AttendanceRow,
    type MeetingType,
    type RsvpResponse,
} from '@/lib/meetings';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/Modal';
import { inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';

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

interface MeetingResolution {
    id: string;
    meetingId: string;
    description: string;
    votesFor: number;
    votesAgainst: number;
    votesAbstain: number;
    result: string;
    /** Berichtigungsvermerk: set once the resolution was corrected (PATCH), absent/null otherwise. */
    correctionNote?: string | null;
    correctedAt?: string | null;
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

function typeLabel(type: string, t: TFn): string {
    const key = meetingTypeKey(type);
    return key ? t(key) : type;
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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

function MeetingList({ clubId, t, canWrite, onSelect }: { clubId: string; t: TFn; canWrite: boolean; onSelect: (id: string) => void }) {
    const { language } = useLanguage();
    const [meetings, setMeetings] = useState<Meeting[] | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [type, setType] = useState<MeetingType>('sonstige');
    const [scheduledAt, setScheduledAt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [loadFailed, setLoadFailed] = useState(false);

    async function load() {
        try {
            const { data } = await apiFetch<{ data: Meeting[] }>(`/meetings?clubId=${clubId}`);
            setMeetings(data);
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch(`/meetings?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    title: title.trim(),
                    type,
                    scheduledAt: fromDatetimeLocal(scheduledAt) ?? undefined,
                },
            });
            setTitle('');
            setType('sonstige');
            setScheduledAt('');
            setShowCreate(false);
            await load();
        } catch (err) {
            setError(t(memberErrorKey(err)));
        } finally {
            setSubmitting(false);
        }
    }

    if (loadFailed && meetings === null) return <LoadError onRetry={() => void load()} />;
    if (meetings === null) return <LoadingText />;

    return (
        <SectionCard
            title={t('treffen.list.title')}
            action={
                canWrite ? (
                    <button type="button" onClick={() => setShowCreate(true)} className={`${primaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                        <Plus className="h-4 w-4" aria-hidden />
                        {t('treffen.create')}
                    </button>
                ) : undefined
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
                                        {typeLabel(m.type, t)} · {m.scheduledAt ? formatMeetingDateTime(m.scheduledAt, language) : t('treffen.scheduled-at.pending')}
                                    </span>
                                </span>
                                <StatusBadge status={m.status} t={t} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {canWrite && (
                <Modal
                    open={showCreate}
                    onClose={() => setShowCreate(false)}
                    title={t('treffen.create')}
                    footer={
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowCreate(false)} className={secondaryBtn}>
                                {t('treffen.cancel')}
                            </button>
                            <button type="submit" form="meeting-form" disabled={submitting || !title.trim()} className={primaryBtn}>
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
                            <input
                                id="mt-title"
                                type="text"
                                required
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label htmlFor="mt-type" className={labelClass}>
                                {t('treffen.type')} *
                            </label>
                            <select id="mt-type" value={type} onChange={(e) => setType(e.target.value as MeetingType)} className={inputClass}>
                                {MEETING_TYPES.map((mt) => (
                                    <option key={mt} value={mt}>
                                        {t(`treffen.type.${mt}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="mt-scheduled" className={labelClass}>
                                {t('treffen.scheduled-at')}
                            </label>
                            <input
                                id="mt-scheduled"
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className={inputClass}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">{t('treffen.scheduled-at.hint')}</p>
                        </div>
                        {error && <ErrorText>{error}</ErrorText>}
                    </form>
                </Modal>
            )}
        </SectionCard>
    );
}

function MeetingDetail({ clubId, meetingId, t, canWrite, onBack }: { clubId: string; meetingId: string; t: TFn; canWrite: boolean; onBack: () => void }) {
    const { language } = useLanguage();
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [invitees, setInvitees] = useState<MeetingInvitee[]>([]);
    const { members, error: directoryError } = useAccountMembers(clubId);
    const [resolutions, setResolutions] = useState<MeetingResolution[]>([]);
    // Stored attendance (pre-fill) and the caller's own Better Auth member id (to find their invitation).
    const [storedAttendance, setStoredAttendance] = useState<AttendanceRow[]>([]);
    const [ownMemberId, setOwnMemberId] = useState<string | null>(null);

    // Only the newest load may write state, and never after unmount / meeting switch.
    const loadSeq = useRef(0);
    const [attendanceLoadFailed, setAttendanceLoadFailed] = useState(false);
    useEffect(() => {
        return () => {
            loadSeq.current += 1;
        };
    }, [meetingId]);

    const [detailLoadFailed, setDetailLoadFailed] = useState(false);

    async function load() {
        const seq = ++loadSeq.current;
        try {
            await loadAll(seq);
            setDetailLoadFailed(false);
        } catch {
            if (seq === loadSeq.current) setDetailLoadFailed(true);
        }
    }

    async function loadAll(seq: number) {
        const [meetingRes, inviteesRes, resolutionsRes, attendanceRes] = await Promise.all([
            apiFetch<{ data: Meeting }>(`/meetings/${meetingId}?clubId=${clubId}`),
            apiFetch<{ data: MeetingInvitee[] }>(`/meetings/${meetingId}/invitees?clubId=${clubId}`),
            apiFetch<{ data: MeetingResolution[] }>(`/meetings/${meetingId}/resolutions?clubId=${clubId}`),
            // A failing attendance read only hides that section, not the whole page.
            apiFetch<{ data: AttendanceRow[] }>(`/meetings/${meetingId}/attendance?clubId=${clubId}`).catch(() => null),
        ]);
        if (seq !== loadSeq.current) return;
        setMeeting(meetingRes.data);
        setInvitees(inviteesRes.data);
        setResolutions(resolutionsRes.data);
        if (attendanceRes) {
            setStoredAttendance(attendanceRes.data);
            setAttendanceLoadFailed(false);
        } else {
            setAttendanceLoadFailed(true);
        }
    }

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data?: { memberId?: string | null } }>(`/club-members/me?clubId=${clubId}`)
            .then((res) => {
                if (!cancelled) setOwnMemberId(res.data?.memberId ?? null);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingId]);

    const nameFor = (memberId: string) => members.find((m) => m.id === memberId)?.name ?? '—';

    // --- Stammdaten (Titel/Art/Termin) bearbeiten + Löschen ---
    const [metaOpen, setMetaOpen] = useState(false);
    const [metaTitle, setMetaTitle] = useState('');
    const [metaType, setMetaType] = useState<string>('sonstige');
    const [metaScheduled, setMetaScheduled] = useState('');
    const [metaError, setMetaError] = useState<string | null>(null);
    const [metaSaving, setMetaSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function openEditMeeting() {
        if (!meeting) return;
        setMetaTitle(meeting.title);
        setMetaType(meeting.type);
        setMetaScheduled(toDatetimeLocal(meeting.scheduledAt));
        setMetaError(null);
        setMetaOpen(true);
    }

    async function handleSaveMeta(e: React.FormEvent) {
        e.preventDefault();
        if (!meeting || !metaTitle.trim()) return;
        // Only what changed: sending the type of a legacy row again would be rejected by the enum.
        const body: Record<string, unknown> = {};
        if (metaTitle.trim() !== meeting.title) body.title = metaTitle.trim();
        if (metaType !== meeting.type) body.type = metaType;
        if (metaScheduled !== toDatetimeLocal(meeting.scheduledAt)) {
            const scheduled = fromDatetimeLocal(metaScheduled);
            body.scheduledAt = scheduled;
            // A meeting that gets a date is no longer in Terminfindung (and vice versa when the date is removed).
            const nextStatus = statusForSchedule(meeting.status, scheduled);
            if (nextStatus) body.status = nextStatus;
        }
        if (Object.keys(body).length === 0) {
            setMetaOpen(false);
            return;
        }
        setMetaSaving(true);
        setMetaError(null);
        try {
            await apiFetch(`/meetings/${meetingId}?clubId=${clubId}`, { method: 'PATCH', body });
            setMetaOpen(false);
            await load();
        } catch (err) {
            setMetaError(t(memberErrorKey(err)));
        } finally {
            setMetaSaving(false);
        }
    }

    async function handleDeleteMeeting() {
        if (!meeting || !window.confirm(t('treffen.delete.confirm', { title: meeting.title }))) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await apiFetch(`/meetings/${meetingId}?clubId=${clubId}`, { method: 'DELETE' });
            onBack();
        } catch (err) {
            setDeleteError(t(memberErrorKey(err)));
            setDeleting(false);
        }
    }

    // --- Zu-/Absage (own invitation) ---
    const [rsvpBusy, setRsvpBusy] = useState(false);
    const [rsvpError, setRsvpError] = useState<string | null>(null);
    const ownInvite = ownMemberId ? invitees.find((inv) => inv.memberId === ownMemberId) : undefined;

    async function handleRsvp(response: RsvpResponse) {
        setRsvpBusy(true);
        setRsvpError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/invitees/me?clubId=${clubId}`, { method: 'PATCH', body: { response } });
            await load();
        } catch (err) {
            setRsvpError(t(memberErrorKey(err)));
        } finally {
            setRsvpBusy(false);
        }
    }

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
            await apiFetch(`/meetings/${meetingId}?clubId=${clubId}`, {
                method: 'PATCH',
                body: { agenda, minutes, status },
            });
            setSaved(true);
            setEditing(false);
            await load();
        } catch (err) {
            setSaveError(t(memberErrorKey(err)));
        }
    }

    // --- Invitees ---
    const [newInviteeId, setNewInviteeId] = useState('');
    const [inviteError, setInviteError] = useState<string | null>(null);

    async function handleAddInvitee() {
        if (!newInviteeId.trim()) return;
        setInviteError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/invitees?clubId=${clubId}`, {
                method: 'POST',
                body: { memberId: newInviteeId.trim() },
            });
            setNewInviteeId('');
            await load();
        } catch (err) {
            setInviteError(t(memberErrorKey(err)));
        }
    }

    async function handleRemoveInvitee(memberId: string) {
        setInviteError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/invitees/${memberId}?clubId=${clubId}`, { method: 'DELETE' });
            await load();
        } catch (err) {
            setInviteError(t(memberErrorKey(err)));
        }
    }

    // --- Overlap ---
    const [candidateInput, setCandidateInput] = useState('');
    const [candidates, setCandidates] = useState<string[]>([]);
    const [overlapResults, setOverlapResults] = useState<OverlapCandidate[] | null>(null);
    const [overlapError, setOverlapError] = useState<string | null>(null);

    function handleAddCandidate() {
        if (!candidateInput) return;
        const iso = fromDatetimeLocal(candidateInput);
        if (!iso) return;
        setCandidates((prev) => [...prev, iso]);
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
            setOverlapError(t(memberErrorKey(err)));
        }
    }

    // --- Attendance ---
    // Pre-filled from the stored rows; `attendanceEdits` holds only what the user touched, and only that is sent.
    const [attendanceEdits, setAttendanceEdits] = useState<Record<string, AttendanceEdit>>({});
    const [attendanceError, setAttendanceError] = useState<string | null>(null);
    const [attendanceSaved, setAttendanceSaved] = useState(false);
    const [attendanceSaving, setAttendanceSaving] = useState(false);

    function editAttendance(memberId: string, change: AttendanceEdit) {
        setAttendanceSaved(false);
        setAttendanceEdits((prev) => ({ ...prev, [memberId]: { ...prev[memberId], ...change } }));
    }

    const attendancePatch = buildAttendancePatch(storedAttendance, attendanceEdits);

    async function handleSaveAttendance() {
        setAttendanceError(null);
        setAttendanceSaved(false);
        if (attendancePatch.length === 0) {
            setAttendanceSaved(true);
            return;
        }
        setAttendanceSaving(true);
        try {
            const res = await apiFetch<{ data: AttendanceRow[] }>(`/meetings/${meetingId}/attendance?clubId=${clubId}`, {
                method: 'PATCH',
                body: attendancePatch,
            });
            setStoredAttendance(res.data);
            setAttendanceEdits({});
            setAttendanceSaved(true);
        } catch (err) {
            setAttendanceError(t(memberErrorKey(err)));
        } finally {
            setAttendanceSaving(false);
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
            setResError(t(memberErrorKey(err)));
        }
    }

    // --- Resolution correction (Berichtigungsvermerk is mandatory; no silent overwrite) ---
    const [correcting, setCorrecting] = useState<MeetingResolution | null>(null);
    const [corDescription, setCorDescription] = useState('');
    const [corFor, setCorFor] = useState('0');
    const [corAgainst, setCorAgainst] = useState('0');
    const [corAbstain, setCorAbstain] = useState('0');
    const [corResult, setCorResult] = useState('');
    const [corNote, setCorNote] = useState('');
    const [corError, setCorError] = useState<string | null>(null);
    const [corSaving, setCorSaving] = useState(false);

    function openCorrection(r: MeetingResolution) {
        setCorrecting(r);
        setCorDescription(r.description);
        setCorFor(String(r.votesFor));
        setCorAgainst(String(r.votesAgainst));
        setCorAbstain(String(r.votesAbstain));
        setCorResult(r.result);
        setCorNote('');
        setCorError(null);
    }

    const corChanges = correcting ? resolutionChanges(correcting, { description: corDescription, votesFor: corFor, votesAgainst: corAgainst, votesAbstain: corAbstain, result: corResult }) : {};
    const corVotesValid = [corFor, corAgainst, corAbstain].every(isValidVoteCount);
    const corValid = !!correcting && corVotesValid && Object.keys(corChanges).length > 0 && !!corNote.trim() && !!corDescription.trim() && !!corResult.trim();

    async function handleCorrectResolution(e: React.FormEvent) {
        e.preventDefault();
        if (!correcting || !corValid || corSaving) return;
        setCorSaving(true);
        setCorError(null);
        try {
            await apiFetch(`/meetings/${meetingId}/resolutions/${correcting.id}?clubId=${clubId}`, {
                method: 'PATCH',
                body: { ...corChanges, correctionNote: corNote.trim() },
            });
        } catch (err) {
            setCorError(t(memberErrorKey(err)));
            setCorSaving(false);
            return;
        }
        // The correction is saved; a failing reload must not look like a failed correction.
        setCorrecting(null);
        setCorSaving(false);
        await load(); // never throws; a failed reload shows the retry banner of the detail view
    }

    if (!meeting) return detailLoadFailed ? <LoadError onRetry={() => void load()} /> : <LoadingText />;

    const corVoteFields = [
        ['cor-for', 'treffen.resolutions.votes-for', corFor, setCorFor],
        ['cor-against', 'treffen.resolutions.votes-against', corAgainst, setCorAgainst],
        ['cor-abstain', 'treffen.resolutions.votes-abstain', corAbstain, setCorAbstain],
    ] as const;

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

            {detailLoadFailed && <LoadError onRetry={() => void load()} />}

            <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-foreground">{meeting.title}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {typeLabel(meeting.type, t)} · {meeting.scheduledAt ? formatMeetingDateTime(meeting.scheduledAt, language) : t('treffen.scheduled-at.pending')}
                    </p>
                    {canWrite && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={openEditMeeting} className={`${secondaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                                {t('treffen.edit')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleDeleteMeeting()}
                                disabled={deleting}
                                className={`${secondaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-destructive`}
                            >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                {t('treffen.delete')}
                            </button>
                        </div>
                    )}
                    {deleteError && (
                        <div className="mt-3">
                            <ErrorText>{deleteError}</ErrorText>
                        </div>
                    )}
                </div>
                <StatusBadge status={meeting.status} t={t} />
            </div>

            <SectionCard title={t('treffen.agenda')}>
                {canWrite && editing ? (
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
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void handleSaveAgenda()} className={primaryBtn}>
                                {t('treffen.agenda-minutes.save')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setAgenda(meeting.agenda ?? '');
                                    setMinutes(meeting.minutes ?? '');
                                    setStatus(meeting.status);
                                    setEditing(false);
                                }}
                                className={secondaryBtn}
                            >
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
                        {canWrite && (
                            <button type="button" onClick={() => setEditing(true)} className={`${secondaryBtn} !px-3 !py-1.5`}>
                                {t('treffen.agenda-minutes.edit')}
                            </button>
                        )}
                    </div>
                )}
            </SectionCard>

            {ownInvite && (
                <SectionCard title={t('treffen.rsvp.title')}>
                    <p className="mb-3 text-sm text-muted-foreground">
                        {t('treffen.rsvp.current')}:{' '}
                        <span className="font-semibold text-foreground">{t(`treffen.rsvp.response.${ownInvite.response}`)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void handleRsvp('zugesagt')}
                            disabled={rsvpBusy || ownInvite.response === 'zugesagt'}
                            aria-pressed={ownInvite.response === 'zugesagt'}
                            className={primaryBtn}
                        >
                            {t('treffen.rsvp.accept')}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleRsvp('abgesagt')}
                            disabled={rsvpBusy || ownInvite.response === 'abgesagt'}
                            aria-pressed={ownInvite.response === 'abgesagt'}
                            className={secondaryBtn}
                        >
                            {t('treffen.rsvp.decline')}
                        </button>
                    </div>
                    {rsvpError && (
                        <div className="mt-3">
                            <ErrorText>{rsvpError}</ErrorText>
                        </div>
                    )}
                </SectionCard>
            )}

            <SectionCard title={t('treffen.invitees.title')}>
                {inviteError && (
                    <div className="mb-3">
                        <ErrorText>{inviteError}</ErrorText>
                    </div>
                )}
                {invitees.length === 0 ? (
                    <p className="mb-3 text-sm text-muted-foreground">{t('treffen.attendance.empty')}</p>
                ) : (
                    <ul className="mb-3 flex flex-wrap gap-2">
                        {invitees.map((inv) => (
                            <li key={inv.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-3 pr-1 text-sm">
                                <span className="text-foreground">{nameFor(inv.memberId)}</span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RESPONSE_STYLES[inv.response] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {t(`treffen.rsvp.response.${inv.response}`)}
                                </span>
                                {canWrite ? (
                                    <button
                                        type="button"
                                        onClick={() => void handleRemoveInvitee(inv.memberId)}
                                        aria-label={`${t('treffen.invitees.remove')}: ${nameFor(inv.memberId)}`}
                                        className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                ) : (
                                    <span className="w-1" aria-hidden />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {canWrite && (
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-48 flex-1">
                            <label htmlFor="mt-invitee" className={labelClass}>
                                {t('treffen.invitees.add')}
                            </label>
                            <select id="mt-invitee" value={newInviteeId} onChange={(e) => setNewInviteeId(e.target.value)} className={inputClass}>
                                <option value="">—</option>
                                {members
                                    .filter((m) => !m.left && !invitees.some((inv) => inv.memberId === m.id))
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name ?? m.id}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        {directoryError && <p className="w-full text-xs text-destructive">{t('verein.directory.error')}</p>}
                        <button type="button" onClick={() => void handleAddInvitee()} disabled={!newInviteeId} className={primaryBtn}>
                            {t('treffen.invitees.invite')}
                        </button>
                    </div>
                )}
            </SectionCard>

            {canWrite && (
                <SectionCard title={t('treffen.overlap.title')}>
                    {candidates.length === 0 ? (
                        <p className="mb-3 text-sm text-muted-foreground">{t('treffen.overlap.empty')}</p>
                    ) : (
                        <ul className="mb-3 flex flex-wrap gap-2">
                            {candidates.map((c, i) => (
                                <li key={c + i} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                                    {formatMeetingDateTime(c, language)}
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
                    {overlapError && (
                        <div className="mt-3">
                            <ErrorText>{overlapError}</ErrorText>
                        </div>
                    )}

                    {overlapResults && (
                        <ul className="mt-4 space-y-2">
                            {overlapResults.map((result) => {
                                const available = result.availability.filter((a) => a.available).length;
                                const total = result.availability.length;
                                return (
                                    <li key={result.candidate} className="rounded-lg border border-border bg-background p-3 text-xs">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-semibold text-foreground">{formatMeetingDateTime(result.candidate, language)}</p>
                                            <span className="text-muted-foreground">{t('treffen.overlap.count', { available, total })}</span>
                                        </div>
                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-success"
                                                style={{
                                                    width: `${total ? (available / total) * 100 : 0}%`,
                                                }}
                                            />
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
            )}

            <SectionCard title={t('treffen.attendance.title')}>
                {attendanceLoadFailed ? (
                    <ErrorText>{t('treffen.attendance.loadError')}</ErrorText>
                ) : invitees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('treffen.attendance.empty')}</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                    <th className="px-3 py-2">{t('treffen.attendance.name')}</th>
                                    <th className="px-3 py-2 text-center">{t('treffen.attendance.present')}</th>
                                    <th className="px-3 py-2 text-center">{t('treffen.attendance.voting-right')}</th>
                                    <th className="px-3 py-2">{t('treffen.attendance.proxy')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitees.map((inv) => {
                                    const row = effectiveAttendance(
                                        storedAttendance.find((r) => r.memberId === inv.memberId),
                                        attendanceEdits[inv.memberId],
                                    );
                                    return (
                                        <tr key={inv.id} className="border-b border-border last:border-b-0">
                                            <td className="px-3 py-2 text-foreground">{nameFor(inv.memberId)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${t('treffen.attendance.present')}: ${nameFor(inv.memberId)}`}
                                                    checked={row.present}
                                                    disabled={!canWrite}
                                                    onChange={(e) => editAttendance(inv.memberId, { present: e.target.checked })}
                                                    className="h-4 w-4 accent-primary"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    aria-label={`${t('treffen.attendance.voting-right')}: ${nameFor(inv.memberId)}`}
                                                    checked={row.hasVotingRight}
                                                    disabled={!canWrite}
                                                    onChange={(e) => editAttendance(inv.memberId, { hasVotingRight: e.target.checked })}
                                                    className="h-4 w-4 accent-primary"
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select
                                                    aria-label={`${t('treffen.attendance.proxy')}: ${nameFor(inv.memberId)}`}
                                                    value={row.proxyForMemberId ?? ''}
                                                    disabled={!canWrite}
                                                    onChange={(e) => editAttendance(inv.memberId, { proxyForMemberId: e.target.value || null })}
                                                    className="w-full min-w-32 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                                                >
                                                    <option value="">{t('treffen.attendance.proxy.none')}</option>
                                                    {members
                                                        .filter((m) => m.id !== inv.memberId && (!m.left || m.id === row.proxyForMemberId))
                                                        .map((m) => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.name ?? m.id}
                                                            </option>
                                                        ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {attendanceError && (
                    <div className="mt-3">
                        <ErrorText>{attendanceError}</ErrorText>
                    </div>
                )}
                {attendanceSaved && !attendanceError && <p className="mt-2 text-xs text-success">{t('treffen.attendance.saved')}</p>}
                {canWrite && !attendanceLoadFailed && invitees.length > 0 && (
                    <button type="button" onClick={() => void handleSaveAttendance()} disabled={attendanceSaving || attendancePatch.length === 0} className={`${primaryBtn} mt-3`}>
                        {t('treffen.attendance.save')}
                    </button>
                )}
            </SectionCard>

            <SectionCard
                title={t('treffen.resolutions.title')}
                action={
                    canWrite ? (
                        <button
                            type="button"
                            onClick={() => setShowResolutionForm(true)}
                            className={`${secondaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            {t('treffen.resolutions.create')}
                        </button>
                    ) : undefined
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
                                {r.correctionNote && (
                                    <p className="mt-2 rounded-md bg-warning/10 px-2 py-1.5 text-xs text-foreground">
                                        <span className="font-semibold">
                                            {r.correctedAt ? t('treffen.resolutions.corrected-on', { date: formatDate(r.correctedAt, language) }) : t('treffen.resolutions.corrected')}
                                        </span>{' '}
                                        {r.correctionNote}
                                    </p>
                                )}
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
                                {canWrite && (
                                    <button
                                        type="button"
                                        onClick={() => openCorrection(r)}
                                        className="mt-2 inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                                    >
                                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                                        {t('treffen.resolutions.correct')}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {canWrite && (
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
                )}
                {canWrite && (
                    <Modal
                        open={correcting !== null}
                        onClose={corSaving ? () => {} : () => setCorrecting(null)}
                        title={t('treffen.resolutions.correct')}
                        footer={
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setCorrecting(null)} disabled={corSaving} className={secondaryBtn}>
                                    {t('treffen.cancel')}
                                </button>
                                <button type="submit" form="resolution-correct-form" disabled={!corValid || corSaving} className={primaryBtn}>
                                    {t('treffen.resolutions.correct.submit')}
                                </button>
                            </div>
                        }
                    >
                        <form id="resolution-correct-form" onSubmit={(e) => void handleCorrectResolution(e)} className="space-y-4">
                            <p className="text-xs text-muted-foreground">{t('treffen.resolutions.correct.hint')}</p>
                            <div>
                                <label htmlFor="cor-description" className={labelClass}>
                                    {t('treffen.resolutions.description')} *
                                </label>
                                <textarea id="cor-description" rows={3} value={corDescription} onChange={(e) => setCorDescription(e.target.value)} className={inputClass} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {corVoteFields.map(([id, label, value, setter]) => (
                                    <div key={id}>
                                        <label htmlFor={id} className={labelClass}>
                                            {t(label)}
                                        </label>
                                        <input id={id} type="number" min={0} step={1} value={value} onChange={(e) => setter(e.target.value)} className={inputClass} />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label htmlFor="cor-result" className={labelClass}>
                                    {t('treffen.resolutions.result')} *
                                </label>
                                <input id="cor-result" type="text" value={corResult} onChange={(e) => setCorResult(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="cor-note" className={labelClass}>
                                    {t('treffen.resolutions.correct.note')} *
                                </label>
                                <textarea
                                    id="cor-note"
                                    rows={2}
                                    maxLength={2000}
                                    required
                                    value={corNote}
                                    onChange={(e) => setCorNote(e.target.value)}
                                    placeholder={t('treffen.resolutions.correct.note.placeholder')}
                                    className={inputClass}
                                />
                            </div>
                            {correcting && !corVotesValid && <p role="alert" className="text-xs text-destructive">{t('treffen.resolutions.correct.votes-invalid')}</p>}
                            {correcting && corVotesValid && Object.keys(corChanges).length === 0 && <p className="text-xs text-muted-foreground">{t('treffen.resolutions.correct.nochange')}</p>}
                            {corError && <ErrorText>{corError}</ErrorText>}
                        </form>
                    </Modal>
                )}
            </SectionCard>

            {canWrite && (
                <Modal
                    open={metaOpen}
                    onClose={metaSaving ? () => {} : () => setMetaOpen(false)}
                    title={t('treffen.edit')}
                    footer={
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setMetaOpen(false)} disabled={metaSaving} className={secondaryBtn}>
                                {t('treffen.cancel')}
                            </button>
                            <button type="submit" form="meeting-edit-form" disabled={metaSaving || !metaTitle.trim()} className={primaryBtn}>
                                {t('treffen.agenda-minutes.save')}
                            </button>
                        </div>
                    }
                >
                    <form id="meeting-edit-form" onSubmit={(e) => void handleSaveMeta(e)} className="space-y-4">
                        <div>
                            <label htmlFor="me-title" className={labelClass}>
                                {t('treffen.title')} *
                            </label>
                            <input id="me-title" type="text" required autoFocus value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="me-type" className={labelClass}>
                                {t('treffen.type')} *
                            </label>
                            <select id="me-type" value={metaType} onChange={(e) => setMetaType(e.target.value)} className={inputClass}>
                                {!MEETING_TYPES.some((mt) => mt === metaType) && <option value={metaType}>{metaType}</option>}
                                {MEETING_TYPES.map((mt) => (
                                    <option key={mt} value={mt}>
                                        {t(`treffen.type.${mt}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="me-scheduled" className={labelClass}>
                                {t('treffen.scheduled-at')}
                            </label>
                            <input id="me-scheduled" type="datetime-local" value={metaScheduled} onChange={(e) => setMetaScheduled(e.target.value)} className={inputClass} />
                            <p className="mt-1 text-xs text-muted-foreground">{t('treffen.scheduled-at.hint')}</p>
                        </div>
                        {metaError && <ErrorText>{metaError}</ErrorText>}
                    </form>
                </Modal>
            )}
        </div>
    );
}

export default function TreffenPanel({ clubId, canWrite }: { clubId: string; canWrite: boolean }) {
    const { t } = useLanguage();
    const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

    return selectedMeetingId ? (
        <MeetingDetail clubId={clubId} meetingId={selectedMeetingId} t={t} canWrite={canWrite} onBack={() => setSelectedMeetingId(null)} />
    ) : (
        <MeetingList clubId={clubId} t={t} canWrite={canWrite} onSelect={setSelectedMeetingId} />
    );
}
