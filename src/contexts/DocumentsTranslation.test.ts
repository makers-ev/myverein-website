import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import DocumentsTranslation from './DocumentsTranslation';

const de = DocumentsTranslation.de;
const en = DocumentsTranslation.en;
const placeholders = (v: string) => (v.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');

const root = join(__dirname, '..');
const sources = [
    ...readdirSync(join(root, 'components/documents')).filter((f) => f.endsWith('.tsx')).map((f) => join(root, 'components/documents', f)),
    join(root, 'lib/documents.ts'),
    join(root, 'app/pageContent/Dokumente.tsx'),
];

describe('DocumentsTranslation', () => {
    it('has the same keys in German and English', () => {
        expect(Object.keys(en).filter((k) => !(k in de))).toEqual([]);
        expect(Object.keys(de).filter((k) => !(k in en))).toEqual([]);
    });

    it('uses the same placeholders in both languages', () => {
        for (const key of Object.keys(de)) expect(placeholders(en[key] ?? ''), key).toBe(placeholders(de[key]!));
    });

    it('defines every static docs.* key the components use', () => {
        const missing = new Set<string>();
        for (const file of sources) {
            let text: string;
            try {
                text = readFileSync(file, 'utf8');
            } catch {
                continue;
            }
            for (const m of text.matchAll(/['"`](docs\.[A-Za-z0-9_.]+)['"`]/g)) if (!(m[1]! in de)) missing.add(`${m[1]} (${file.split('/').pop()})`);
        }
        expect([...missing]).toEqual([]);
    });
});
