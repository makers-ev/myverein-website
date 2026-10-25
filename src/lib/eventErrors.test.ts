import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { eventErrorCode, eventErrorKey } from './eventErrors';
import { translations } from '@/contexts/LanguageContext';
import { EVENT_ERROR_CODES } from './eventErrors';

describe('eventErrorKey', () => {
    it('maps known detail codes', () => {
        expect(eventErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'shift_full' }))).toBe('events.err.shift_full');
        expect(eventErrorCode(new ApiError(409, 'CONFLICT', 'x', { code: 'nope' }))).toBeNull();
    });

    it('falls back to the member errors', () => {
        expect(eventErrorKey(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('verein.err.forbidden');
        expect(eventErrorKey(new ApiError(429, 'RATE', 'x'))).toBe('events.err.rate_limited');
    });

    it('has a German and an English text for every code', () => {
        for (const code of EVENT_ERROR_CODES) {
            expect(translations.de[`events.err.${code}`], code).toBeTruthy();
            expect(translations.en[`events.err.${code}`], code).toBeTruthy();
        }
    });
});
