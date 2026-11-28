// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError, apiFetch } from '@/lib/api-client';
import type { TimeEntry } from '@/lib/timeTracking';

import TimeTracking from './TimeTracking';

const { confirmMock } = vi.hoisted(() => ({ confirmMock: vi.fn<(o: unknown) => Promise<boolean>>() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k), language: 'de' }) }));
vi.mock('@/lib/api-client', async (orig) => ({ ...(await orig<typeof import('@/lib/api-client')>()), apiFetch: vi.fn() }));
vi.mock('@/components/useConfirm', () => ({ useConfirm: () => ({ confirm: confirmMock, dialog: null }) }));
vi.mock('./StundenBericht', () => ({ default: () => null }));
vi.mock('./MemberPicker', () => ({ default: () => null }));

const fetchMock = vi.mocked(apiFetch);
const HOUR = 3600_000;
const entry = (o: Partial<TimeEntry>): TimeEntry => ({ id: 'e', clubMemberId: 'm1', displayName: 'Mia', eventId: null, eventTitle: null, startedAt: new Date(Date.now() - HOUR).toISOString(), endedAt: null, minutes: null, running: true, source: 'stempeln', status: 'offen', confirmedAt: null, ...o });
const err = (status: number, code: string) => new ApiError(status, 'X', 'x', { code });

/** Backend stand-in: list, current entry and the clock-out answer are set per test. */
function backend(list: TimeEntry[], current: TimeEntry | null, clockOut?: () => Promise<unknown>) {
    fetchMock.mockImplementation(async (path: string, opts?: { method?: string }) => {
        if (path.startsWith('/time-entries/clock-out')) return clockOut ? clockOut() : {};
        if (path.startsWith('/time-entries/current')) return { data: current };
        if (path.startsWith('/time-entries/suggestions')) return { data: [] };
        if (path.startsWith('/time-entries?')) return { data: list };
        if (opts?.method) return {};
        throw new Error(`unexpected ${path}`);
    });
}

function ui(extra: Partial<React.ComponentProps<typeof TimeTracking>> = {}) {
    render(<TimeTracking clubId="c" canTrack canConfirm={false} canRates={false} ownClubMemberId="m1" events={[]} departments={[]} {...extra} />);
}
const calls = (method: string) => fetchMock.mock.calls.filter(([, o]) => (o as { method?: string } | undefined)?.method === method).map(([p]) => p);

beforeEach(() => {
    fetchMock.mockReset();
    confirmMock.mockReset();
});
afterEach(cleanup);

describe('TimeTracking running entry', () => {
    it('opens the end-time form when the server asks for an end time (409 needs_end_time)', async () => {
        const cur = entry({ id: 't1', startedAt: new Date(Date.now() - 9 * HOUR).toISOString() });
        backend([cur], cur, async () => {
            throw err(409, 'needs_end_time');
        });
        ui();
        fireEvent.click(await screen.findByRole('button', { name: /time\.clock\.out/ }));
        expect(await screen.findByLabelText('time.end.label')).not.toBeNull();
        expect(screen.getByRole('alert').textContent).toContain('events.err.needs_end_time');
    });

    it('hides "Ausstempeln" for a stuck entry and offers end time and discard instead', async () => {
        const cur = entry({ id: 't1', startedAt: new Date(Date.now() - 40 * HOUR).toISOString(), overdue: true });
        backend([cur], cur);
        ui();
        await screen.findAllByRole('button', { name: 'time.discard' });
        expect(screen.queryByRole('button', { name: /time\.clock\.out/ })).toBeNull();
        expect(screen.getAllByRole('button', { name: 'time.end.open' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('status')[0].textContent).toContain('time.running.stuck');
    });

    it('asks before discarding and deletes only after the answer is yes', async () => {
        const cur = entry({ id: 't1', startedAt: new Date(Date.now() - 40 * HOUR).toISOString(), overdue: true });
        backend([cur], cur);
        ui();
        const discard = (await screen.findAllByRole('button', { name: 'time.discard' }))[0];
        confirmMock.mockResolvedValueOnce(false);
        fireEvent.click(discard);
        await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
        expect(calls('DELETE')).toEqual([]);
        confirmMock.mockResolvedValueOnce(true);
        fireEvent.click(discard);
        await waitFor(() => expect(calls('DELETE')).toEqual(['/time-entries/t1?clubId=c']));
    });
});

describe('TimeTracking closed by you', () => {
    it('explains up front but keeps "Bestätigen" for an entry the viewer ended', async () => {
        const done = entry({ id: 't4', clubMemberId: 'm2', displayName: 'Jonas', running: false, endedAt: new Date().toISOString(), minutes: 960, closedByOther: true, closedByYou: true });
        backend([done], null);
        ui({ canConfirm: true });
        expect(await screen.findByText('time.closedByYou.note')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'time.confirm' })).not.toBeNull();
    });

    it('shows no note for entries the viewer did not end, and the server error stays readable', async () => {
        const done = entry({ id: 't5', clubMemberId: 'm2', displayName: 'Jonas', running: false, endedAt: new Date().toISOString(), minutes: 60, closedByOther: true });
        backend([done], null);
        ui({ canConfirm: true });
        await screen.findByText('Jonas');
        expect(screen.queryByText('time.closedByYou.note')).toBeNull();
        fetchMock.mockImplementation(async () => {
            throw err(403, 'closed_by_you');
        });
        fireEvent.click(screen.getByRole('button', { name: 'time.confirm' }));
        expect((await screen.findByRole('alert')).textContent).toContain('events.err.closed_by_you');
    });
});

