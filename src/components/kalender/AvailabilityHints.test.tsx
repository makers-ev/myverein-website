// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

import { ApiError, apiFetch } from '@/lib/api-client';
import type { AvailabilityHints as Hints } from '@/lib/availabilityHints';

import AvailabilityHints from './AvailabilityHints';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k), language: 'de' }) }));
vi.mock('@/lib/api-client', async (orig) => ({ ...(await orig<typeof import('@/lib/api-client')>()), apiFetch: vi.fn() }));

const fetchMock = vi.mocked(apiFetch);
const hints = (o: Partial<Hints> = {}): { data: Hints } => ({
    data: { calendarId: 'a', eventId: null, startsAt: '', endsAt: null, timezone: 'Europe/Berlin', pool: 'department', counts: { total: 18, verfuegbar: 12, nicht_verfuegbar: 2, unbekannt: 4 }, includesNames: true, unavailablePeople: [{ clubMemberId: '1', displayName: 'Berta' }, { clubMemberId: '2', displayName: 'Anna' }], truncated: false, ...o },
});
const props = { clubId: 'c', calendarId: 'a', startsAt: '2026-12-01T17:00:00.000Z', endsAt: '2026-12-01T19:00:00.000Z' };
const WAIT = { timeout: 3000 };

beforeEach(() => {
    fetchMock.mockReset();
});
afterEach(cleanup);

describe('AvailabilityHints', () => {
    it('shows counter, pool and the names when the backend sends them', async () => {
        fetchMock.mockResolvedValue(hints());
        render(<AvailabilityHints {...props} />);
        expect(await screen.findByText(/availability\.count/, undefined, WAIT)).not.toBeNull();
        expect(screen.getByText(/availability\.count/).textContent).toContain('"free":12,"total":18');
        expect(screen.getByText('availability.pool.department')).not.toBeNull();
        const names = screen.getAllByRole('listitem').map((l) => l.textContent);
        expect(names).toContain('Anna');
        expect(names.indexOf('Anna')).toBeLessThan(names.indexOf('Berta'));
    });

    it('shows no names for a counters-only answer', async () => {
        fetchMock.mockResolvedValue(hints({ includesNames: false, unavailablePeople: null }));
        render(<AvailabilityHints {...props} />);
        await screen.findByText(/availability\.count/, undefined, WAIT);
        expect(screen.queryByText('Anna')).toBeNull();
        expect(document.querySelector('details')).toBeNull();
    });

    it('removes itself on 403', async () => {
        fetchMock.mockImplementation(() => Promise.reject(new ApiError(403, 'FORBIDDEN', 'x')));
        render(<AvailabilityHints {...props} />);
        expect(screen.getByText('availability.title')).not.toBeNull();
        await waitFor(() => expect(screen.queryByText('availability.title')).toBeNull(), WAIT);
    });

    it('shows an error with retry for other failures and never an alert inside a live region', async () => {
        fetchMock.mockImplementation(() => Promise.reject(new ApiError(500, 'X', 'x')));
        render(<AvailabilityHints {...props} />);
        const alert = await screen.findByRole('alert', undefined, WAIT);
        expect(alert.closest('[aria-live]')).toBeNull();
        expect(screen.getByRole('button', { name: 'availability.retry' })).not.toBeNull();
    });

    it('drops the old pool text as soon as the calendar changes', async () => {
        fetchMock.mockResolvedValueOnce(hints());
        const { rerender } = render(<AvailabilityHints {...props} />);
        await screen.findByText('availability.pool.department', undefined, WAIT);
        fetchMock.mockReturnValueOnce(new Promise(() => {}));
        rerender(<AvailabilityHints {...props} calendarId="b" />);
        expect(screen.queryByText('availability.pool.department')).toBeNull();
        expect(screen.getByText('availability.loading')).not.toBeNull();
    });

    it('ignores a superseded answer that arrives late', async () => {
        let late: (v: unknown) => void = () => {};
        fetchMock.mockReturnValueOnce(new Promise((r) => (late = r)));
        const { rerender } = render(<AvailabilityHints {...props} />);
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), WAIT);
        fetchMock.mockResolvedValueOnce(hints({ pool: 'club', counts: { total: 5, verfuegbar: 5, nicht_verfuegbar: 0, unbekannt: 0 } }));
        rerender(<AvailabilityHints {...props} calendarId="b" />);
        await screen.findByText('availability.pool.club', undefined, WAIT);
        late(hints());
        await new Promise((r) => setTimeout(r, 50));
        expect(screen.queryByText('availability.pool.department')).toBeNull();
        expect(screen.getByText(/availability\.count/).textContent).toContain('"total":5');
    });

    it('aborts the previous request and sends nothing for an incomplete range', async () => {
        fetchMock.mockReturnValue(new Promise(() => {}));
        const { rerender } = render(<AvailabilityHints {...props} />);
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), WAIT);
        const signal = (fetchMock.mock.calls[0][1] as { signal: AbortSignal }).signal;
        rerender(<AvailabilityHints {...props} endsAt="2026-12-30T19:00:00.000Z" />);
        expect(signal.aborted).toBe(true);
        expect(screen.getByText('availability.range')).not.toBeNull();
    });
});
