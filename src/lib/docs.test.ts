import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { docsUrl, DOCS_TOPICS } from '@/lib/docs';

afterEach(() => vi.unstubAllEnvs());

describe('docsUrl', () => {
    it('defaults to the production portal', () => {
        vi.stubEnv('NEXT_PUBLIC_DOCS_URL', '');
        expect(docsUrl('handbuch/mitglieder')).toBe('https://docs.myverein.lpj.app/de/handbuch/mitglieder');
        expect(docsUrl()).toBe('https://docs.myverein.lpj.app/de');
    });
    it('uses the configured origin and normalises slashes', () => {
        vi.stubEnv('NEXT_PUBLIC_DOCS_URL', 'https://docs.example.org/');
        expect(docsUrl('/verein-aufsetzen/')).toBe('https://docs.example.org/de/verein-aufsetzen');
    });
});

const docsContent = path.resolve(__dirname, '../../../myverein-docs/content/de');

describe.skipIf(!existsSync(docsContent))('docs topics exist in the docs repo (directory or .mdx page)', () => {
    for (const [topic, p] of Object.entries(DOCS_TOPICS)) {
        it(`${topic} -> ${p}`, () => {
            const target = path.join(docsContent, p);
            expect(existsSync(target) ? statSync(target).isDirectory() : existsSync(`${target}.mdx`)).toBe(true);
        });
    }
});
