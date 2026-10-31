import { ApiError } from '@/lib/api-client';
import { memberErrorKey } from '@/lib/clubMembers';

/**
 * General assembly (Wave 11): types of the backend contract and the pure helpers behind the UI. The statute parameters are the
 * club's own reading of its statute -- nothing here is legal advice and nothing has a legal default (`null` = not stated).
 */

export const ASSEMBLY_MANAGE = 'assembly:manage';

export const INVITATION_FORMS = ['textform', 'schriftlich'] as const;
export const QUORUM_MODES = ['none', 'fraction', 'absolute'] as const;
export const MAJORITY_KINDS = ['einfach', 'absolut', 'zwei_drittel', 'drei_viertel', 'einstimmig'] as const;
export const MAJORITY_TOPICS = ['allgemein', 'satzungsaenderung', 'zweckaenderung', 'wahl', 'entlastung', 'aufloesung'] as const;
export const ABSTAIN_RULES = ['not_counted', 'against'] as const;
export const ONLINE_MODES = ['none', 'hybrid', 'virtual'] as const;
export const TERM_EXPIRY_EFFECTS = ['none', 'suspend_permissions'] as const;
export const VOTING_STATUSES = ['probe', 'aktiv', 'ruhend'] as const;

export type MajorityKind = (typeof MAJORITY_KINDS)[number];
export type MajorityTopic = (typeof MAJORITY_TOPICS)[number];

export interface AssemblyRules {
    invitationMinDays: number | null;
    invitationDeliveryBufferDays: number | null;
    invitationForm: (typeof INVITATION_FORMS)[number] | null;
    agendaRequiredInInvitation: boolean | null;
    quorumMode: (typeof QUORUM_MODES)[number] | null;
    quorumValue: number | null;
    majorityByTopic: Record<MajorityTopic, MajorityKind | null>;
    abstainCountsAs: (typeof ABSTAIN_RULES)[number] | null;
    proxyAllowed: boolean | null;
    maxProxiesPerPerson: number | null;
    onlineAllowed: (typeof ONLINE_MODES)[number];
    circularAllowed: boolean;
    circularMinParticipation: number | null;
    circularUnanimity: boolean | null;
    secretBallotDigitalAllowed: boolean;
    votingMinAge: number | null;
    votingStatuses: string[] | null;
    termWarningDays: number[] | null;
    termExpiryEffect: (typeof TERM_EXPIRY_EFFECTS)[number];
    satzungReference: string | null;
    satzungPageSlug: string | null;
}

export interface RulesResponse {
    rules: AssemblyRules;
    missing: string[];
    complete: boolean;
}

/** Body of `PATCH /club-settings/assembly`: only the fields that differ (topics one by one). Empty object = nothing to save. */
export function buildRulesPatch(current: AssemblyRules, draft: AssemblyRules): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(draft) as Array<keyof AssemblyRules>) {
        if (key === 'majorityByTopic') {
            const topics: Record<string, MajorityKind | null> = {};
            for (const topic of MAJORITY_TOPICS) if (current.majorityByTopic[topic] !== draft.majorityByTopic[topic]) topics[topic] = draft.majorityByTopic[topic];
            if (Object.keys(topics).length > 0) patch.majorityByTopic = topics;
        } else if (JSON.stringify(current[key]) !== JSON.stringify(draft[key])) {
            patch[key] = draft[key];
        }
    }
    return patch;
}

/** Whether a stated setting switches a risky feature on (online, circular, digital secret ballot): the UI points at the statute then. */
export function hasRiskySwitches(rules: Pick<AssemblyRules, 'onlineAllowed' | 'circularAllowed' | 'secretBallotDigitalAllowed'>): boolean {
    return rules.onlineAllowed !== 'none' || rules.circularAllowed || rules.secretBallotDigitalAllowed;
}

/** Whole number input -> number, empty -> `null`, anything else -> `undefined` (invalid). */
export function parseWholeNumber(value: string): number | null | undefined {
    const v = value.trim();
    if (v === '') return null;
    return /^\d{1,6}$/.test(v) ? Number(v) : undefined;
}

