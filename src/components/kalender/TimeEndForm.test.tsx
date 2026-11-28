// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError, apiFetch } from '@/lib/api-client';
import { toLocalValue } from '@/lib/timeTracking';

import TimeEndForm from './TimeEndForm';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k), language: 'de' }) }));
vi.mock('@/lib/api-client', async (orig) => ({ ...(await orig<typeof import('@/lib/api-client')>()), apiFetch: vi.fn() }));

const HOUR = 3600_000;
const startMs = Date.now() - 40 * HOUR;
const entry = { id: 't1', clubMemberId: 'm1', displayName: 'Mia', eventId: null, eventTitle: null, startedAt: new Date(startMs).toISOString(), endedAt: null, minutes: null, running: true, source: 'stempeln' as const, status: 'offen' as const, confirmedAt: null };
const fetchMock = vi.mocked(apiFetch);
const err = (status: number, code: string) => new ApiError(status, 'X', 'x', { code });

function setup(extra: Partial<React.ComponentProps<typeof TimeEndForm>> = {}) {
    const props = { entry, endpoint: '/time-entries/clock-out?clubId=c', submitLabel: 'SAVE', onDone: vi.fn(), onCancel: vi.fn(), onStale: vi.fn(), ...extra };
    render(<TimeEndForm {...props} />);
    return props;
}
const pick = (ms: number) => fireEvent.change(screen.getByLabelText('time.end.label'), { target: { value: toLocalValue(ms) } });

beforeEach(() => {
    fetchMock.mockReset();
});
afterEach(cleanup);

describe('TimeEndForm', () => {
    it('offers only the window between the start and start + 16 h', () => {
        setup();
        const input = screen.getByLabelText('time.end.label') as HTMLInputElement;
        expect(input.min).toBe(toLocalValue(startMs));
        expect(input.max).toBe(toLocalValue(startMs + 16 * HOUR));
    });

    it('blocks times before the start, beyond 16 h and in the future', () => {
        setup();
        const save = screen.getByRole('button', { name: 'SAVE' });
        expect((save as HTMLButtonElement).disabled).toBe(true);
        pick(startMs - HOUR);
        expect(screen.getByRole('alert').textContent).toContain('events.err.invalid_time');
        pick(startMs + 17 * HOUR);
        expect(screen.getByRole('alert').textContent).toContain('time.err.endTooLong');
        expect((save as HTMLButtonElement).disabled).toBe(true);
        pick(startMs + 2 * HOUR);
        expect((save as HTMLButtonElement).disabled).toBe(false);
    });

    it('sends endedAt and closes on success', async () => {
        fetchMock.mockResolvedValue({});
        const p = setup();
        pick(startMs + 2 * HOUR);
        fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
        await waitFor(() => expect(p.onDone).toHaveBeenCalledTimes(1));
        const [path, opts] = fetchMock.mock.calls[0];
        expect(path).toBe('/time-entries/clock-out?clubId=c');
        expect(opts).toMatchObject({ method: 'POST', body: { endedAt: new Date(toLocalValue(startMs + 2 * HOUR)).toISOString() } });
    });

    it('keeps the form open and shows the reason when the server refuses', async () => {
        fetchMock.mockRejectedValue(err(422, 'in_future'));
        const p = setup();
        pick(startMs + 2 * HOUR);
        fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
        expect(await screen.findByText('events.err.in_future')).not.toBeNull();
        expect(p.onDone).not.toHaveBeenCalled();
        expect(p.onStale).not.toHaveBeenCalled();
        expect(screen.getByLabelText('time.end.label')).not.toBeNull();
    });

    it.each(['not_running', 'not_overdue', 'entry_overlap'])('hands %s to the parent for a reload', async (code) => {
        fetchMock.mockRejectedValue(err(409, code));
        const p = setup();
        pick(startMs + 2 * HOUR);
        fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
        await waitFor(() => expect(p.onStale).toHaveBeenCalledWith(`events.err.${code}`));
    });

    it('reports its pending state to the parent and waits while the parent is busy', async () => {
        let resolve: () => void = () => {};
        fetchMock.mockReturnValue(new Promise((r) => (resolve = () => r({}))));
        const onBusy = vi.fn();
        setup({ onBusy });
        pick(startMs + 2 * HOUR);
        fireEvent.click(screen.getByRole('button', { name: 'SAVE' }));
        await waitFor(() => expect(onBusy).toHaveBeenCalledWith(true));
        expect((screen.getByRole('button', { name: 'SAVE' }) as HTMLButtonElement).disabled).toBe(true);
        resolve();
        await waitFor(() => expect(onBusy).toHaveBeenLastCalledWith(false));
        cleanup();
        setup({ disabled: true });
        pick(startMs + 2 * HOUR);
        expect((screen.getByRole('button', { name: 'SAVE' }) as HTMLButtonElement).disabled).toBe(true);
    });
});
