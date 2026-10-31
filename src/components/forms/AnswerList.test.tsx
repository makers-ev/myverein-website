import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LanguageProvider } from '@/contexts/LanguageContext';
import type { RenderedAnswer } from '@/lib/applicationReview';

import AnswerList from './AnswerList';

const answer = (over: Partial<RenderedAnswer>): RenderedAnswer => ({ key: 'k', label: 'L', type: 'text', required: false, sensitive: false, redacted: false, answered: true, value: null, display: null, ...over });

describe('AnswerList', () => {
    it('renders applicant-controlled labels and values as plain text', () => {
        const html = renderToStaticMarkup(
            <LanguageProvider initialLanguage="de">
                <AnswerList
                    answers={[
                        answer({ key: 'a', label: '<script>alert(1)</script>', display: '"><img src=x onerror=alert(1)>' }),
                        answer({ key: 'b', label: '"><img src=x onerror=alert(1)>', type: 'multiselect', display: ['<script>alert(2)</script>'] }),
                    ]}
                />
            </LanguageProvider>,
        );
        expect(html).not.toMatch(/<script/);
        expect(html).not.toMatch(/<img/);
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).toContain('&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
    });
});