/** Decimal input with comma or dot -> number, empty -> `null`, invalid or not positive -> `undefined`. */
export function parsePositiveNumber(value: string): number | null | undefined {
    const v = value.trim().replace(',', '.');
    if (v === '') return null;
    const n = Number(v);
    return /^\d+(\.\d+)?$/.test(v) && n > 0 ? n : undefined;
}

/** "90, 30, 7" -> `[90, 30, 7]`; empty -> `null`; invalid (not a whole number, repeated, more than 6) -> `undefined`. */
export function parseWarningDays(value: string): number[] | null | undefined {
    const v = value.trim();
    if (v === '') return null;
    const parts = v.split(/[\s,;]+/).filter(Boolean);
    if (parts.length > 6 || !parts.every((p) => /^\d{1,3}$/.test(p))) return undefined;
    const days = parts.map(Number);
    if (days.some((d) => d > 730) || new Set(days).size !== days.length) return undefined;
    return days.sort((a, b) => b - a);
}

// --- Errors ---------------------------------------------------------------------------------------------------------------

/** Translation key of a failed assembly call: the machine-readable `details.code` first, then the generic member errors. */
export function assemblyErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (typeof code === 'string' && ASSEMBLY_ERROR_CODES.has(code)) return `assembly.err.${code}`;
    }
    return memberErrorKey(err);
}

const ASSEMBLY_ERROR_CODES = new Set([
    'agenda_item_announced', 'agenda_required', 'assembly_rules_incomplete', 'invitation_period_violated', 'invitation_not_supported', 'meeting_not_planned', 'meeting_without_date',
    'nothing_to_add', 'voting_roll_frozen', 'use_voting_roll_override', 'proxy_granted', 'proxy_not_allowed', 'proxy_not_supported', 'max_proxies_reached', 'grantor_not_eligible',
    'holder_not_eligible', 'grantor_present', 'proxy_self', 'meeting_closed', 'not_quorate', 'no_eligible_voters', 'not_eligible', 'not_checked_in', 'already_voted', 'ballot_closed',
    'ballot_not_started', 'ballot_not_open', 'ballot_not_draft', 'ballot_final', 'ballot_not_closed', 'ballot_not_counted', 'ballot_not_ended', 'circular_not_allowed',
    'secret_ballot_not_allowed', 'closes_at_required', 'invalid_window', 'invalid_selection', 'duplicate_option', 'unknown_option', 'agenda_item_not_announced', 'count_mismatch',
    'meeting_required', 'ballot_meeting_not_supported', 'invalid_max_choices', 'duplicate_choice', 'already_candidate', 'candidate_not_willing', 'candidate_in_round', 'no_candidates',
    'round_pending', 'round_running', 'round_not_final', 'round_decided', 'tie_needs_lot', 'no_tie', 'election_filled', 'election_closed', 'not_elected', 'role_not_electable',
    'department_required', 'department_not_allowed', 'lead_is_candidate', 'seats_below_elected', 'minutes_locked', 'minutes_approved', 'minutes_empty', 'minutes_not_draft',
    'minutes_not_submitted', 'minutes_not_confirmed', 'minutes_not_approved', 'minutes_two_persons', 'approval_meeting_not_later', 'approval_meeting_type_mismatch',
    'resolution_not_accepted', 'no_proxy', 'topic_mismatch', 'topic_needs_agenda_item', 'invalid_candidate_transition', 'invalid_lot', 'ballot_not_cancellable', 'round_not_decided', 'online_not_allowed', 'online_url_requires_mode', 'not_online', 'not_self_online', 'outside_check_in_window', 'reason_required',
]);

/** Missing statute parameters of a 422 `assembly_rules_incomplete` / `invitation_period_violated` answer. */
export function missingFromError(err: unknown): string[] {
    if (!(err instanceof ApiError)) return [];
    const missing = (err.details as { missing?: unknown } | undefined)?.missing;
    return Array.isArray(missing) ? missing.filter((m): m is string => typeof m === 'string') : [];
}

// --- Invitation -----------------------------------------------------------------------------------------------------------

export interface PeriodCheck {
    ok: boolean;
    reason: 'ok' | 'too_late' | 'no_date' | 'rules_missing';
    minDays: number | null;
    bufferDays: number | null;
    requiredDays: number | null;
    sendDay: string;
    meetingDay: string | null;
    daysAvailable: number | null;
    earliestMeetingDay: string | null;
    latestSendDay: string | null;
    timezone: string;
}

