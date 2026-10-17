import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider } from '@/contexts/LanguageContext';

import CustomFieldsPanel from './CustomFieldsPanel';
import ProfileModulesDialog from './ProfileModulesDialog';

describe('ProfileModulesDialog', () => {
    it('opens with the explanations (optional, no reminders) and a loading state', () => {
        const html = renderToStaticMarkup(
            <LanguageProvider initialLanguage="de">
                <ProfileModulesDialog clubId="c1" canReadSensitive={false} onClose={() => {}} onChanged={() => {}} />
            </LanguageProvider>,
        );
        expect(html).toContain('Bausteine aktivieren');
        expect(html).toContain('Nichts ist Pflicht');
        expect(html).toContain('Keine Erinnerungen');
        expect(html).toContain('role="dialog"');
    });
});

describe('CustomFieldsPanel', () => {
    const render = (permissions: string[]) =>
        renderToStaticMarkup(
            <LanguageProvider initialLanguage="de">
                <CustomFieldsPanel clubId="c1" permissions={permissions} />
            </LanguageProvider>,
        );
    it('offers the module catalog with forms:write, as a plain button', () => {
        const html = render(['forms:write']);
        expect(html).toMatch(/<button type="button"[^>]*>(<svg.*<\/svg>)?Bausteine aktivieren<\/button>/);
    });
    it('offers nothing without forms:write', () => {
        const html = render([]);
        expect(html).not.toContain('Bausteine aktivieren');
    });
});
