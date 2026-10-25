/**
 * Ride shares of an event (Wave 12 W10, backend `/events/:id/rides`). The departure place and note are hidden by the server
 * for people who are not involved (`placeHidden`); the driver must be an adult (`driver_must_be_adult`), minors ask through a
 * guardian (`minor_needs_guardian`). Pure helpers and shapes.
 */

export type RequestStatus = 'angefragt' | 'zugesagt' | 'abgelehnt';

export interface RideRequestMine {
    requestId: string;
    clubMemberId: string;
    status: RequestStatus;
}

export interface RideRequestOfDriver {
    requestId: string;
    clubMemberId: string;
    displayName: string | null;
    status: RequestStatus;
    createdAt: string;
}

export interface Ride {
    id: string;
    driver: { clubMemberId: string; displayName: string | null };
    seats: number;
    seatsTaken: number;
    seatsFree: number;
    departureAt: string | null;
    departurePlace: string | null;
    note: string | null;
    placeHidden: boolean;
    mine: boolean;
    myRequests: RideRequestMine[];
    requests?: RideRequestOfDriver[];
    pendingCount: number;
}

export const MAX_SEATS = 8;

export type RideProblem = 'seats' | 'place';

export function rideProblem(seats: string, place: string): RideProblem | null {
    const n = Number(seats);
    if (!Number.isInteger(n) || n < 1 || n > MAX_SEATS) return 'seats';
    if (!place.trim()) return 'place';
    return null;
}

export function rideBody(seats: string, place: string, departureAt: string, note: string): Record<string, unknown> {
    return {
        seats: Number(seats),
        departurePlace: place.trim(),
        departureAt: departureAt ? new Date(departureAt).toISOString() : null,
        note: note.trim() || null,
    };
}

/** The viewer's open or confirmed request for `clubMemberId` (the person they act for), if any. */
export function requestFor(ride: Pick<Ride, 'myRequests'>, clubMemberId: string | null, ownId: string | null): RideRequestMine | undefined {
    const target = clubMemberId ?? ownId;
    if (!target) return ride.myRequests[0];
    return ride.myRequests.find((r) => r.clubMemberId === target);
}

export function pendingRequests(ride: Pick<Ride, 'requests'>): RideRequestOfDriver[] {
    return (ride.requests ?? []).filter((r) => r.status === 'angefragt');
}