export interface InvitationPreview {
    kind: 'einladung' | 'nachtrag';
    period: PeriodCheck;
    missingRules: string[];
    agendaCount: number;
    newAgendaCount: number;
    agendaRequiredButEmpty: boolean;
    recipients: { total: number; email: number; inapp: number; post: number; sharedAddress: number };
}

/** Period check details of a 422 `invitation_period_violated`, if the error carries them. */
export function periodFromError(err: unknown): PeriodCheck | null {
    if (!(err instanceof ApiError) || (err.details as { code?: unknown } | undefined)?.code !== 'invitation_period_violated') return null;
    const d = err.details as Partial<PeriodCheck>;
    return typeof d.sendDay === 'string' ? (d as PeriodCheck) : null;
}

/** What blocks sending right now (without exception): rules missing, no date, empty required agenda, period too short, nothing new for a Nachtrag. */
export type SendBlocker = 'rules_missing' | 'no_date' | 'agenda_required' | 'too_late' | 'nothing_new' | null;

export function sendBlocker(p: InvitationPreview): SendBlocker {
    if (p.missingRules.length > 0 || p.period.reason === 'rules_missing') return 'rules_missing';
    if (p.period.reason === 'no_date') return 'no_date';
    if (p.agendaRequiredButEmpty) return 'agenda_required';
    if (p.kind === 'nachtrag' && p.newAgendaCount === 0) return 'nothing_new';
    if (!p.period.ok) return 'too_late';
    return null;
}

export interface DeliverySummaryRow {
    channel: 'email' | 'inapp' | 'post' | string;
    status: 'queued' | 'sent' | 'failed' | 'bounced' | 'manual_posted' | string;
    count: number;
}

/** Translation key of a delivery's reason code (`shared_address:<id>` = the address already gets the mail of another member). */
export function deliveryReasonKey(code: string): string {
    if (code.startsWith('shared_address')) return 'assembly.deliveryReason.shared_address';
    return ['no_address', 'email_failed', 'dispatch_failed'].includes(code) ? `assembly.deliveryReason.${code}` : 'assembly.deliveryReason.other';
}

/** Counts per status over all channels (the proof-of-delivery tiles). */
export function deliveryTotals(rows: readonly DeliverySummaryRow[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const r of rows) out[r.status] = (out[r.status] ?? 0) + r.count;
    return out;
}

// --- Quorum and voting roll ----------------------------------------------------------------------------------------------

export interface QuorumStatus {
    rollFrozen: boolean;
    asOf: string;
    eligibleTotal: number;
    presentEligible: number;
    proxiesRepresented: number;
    represented: number;
    quorumMode: AssemblyRules['quorumMode'];
    quorumValue: number | null;
    required: number | null;
    result: 'beschlussfaehig' | 'nicht_beschlussfaehig' | 'regeln_fehlen';
}

export interface VotingRollEntry {
    clubMemberId: string;
    displayName: string | null;
    eligible: boolean;
    basis: string;
    overrideReason: string | null;
}

// --- Ballots --------------------------------------------------------------------------------------------------------------

export type BallotStatus = 'draft' | 'open' | 'closed' | 'counted' | 'finalized' | 'cancelled';
export type BallotPhase = 'draft' | 'scheduled' | 'voting' | 'ended' | 'cancelled';

export interface BallotOption {
    id: string;
    position: number;
    label: string;
    kind: 'yes' | 'no' | 'abstain' | 'choice' | 'candidate';
    candidateClubMemberId: string | null;
}

export interface BallotMe {
    eligible: boolean;
    hasVoted: boolean;
    canVote: boolean;
    checkedIn: boolean | null;
    ownVoteOptionIds: string[] | null;
    proxies: Array<{ grantorClubMemberId: string; displayName: string | null; hasVoted: boolean }>;
}

export interface BallotResult {
    form?: 'yes_no' | 'choice';
    outcome?: string;
    reason?: string;
    yes?: number;
    no?: number;
    abstain?: number;
    eligible?: number;
    participants?: number;
    majority?: string;
    abstainCountsAs?: string;
    seats?: number;
    electedOptionIds?: string[];
    tiedOptionIds?: string[];
    tallies?: Array<{ optionId: string; votes: number; kind?: string; label?: string }>;
    flags?: { unannouncedAgendaItem?: boolean };
    final?: boolean;
}

