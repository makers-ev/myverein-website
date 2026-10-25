import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';

/**
 * Machine-readable `details.code`s of the Wave 12 event routes (attendance, registration, helpers, rides, bookings, time
 * tracking). Each has a plain-language text `events.err.<code>`; everything else falls back to the shared member errors.
 */
export const EVENT_ERROR_CODES = [
    'event_cancelled',
    'reason_required',
    'already_closed',
    'unknown_member',
    'registration_closed',
    'party_size_unavailable',
    'party_too_large',
    'companions_not_allowed',
    'no_form',
    'invalid_party_size',
    'capacity_exceeded',
    'not_confirmed',
    'guests_not_allowed',
    'form_not_published',
    'form_locked',
    'ward_has_account',
    'too_many_pending',
    'shift_full',
    'shift_overlap',
    'shift_over',
    'minor_needs_guardian',
    'swap_open',
    'already_signed_up',
    'swap_closed',
    'swap_not_for_you',
    'capacity_below_filled',
    'driver_must_be_adult',
    'too_many_rides',
    'seats_below_confirmed',
    'request_exists',
    'ride_full',
    'location_busy',
    'not_bookable',
    'already_running',
    'none_running',
    'invalid_time',
    'in_future',
    'too_long',
    'too_old',
    'entry_overlap',
    'entry_decided',
    'no_self_decision',
] as const;

export type EventErrorCode = (typeof EVENT_ERROR_CODES)[number];

/** `details.code` of an `ApiError`, if it is one of the known event codes. */
export function eventErrorCode(err: unknown): EventErrorCode | null {
    if (!(err instanceof ApiError)) return null;
    const code = (err.details as { code?: unknown } | undefined)?.code;
    return typeof code === 'string' && (EVENT_ERROR_CODES as readonly string[]).includes(code) ? (code as EventErrorCode) : null;
}

/** Translation key for a failed event request. */
export function eventErrorKey(err: unknown): string {
    const code = eventErrorCode(err);
    if (code) return `events.err.${code}`;
    if (err instanceof ApiError && err.status === 429) return 'events.err.rate_limited';
    return memberErrorKey(err);
}
