import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { LanguageProvider } from '@/contexts/LanguageContext';

import ChildrenFields from './ChildrenFields';

describe('ChildrenFields', () => {
    it('renders nothing before (and without) an answer: no loading text, no message', () => {
        const html = renderToStaticMarkup(
            <LanguageProvider initialLanguage="de">
                <ChildrenFields clubId="c1" />
            </LanguageProvider>,
        );
        expect(html).toBe('');
    });
});