export interface Ballot {
    id: string;
    mode: 'in_session' | 'circular';
    kind: 'resolution' | 'election';
    meetingId: string | null;
    agendaItemId: string | null;
    electionId: string | null;
    round: number | null;
    title: string;
    description: string | null;
    secret: boolean;
    topic: MajorityTopic;
    majority: MajorityKind | null;
    maxChoices: number;
    audience: 'all_voting_members' | 'board' | null;
    status: BallotStatus;
    phase: BallotPhase;
    opensAt: string | null;
    closesAt: string | null;
    closedAt: string | null;
    options: BallotOption[];
    result: BallotResult | null;
    resultHash: string | null;
    finalizedAt: string | null;
    createdAt: string;
}

export interface BallotDetail extends Ballot {
    meeting: { id: string; title: string; scheduledAt: string | null } | null;
    me: BallotMe;
    /** Managers only. */
    participation?: { eligible: number; voted: number };
    opening?: { eligible?: number; quorum?: { result?: string } | null; warnings?: string[]; withoutAccount?: number } | null;
    warnings?: string[];
}

export type VoterSection = 'open' | 'upcoming' | 'closed';

/** Where a ballot shows up on the voting page: voting now / announced / ended (cancelled ones stay hidden). */
export function voterSection(b: Pick<Ballot, 'phase'>): VoterSection | null {
    switch (b.phase) {
        case 'voting':
            return 'open';
        case 'scheduled':
            return 'upcoming';
        case 'ended':
            return 'closed';
        default:
            return null;
    }
}

export function groupForVoter<T extends Pick<Ballot, 'phase'>>(ballots: readonly T[]): Record<VoterSection, T[]> {
    const out: Record<VoterSection, T[]> = { open: [], upcoming: [], closed: [] };
    for (const b of ballots) {
        const section = voterSection(b);
        if (section) out[section].push(b);
    }
    return out;
}

/** Yes/no ballots allow exactly one option; a choice ballot up to `maxChoices`, and an abstention excludes everything else. */
export function toggleSelection(ballot: Pick<Ballot, 'maxChoices' | 'options'>, selected: readonly string[], optionId: string): string[] {
    const option = ballot.options.find((o) => o.id === optionId);
    if (!option) return [...selected];
    const single = ballot.maxChoices === 1 || ballot.options.some((o) => o.kind === 'yes');
    if (single) return selected.length === 1 && selected[0] === optionId ? [] : [optionId];
    if (selected.includes(optionId)) return selected.filter((id) => id !== optionId);
    if (option.kind === 'abstain') return [optionId];
    const withoutAbstain = selected.filter((id) => ballot.options.find((o) => o.id === id)?.kind !== 'abstain');
    return withoutAbstain.length >= ballot.maxChoices ? [...withoutAbstain] : [...withoutAbstain, optionId];
}

/** `true` when a failed vote means the vote is in fact recorded (409 `already_voted`), e.g. after a double submit. */
export function isAlreadyVoted(err: unknown): boolean {
    return err instanceof ApiError && err.status === 409 && (err.details as { code?: unknown } | undefined)?.code === 'already_voted';
}

export function selectionValid(ballot: Pick<Ballot, 'maxChoices'>, selected: readonly string[]): boolean {
    return selected.length >= 1 && selected.length <= ballot.maxChoices;
}

export const isYesNo = (ballot: Pick<Ballot, 'options'>): boolean => ballot.options.some((o) => o.kind === 'yes');

/** Remaining time to a deadline as { days, hours, minutes } (all 0 once passed). */
export function timeLeft(until: string | null, now: number): { days: number; hours: number; minutes: number; over: boolean } | null {
    if (!until) return null;
    const ms = new Date(until).getTime() - now;
    if (Number.isNaN(ms)) return null;
    if (ms <= 0) return { days: 0, hours: 0, minutes: 0, over: true };
    const minutes = Math.floor(ms / 60_000);
    return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60, over: false };
}

