import { describe, expect, it } from 'vitest';

import LegalTranslation from './LegalTranslation';

// Must match the `sectionCount` props in src/app/{privacy,terms,imprint}/page.tsx.
const DOCS = [
    { prefix: 'legal.privacy', sections: 11 },
    { prefix: 'legal.tos', sections: 11 },
    { prefix: 'legal.imprint', sections: 5 },
] as const;

describe('LegalTranslation', () => {
    it.each(['de', 'en'] as const)('has title, update stamp and every section in %s', (lang) => {
        for (const { prefix, sections } of DOCS) {
            const keys = [`${prefix}.title`, `${prefix}.updated`];
            for (let i = 1; i <= sections; i++) keys.push(`${prefix}.section${i}.title`, `${prefix}.section${i}.text`);
            expect(keys.filter((k) => !LegalTranslation[lang][k])).toEqual([]);
            expect(LegalTranslation[lang][`${prefix}.section${sections + 1}.title`]).toBeUndefined();
        }
    });

    it('has the same keys in German and English', () => {
        expect(Object.keys(LegalTranslation.en).sort()).toEqual(Object.keys(LegalTranslation.de).sort());
    });

    it('cites § 5 DDG, not the outdated TMG, and never calls the project private or non-commercial', () => {
        const imprint = [LegalTranslation.de, LegalTranslation.en].flatMap((l) => Object.entries(l).filter(([k]) => k.startsWith('legal.imprint')));
        const text = imprint.map(([, v]) => v).join('\n');
        expect(text).toContain('§ 5 DDG');
        expect(text).not.toMatch(/TMG|privat|non-commercial|nicht-gewerblich|private/i);
    });

    it('does not show draft wording to end users and names the stamp', () => {
        const all = Object.values(LegalTranslation.de).concat(Object.values(LegalTranslation.en)).join('\n');
        expect(all).not.toMatch(/Entwurf|draft|rechtlich prüfen/i);
        expect(LegalTranslation.de['legal.privacy.updated']).toBe('Stand: November 2026');
    });
});