describe('TimeTracking team view', () => {
    const others = entry({ id: 't2', clubMemberId: 'm2', displayName: 'Jonas', startedAt: new Date(Date.now() - 328 * HOUR).toISOString(), overdue: true });

    it('shows "Beenden mit Endzeit" and "Ablehnen" for stuck entries of others only with the confirm right', async () => {
        backend([others], null);
        ui({ canConfirm: true });
        expect(await screen.findByRole('button', { name: 'time.close.open' })).not.toBeNull();
        expect(screen.getByRole('button', { name: 'time.reject' })).not.toBeNull();
        cleanup();
        backend([others], null);
        ui({ canConfirm: false });
        await screen.findByText('Jonas');
        expect(screen.queryByRole('button', { name: 'time.close.open' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'time.reject' })).toBeNull();
    });

    it('never offers closing for the own stuck entry or for a running entry that is not stuck', async () => {
        const mine = entry({ id: 't1', clubMemberId: 'm1', startedAt: new Date(Date.now() - 40 * HOUR).toISOString(), overdue: true });
        const fresh = entry({ id: 't3', clubMemberId: 'm3', displayName: 'Lena', startedAt: new Date(Date.now() - 2 * HOUR).toISOString() });
        backend([mine, fresh], null);
        ui({ canConfirm: true });
        await screen.findByText('Lena');
        expect(screen.queryByRole('button', { name: 'time.close.open' })).toBeNull();
    });

    it('closes with an end time and reloads when the entry changed meanwhile', async () => {
        backend([others], null);
        ui({ canConfirm: true });
        fireEvent.click(await screen.findByRole('button', { name: 'time.close.open' }));
        const input = await screen.findByLabelText('time.end.label');
        const start = new Date(others.startedAt).getTime();
        const d = new Date(start + 2 * HOUR);
        const p = (n: number) => String(n).padStart(2, '0');
        fireEvent.change(input, { target: { value: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` } });
        fetchMock.mockImplementation(async (path: string) => {
            if (path.startsWith('/time-entries/t2/close')) throw err(409, 'not_running');
            if (path.startsWith('/time-entries/current')) return { data: null };
            if (path.startsWith('/time-entries/suggestions')) return { data: [] };
            return { data: [] };
        });
        fireEvent.click(screen.getByRole('button', { name: 'time.close.submit' }));
        await waitFor(() => expect(screen.queryByLabelText('time.end.label')).toBeNull());
        expect(screen.getByRole('alert').textContent).toContain('events.err.not_running');
        expect(fetchMock.mock.calls.filter(([p]) => String(p).startsWith('/time-entries?')).length).toBeGreaterThan(1);
    });
});
