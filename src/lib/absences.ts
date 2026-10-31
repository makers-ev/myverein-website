import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';

/**
 * Absence reports (Wave 10 B5): "krank" / "abwesend" with a period and a short note. Data minimisation by contract: there is no
 * diagnosis field, the note is capped at 200 characters and the UI says so. Trainers see who is missing, never why (the
 * overlay and notifications carry person + period only).
 */

export const ABSENCE_KINDS = ['krank', 'abwesend'] as const;
export type AbsenceKind = (typeof ABSENCE_KINDS)[number];

export const NOTE_MAX = 200;

export interface Absence {
    id: string;
    clubMemberId: string;
    kind: AbsenceKind;
    startsOn: string;
    endsOn: string;
    note: string | null;
    reportedByKind: 'self' | 'guardian';
    withdrawnAt: string | null;
    createdAt: string;
    updatedAt: string;
}

/** `GET /absences/club` row: the report plus the person's name. */
export interface ClubAbsence extends Absence {
    displayName: string;
}

/** `GET /absences/event/:eventId` row: who is absent on the day of the event and for how long (no kind, no note). */
export interface EventAbsence {
    clubMemberId: string;
    displayName: string;
    startsOn: string;
    endsOn: string;
}

export interface AbsenceInput {
    kind: AbsenceKind;
    startsOn: string;
    endsOn: string;
    note?: string;
}

export type AbsenceProblem = 'dates' | 'order' | 'note';

/** Client-side convenience check (the backend validates again); `null` = fine. */
export function absenceProblem(input: { startsOn: string; endsOn: string; note: string }): AbsenceProblem | null {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if (!iso.test(input.startsOn) || !iso.test(input.endsOn)) return 'dates';
    if (input.endsOn < input.startsOn) return 'order';
    if (input.note.length > NOTE_MAX) return 'note';
    return null;
}

/** Body of a create request: an empty note is left out. */
export function absenceBody(input: { kind: AbsenceKind; startsOn: string; endsOn: string; note: string }): AbsenceInput {
    const note = input.note.trim();
    return { kind: input.kind, startsOn: input.startsOn, endsOn: input.endsOn, ...(note ? { note } : {}) };
}

/** Translation key for a failed absence call: the 422/403/409 `details.code` values first, then the generic mapping. */
export function absenceErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        switch (code) {
            case 'invalid_period':
                return 'absence.err.invalidPeriod';
            case 'period_too_old':
                return 'absence.err.periodTooOld';
            case 'period_too_long':
                return 'absence.err.periodTooLong';
            case 'absence_withdrawn':
                return 'absence.err.withdrawn';
            case 'guardian_cannot_report_absence':
                return 'absence.err.guardianCannot';
        }
    }
    return memberErrorKey(err);
}

/** `from – to`, or a single day when both are equal. */
export function periodLabel(startsOn: string, endsOn: string, format: (d: string) => string): string {
    return startsOn === endsOn ? format(startsOn) : `${format(startsOn)} – ${format(endsOn)}`;
}
