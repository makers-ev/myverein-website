import { describe, expect, it } from 'vitest';

import { validateContactPayload } from './route';

const valid = { name: 'Alex', email: 'alex@example.com', category: 'general', message: 'Hello there' };

describe('validateContactPayload', () => {
  it('accepts a valid bug/feature/general submission', () => {
    const result = validateContactPayload(valid);
    expect('data' in result).toBe(true);
  });

  it('rejects a filled-in honeypot', () => {
    const result = validateContactPayload({ ...valid, honeypot: 'im-a-bot' });
    expect(result).toEqual({ error: 'Message not sent' });
  });

  it('rejects a missing name', () => {
    const result = validateContactPayload({ ...valid, name: '' });
    expect('error' in result).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = validateContactPayload({ ...valid, email: 'not-an-email' });
    expect('error' in result).toBe(true);
  });

  it('rejects an unknown category', () => {
    const result = validateContactPayload({ ...valid, category: 'complaint' });
    expect('error' in result).toBe(true);
  });

  it('rejects a missing message', () => {
    const result = validateContactPayload({ name: 'Alex', email: 'alex@example.com', category: 'general' });
    expect('error' in result).toBe(true);
  });
});