/** Actions the manager may take on a ballot, from its status and phase. */
export interface BallotActions {
    open: boolean;
    close: boolean;
    count: boolean;
    finalize: boolean;
    cancel: boolean;
    remove: boolean;
}

export function ballotActions(b: Pick<Ballot, 'status' | 'phase'>): BallotActions {
    return {
        open: b.status === 'draft',
        close: b.status === 'open' && b.phase === 'voting',
        count: b.status === 'closed',
        finalize: b.status === 'counted',
        cancel: b.status === 'draft' || b.status === 'open' || b.status === 'closed' || b.status === 'counted',
        remove: b.status === 'draft',
    };
}

/** Label of an option in a result (the tally carries none): looked up in the ballot's options. */
export function optionLabel(ballot: Pick<Ballot, 'options'>, optionId: string): string {
    return ballot.options.find((o) => o.id === optionId)?.label ?? '—';
}

// --- Elections ------------------------------------------------------------------------------------------------------------

export type CandidateStatus = 'proposed' | 'willing' | 'declined' | 'withdrawn' | 'elected' | 'accepted' | 'pending_account';

export interface ElectionCandidate {
    id: string;
    clubMemberId: string | null;
    displayName: string | null;
    status: CandidateStatus;
    proposedBy?: string | null;
    hasAccount?: boolean;
}

export interface ElectionListItem {
    id: string;
    meetingId: string | null;
    roleType: string;
    departmentId: string | null;
    seats: number;
    termMonths: number | null;
    electionLeadClubMemberId: string | null;
    status: 'planned' | 'running' | 'decided' | 'closed';
    decidedAt: string | null;
    createdAt: string;
}

export interface Election extends ElectionListItem {
    electionLeadName: string | null;
    openSeats: number;
    candidates: ElectionCandidate[];
    rounds: Array<{ ballotId: string; round: number; status: BallotStatus; secret: boolean; outcome: string | null }>;
    me: { candidateId: string; status: CandidateStatus } | null;
    decision?: unknown;
}

/** Roles an election can fill (backend `ELECTION_ROLE_TYPES`); `abteilungsleitung` and `trainer` belong to a department. */
export const ELECTION_ROLE_TYPES = ['vorsitz', 'stellv_vorsitz', 'kassenwart', 'schriftfuehrer', 'beisitzer', 'abteilungsleitung', 'trainer'] as const;
export const DEPARTMENT_ROLE_TYPES: readonly string[] = ['abteilungsleitung', 'trainer'];

/** Candidates who can be put on the next round: willing ones that are not yet elected. */
export function roundCandidates(e: Pick<Election, 'candidates'>): ElectionCandidate[] {
    return e.candidates.filter((c) => c.status === 'willing');
}

/** The latest round that is still to be worked on (not finalized or cancelled), if any. */
export function runningRound(e: Pick<Election, 'rounds'>): Election['rounds'][number] | null {
    return [...e.rounds].reverse().find((r) => r.status !== 'finalized' && r.status !== 'cancelled') ?? null;
}

/** Whether the election can be decided: the newest round is finalized and the election is not decided yet. */
export function canDecide(e: Pick<Election, 'rounds' | 'status'>): boolean {
    if (e.status === 'decided' || e.status === 'closed' || e.rounds.length === 0) return false;
    return e.rounds[e.rounds.length - 1]!.status === 'finalized';
}

// --- Terms of office ------------------------------------------------------------------------------------------------------

export type TermStatus = 'aktiv' | 'laeuft_bald_ab' | 'abgelaufen';

export interface ExpiringRole {
    id: string;
    clubMemberId: string | null;
    name: string | null;
    roleType: string;
    departmentId: string | null;
    termEndsAt: string | null;
    termStatus: TermStatus;
    termDaysLeft: number | null;
}

/** Days from `today` (YYYY-MM-DD) to the last day of the term; negative once it is over. */
export function termDaysLeft(termEndsAt: string | null | undefined, today: string): number | null {
    if (!termEndsAt) return null;
    const a = Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
    const b = Date.UTC(Number(termEndsAt.slice(0, 4)), Number(termEndsAt.slice(5, 7)) - 1, Number(termEndsAt.slice(8, 10)));
    return Math.round((b - a) / 86_400_000);
}

