import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import {
    type AssemblyRules,
    allowedParticipationModes,
    assemblyErrorKey,
    buildRulesPatch,
    canDecide,
    groupForVoter,
    inCheckInWindow,
    minutesActions,
    minutesConfirmed,
    parseWarningDays,
    parseWholeNumber,
    selectionValid,
    sendBlocker,
    termStatusOf,
    toggleSelection,
    type InvitationPreview,
} from './assembly';

const rules = (over: Partial<AssemblyRules> = {}): AssemblyRules => ({
    invitationMinDays: null, invitationDeliveryBufferDays: null, invitationForm: null, agendaRequiredInInvitation: null, quorumMode: null, quorumValue: null,
    majorityByTopic: { allgemein: null, satzungsaenderung: null, zweckaenderung: null, wahl: null, entlastung: null, aufloesung: null },
    abstainCountsAs: null, proxyAllowed: null, maxProxiesPerPerson: null, onlineAllowed: 'none', circularAllowed: false, circularMinParticipation: null, circularUnanimity: null,
    secretBallotDigitalAllowed: false, votingMinAge: null, votingStatuses: null, termWarningDays: null, termExpiryEffect: 'none', satzungReference: null, satzungPageSlug: null, ...over,
});

describe('rules patch', () => {
    it('sends only changed fields and single topics', () => {
        const current = rules();
        const draft = rules({ invitationMinDays: 14, majorityByTopic: { ...current.majorityByTopic, wahl: 'einfach' } });
        expect(buildRulesPatch(current, draft)).toEqual({ invitationMinDays: 14, majorityByTopic: { wahl: 'einfach' } });
        expect(buildRulesPatch(current, current)).toEqual({});
    });

    it('parses numbers and warning days strictly', () => {
        expect(parseWholeNumber('')).toBeNull();
        expect(parseWholeNumber('14')).toBe(14);
        expect(parseWholeNumber('-1')).toBeUndefined();
        expect(parseWarningDays('7, 90 30')).toEqual([90, 30, 7]);
        expect(parseWarningDays('7, 7')).toBeUndefined();
        expect(parseWarningDays('')).toBeNull();
    });
});

describe('invitation blockers', () => {
    const base: InvitationPreview = {
        kind: 'einladung',
        period: { ok: true, reason: 'ok', minDays: 14, bufferDays: 3, requiredDays: 17, sendDay: '2026-01-01', meetingDay: '2026-02-01', daysAvailable: 31, earliestMeetingDay: '2026-01-18', latestSendDay: '2026-01-15', timezone: 'Europe/Berlin' },
        missingRules: [], agendaCount: 2, newAgendaCount: 2, agendaRequiredButEmpty: false, recipients: { total: 10, email: 6, inapp: 3, post: 1, sharedAddress: 0 },
    };
    it('names the first thing that blocks sending', () => {
        expect(sendBlocker(base)).toBeNull();
        expect(sendBlocker({ ...base, missingRules: ['quorumMode'] })).toBe('rules_missing');
        expect(sendBlocker({ ...base, period: { ...base.period, ok: false, reason: 'too_late' } })).toBe('too_late');
        expect(sendBlocker({ ...base, kind: 'nachtrag', newAgendaCount: 0 })).toBe('nothing_new');
    });
});

describe('voting selection', () => {
    const yesNo = { maxChoices: 1, options: [{ id: 'y', kind: 'yes' }, { id: 'n', kind: 'no' }, { id: 'a', kind: 'abstain' }] } as never;
    const choice = { maxChoices: 2, options: [{ id: 'a', kind: 'choice' }, { id: 'b', kind: 'choice' }, { id: 'c', kind: 'choice' }, { id: 'x', kind: 'abstain' }] } as never;
    it('allows one option on yes/no and replaces it', () => {
        expect(toggleSelection(yesNo, [], 'y')).toEqual(['y']);
        expect(toggleSelection(yesNo, ['y'], 'n')).toEqual(['n']);
        expect(toggleSelection(yesNo, ['y'], 'y')).toEqual([]);
    });
    it('caps choices and lets an abstention exclude the rest', () => {
        expect(toggleSelection(choice, ['a', 'b'], 'c')).toEqual(['a', 'b']);
        expect(toggleSelection(choice, ['a'], 'x')).toEqual(['x']);
        expect(toggleSelection(choice, ['x'], 'b')).toEqual(['b']);
        expect(selectionValid({ maxChoices: 2 }, ['a', 'b'])).toBe(true);
        expect(selectionValid({ maxChoices: 2 }, [])).toBe(false);
    });
    it('groups ballots for the voter and hides drafts and cancelled ones', () => {
        const g = groupForVoter([{ phase: 'voting' }, { phase: 'scheduled' }, { phase: 'ended' }, { phase: 'draft' }, { phase: 'cancelled' }]);
        expect([g.open.length, g.upcoming.length, g.closed.length]).toEqual([1, 1, 1]);
    });
});

describe('elections, minutes, terms, online', () => {
    it('decides only after a finalized last round', () => {
        expect(canDecide({ status: 'running', rounds: [{ ballotId: '1', round: 1, status: 'finalized', secret: false, outcome: null }] })).toBe(true);
        expect(canDecide({ status: 'running', rounds: [{ ballotId: '1', round: 1, status: 'open', secret: false, outcome: null }] })).toBe(false);
        expect(canDecide({ status: 'decided', rounds: [{ ballotId: '1', round: 1, status: 'finalized', secret: false, outcome: null }] })).toBe(false);
    });
    it('derives minutes actions and confirmation', () => {
        expect(minutesActions(null).edit).toBe(true);
        expect(minutesActions({ status: 'zur_genehmigung', approved: false })).toMatchObject({ edit: false, approve: true, reopen: true });
        expect(minutesActions({ status: 'genehmigt', approved: true })).toMatchObject({ edit: false, amend: true, archive: true });
        const ok = { confirmations: [{ role: 'leitung', confirmedAt: '', matchesText: true }, { role: 'schriftfuehrung', confirmedAt: '', matchesText: true }] } as never;
        expect(minutesConfirmed(ok)).toBe(true);
        expect(minutesConfirmed({ confirmations: [{ role: 'leitung', confirmedAt: '', matchesText: true }] } as never)).toBe(false);
    });
    it('derives the term status', () => {
        expect(termStatusOf('2026-12-31', '2026-01-01')).toBe('aktiv');
        expect(termStatusOf('2026-02-01', '2026-01-01')).toBe('laeuft_bald_ab');
        expect(termStatusOf('2025-12-31', '2026-01-01')).toBe('abgelaufen');
        expect(termStatusOf(null, '2026-01-01')).toBe('aktiv');
    });
    it('limits participation modes by the statute ceiling and the check-in window', () => {
        expect(allowedParticipationModes('none')).toEqual(['praesenz']);
        expect(allowedParticipationModes('hybrid')).toEqual(['praesenz', 'hybrid']);
        const start = '2026-05-01T18:00:00Z';
        const t0 = new Date(start).getTime();
        expect(inCheckInWindow(start, t0 - 30 * 60_000)).toBe(true);
        expect(inCheckInWindow(start, t0 - 2 * 3_600_000)).toBe(false);
        expect(inCheckInWindow(start, t0 + 13 * 3_600_000)).toBe(false);
    });
    it('maps backend detail codes to assembly messages and falls back to the generic ones', () => {
        expect(assemblyErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'already_voted' }))).toBe('assembly.err.already_voted');
        expect(assemblyErrorKey(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('verein.err.forbidden');
    });
});
