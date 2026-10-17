import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider } from '@/contexts/LanguageContext';

import { EnteredByNote } from './ExpiryBadge';

const render = (enteredBy: unknown, hasValue = false) =>
    renderToStaticMarkup(
        <LanguageProvider initialLanguage="de">
            <EnteredByNote enteredBy={enteredBy as never} hasValue={hasValue} />
        </LanguageProvider>,
    );

describe('EnteredByNote', () => {
    it('marks self and guardian entries as not checked by the club, the board entry as the club record', () => {
        expect(render('self')).toContain('nicht geprüft');
        expect(render('guardian')).toContain('Von Erziehungsberechtigten eingetragen');
        expect(render('guardian')).toContain('nicht geprüft');
        expect(render('board')).toContain('Vom Vorstand eingetragen');
        expect(render('board')).not.toContain('nicht geprüft');
        expect(render('guardian')).toContain('aria-hidden="true"');
    });
    it('renders nothing without any value', () => {
        expect(render(null)).toBe('');
        expect(render(undefined)).toBe('');
    });
    it('treats everything but board as unchecked: unknown values and a missing one for a stored value show the self text', () => {
        expect(render('x')).toContain('nicht geprüft');
        expect(render(null, true)).toContain('nicht geprüft');
        expect(render(undefined, true)).toContain('nicht geprüft');
        expect(render('board', true)).not.toContain('nicht geprüft');
    });
});