/** Display status for the Vereinsinfo list; without stated warning days the backend's display window of 90 days applies. */
export function termStatusOf(termEndsAt: string | null | undefined, today: string, displayDays = 90): TermStatus {
    const left = termDaysLeft(termEndsAt, today);
    if (left === null) return 'aktiv';
    if (left < 0) return 'abgelaufen';
    return left <= displayDays ? 'laeuft_bald_ab' : 'aktiv';
}

// --- Minutes --------------------------------------------------------------------------------------------------------------

export type MinutesStatus = 'entwurf' | 'zur_genehmigung' | 'genehmigt' | 'archiviert';
export const MINUTES_CONFIRM_ROLES = ['leitung', 'schriftfuehrung'] as const;

export interface MinutesVersion {
    id: string;
    meetingId: string;
    version: number;
    status: MinutesStatus;
    approved: boolean;
    content: string;
    contentHash: string;
    approvedInMeetingId: string | null;
    approvedResolutionId: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
    confirmations?: Array<{ role: (typeof MINUTES_CONFIRM_ROLES)[number]; confirmedAt: string; matchesText: boolean }>;
}

export interface MinutesView {
    current: MinutesVersion | null;
    versions: Array<{ id: string; version: number; status: MinutesStatus; approved: boolean; createdAt: string; approvedAt: string | null }>;
    amendments: Array<{ id: string; version: number; note: string; createdAt: string }>;
    approvalHint: { id: string; title: string; scheduledAt: string } | null;
}

/** What the secretary can do with the current minutes version (the backend checks again). */
export interface MinutesActions {
    edit: boolean;
    confirm: boolean;
    submit: boolean;
    reopen: boolean;
    approve: boolean;
    archive: boolean;
    amend: boolean;
}

export function minutesActions(current: Pick<MinutesVersion, 'status' | 'approved'> | null): MinutesActions {
    const status = current?.status ?? 'entwurf';
    const approved = current?.approved === true;
    return {
        edit: status === 'entwurf',
        confirm: status === 'entwurf' && current !== null,
        submit: status === 'entwurf' && current !== null,
        reopen: status === 'zur_genehmigung' && !approved,
        approve: status === 'zur_genehmigung' && !approved,
        archive: status === 'genehmigt',
        amend: approved || status === 'genehmigt' || status === 'archiviert',
    };
}

/** Both persons (Leitung, Schriftführung) confirmed exactly the text that is shown. */
export function minutesConfirmed(current: Pick<MinutesVersion, 'confirmations'> | null): boolean {
    const c = current?.confirmations ?? [];
    return MINUTES_CONFIRM_ROLES.every((role) => c.some((x) => x.role === role && x.matchesText));
}

// --- Agenda ---------------------------------------------------------------------------------------------------------------

export const VOTE_KINDS = ['none', 'resolution', 'election'] as const;

export interface AgendaItem {
    id: string;
    meetingId: string;
    position: number;
    title: string;
    description: string | null;
    voteKind: (typeof VOTE_KINDS)[number];
    topic: MajorityTopic;
    announced: boolean;
    announcedInInvitationId: string | null;
}

// --- Participation mode ---------------------------------------------------------------------------------------------------

export const PARTICIPATION_MODES = ['praesenz', 'hybrid', 'virtual'] as const;
export type ParticipationMode = (typeof PARTICIPATION_MODES)[number];

/** Modes the statute parameters allow (`onlineAllowed` is a ceiling); mirrors the backend. */
export function allowedParticipationModes(onlineAllowed: AssemblyRules['onlineAllowed'] | null | undefined): ParticipationMode[] {
    return onlineAllowed === 'virtual' ? ['praesenz', 'hybrid', 'virtual'] : onlineAllowed === 'hybrid' ? ['praesenz', 'hybrid'] : ['praesenz'];
}

/** Self-service check-in window of an online participant: one hour before until twelve hours after the start. */
export function inCheckInWindow(scheduledAt: string | null, now: number): boolean {
    if (!scheduledAt) return false;
    const start = new Date(scheduledAt).getTime();
    return !Number.isNaN(start) && now >= start - 3_600_000 && now <= start + 12 * 3_600_000;
}
