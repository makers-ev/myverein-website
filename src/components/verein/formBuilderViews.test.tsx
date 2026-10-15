import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({ ApiError: class ApiError extends Error {}, apiFetch: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import AnswerList from '@/components/forms/AnswerList';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { describeProblems, summarizeChanges } from '@/lib/formEditor';
import type { RenderedAnswer } from '@/lib/applicationReview';
import type { FormField } from '@/lib/formSchema';

import CustomFieldsPanel from './CustomFieldsPanel';
import FormPublishDialog, { ProblemList } from './FormPublishDialog';
import FormsPanel from './FormsPanel';

const wrap = (node: React.ReactNode, lang: 'de' | 'en' = 'de') => renderToStaticMarkup(<LanguageProvider initialLanguage={lang}>{node}</LanguageProvider>);

describe('permission gating of the new panels', () => {
    it('shows an explanation instead of the form editor without forms:write', () => {
        for (const permissions of [[], ['members:write'], ['members:read_sensitive', 'members:write']]) {
            const html = wrap(<FormsPanel clubId="c1" permissions={permissions} onDirtyChange={() => {}} />);
            expect(html).toContain('Formulare bearbeiten');
            expect(html).not.toContain('Aufnahmeantrag');
            expect(html).not.toContain('<button');
        }
    });

    it('shows an explanation instead of the custom field definitions without forms:write', () => {
        const html = wrap(<CustomFieldsPanel clubId="c1" permissions={['members:write']} />);
        expect(html).toContain('Formulare bearbeiten');
        expect(html).not.toContain('<button');
    });

    it('offers the editor with forms:write (loading state first)', () => {
        const html = wrap(<FormsPanel clubId="c1" permissions={['forms:write']} onDirtyChange={() => {}} />);
        expect(html).toContain('role="status"');
        const cf = wrap(<CustomFieldsPanel clubId="c1" permissions={['forms:write']} />);
        expect(cf).toContain('Zusatzfeld anlegen');
    });
});

describe('plain-text rendering of definition text', () => {
    it('renders field labels in the problem list as text, never as HTML', () => {
        const fields: FormField[] = [{ key: 'evil', type: 'text', label: '<img src=x onerror=alert(1)>' }];
        const html = wrap(<ProblemList problems={describeProblems([{ code: 'mapping_not_allowed', fieldKey: 'evil' }], fields)} onGoToField={() => {}} />);
        expect(html).not.toMatch(/<img/);
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).toContain('Zum Feld');
    });

    it('lists the changed field labels of the publish summary as text', () => {
        const fields: FormField[] = [{ key: 'evil', type: 'text', label: '<script>alert(1)</script>' }];
        const html = wrap(
            <FormPublishDialog
                summary={summarizeChanges({ fields: [], privacyNotice: null }, { fields, privacyNotice: '' })}
                publishedVersion={1}
                needsSave
                checks={[]}
                serverProblems={null}
                error={null}
                busy={false}
                onConfirm={() => {}}
                onGoToField={() => {}}
                onClose={() => {}}
            />,
        );
        expect(html).not.toMatch(/<script/);
        expect(html).toContain('&lt;script&gt;');
        expect(html).toContain('Neue Anträge sehen die neue Version, bestehende behalten ihre');
        expect(html).toContain('Speichern und veröffentlichen');
    });

    it('shows the server problems per field in plain language and blocks publishing on local problems', () => {
        const fields: FormField[] = [{ key: 'vorname', type: 'text', label: 'Vorname' }];
        const html = wrap(
            <FormPublishDialog
                summary={summarizeChanges(null, { fields, privacyNotice: '' })}
                publishedVersion={null}
                needsSave={false}
                checks={describeProblems([{ code: 'privacy_notice_missing' }], fields)}
                serverProblems={describeProblems([{ code: 'custom_field_unknown', fieldKey: 'vorname' }], fields)}
                error={null}
                busy={false}
                onConfirm={() => {}}
                onGoToField={() => {}}
                onClose={() => {}}
            />,
        );
        expect(html).toContain('Der Aufnahmeantrag braucht einen Datenschutzhinweis-Block.');
        expect(html).toContain('Feld „Vorname“:');
        expect(html).toContain('Das verknüpfte Zusatzfeld gibt es nicht');
        expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Jetzt veröffentlichen/);
        expect(html).not.toMatch(/<button(?![^>]*type="button")[^>]*>/);
    });

    it('marks redacted answers instead of showing a value and escapes answer text', () => {
        const answers: RenderedAnswer[] = [
            { key: 'a', label: '<b>Grund</b>', type: 'text', required: false, sensitive: false, redacted: false, answered: true, value: '<i>x</i>', display: '<i>x</i>' },
            { key: 'b', label: 'Gesundheit', type: 'text', required: false, sensitive: true, redacted: true, answered: true, value: null, display: null },
        ];
        const html = wrap(<AnswerList answers={answers} />);
        expect(html).not.toMatch(/<b>Grund|<i>x/);
        expect(html).toContain('&lt;i&gt;x&lt;/i&gt;');
        expect(html).toContain('Geschützt');
    });
});
