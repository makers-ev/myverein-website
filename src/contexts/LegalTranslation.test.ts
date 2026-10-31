import { describe, expect, it } from 'vitest';

import LegalTranslation from './LegalTranslation';

// Must match the `sectionCount` props in src/app/{privacy,terms,imprint}/page.tsx.
const DOCS = [
    { prefix: 'legal.privacy', sections: 11 },
    { prefix: 'legal.tos', sections: 11 },
    { prefix: 'legal.imprint', sections: 4 },
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

    it('names the natural person as operator and cites § 5 DDG, not the outdated TMG', () => {
        for (const lang of ['de', 'en'] as const) {
            const imprint = Object.entries(LegalTranslation[lang]).filter(([k]) => k.startsWith('legal.imprint')).map(([, v]) => v).join('\n');
            expect(imprint).toContain('Luca-Pascal Junge');
            expect(imprint).toContain('Siedlung 15');
            expect(imprint).not.toMatch(/\[[^\]]*\]/);
        }
        expect(LegalTranslation.de['legal.imprint.section1.title']).toContain('§ 5 DDG');
        expect(LegalTranslation.de['legal.imprint.section3.title']).toContain('§ 18 Abs. 2 MStV');
    });

    it('never names a company as provider and never calls the project private or non-commercial', () => {
        const all = [...Object.values(LegalTranslation.de), ...Object.values(LegalTranslation.en)].join('\n');
        expect(all).not.toMatch(/LPJ\s*IT[\s-]*Solutions/i);
        expect(all).not.toMatch(/TMG|nicht[- ]kommerziell|nicht-gewerblich|privates Projekt|private project|non-commercial|Rechtsform|USt-?IdNr|Handelsregister/i);
    });

    it('mentions the test phase and a possible transfer to a company', () => {
        expect(LegalTranslation.de['legal.tos.section4.text']).toMatch(/Testphase|Test- bzw\. Pilotphase/);
        expect(LegalTranslation.de['legal.tos.section10.text']).toMatch(/Unternehmen übertragen/);
    });

    it('does not show draft wording to end users and names the stamp', () => {
        const all = Object.values(LegalTranslation.de).concat(Object.values(LegalTranslation.en)).join('\n');
        expect(all).not.toMatch(/Entwurf|draft|rechtlich prüfen/i);
        expect(LegalTranslation.de['legal.privacy.updated']).toBe('Stand: November 2026');
    });

    it('names the real providers and leaves no provider, third-country or venue placeholders', () => {
        for (const lang of ['de', 'en'] as const) {
            const privacy = LegalTranslation[lang]['legal.privacy.section5.text'];
            expect(privacy).toContain('STRATO AG');
            expect(privacy).toContain('Expo');
            expect(privacy).toMatch(/SMTP/);
            expect(privacy).not.toMatch(/Resend/i);
            expect(LegalTranslation[lang]['legal.tos.section11.text']).toContain('Gelnhausen');
        }
        const all = [...Object.values(LegalTranslation.de), ...Object.values(LegalTranslation.en)].join('\n');
        expect((all.match(/\[[^\]]*\]/g) ?? []).sort()).toEqual(['[Dauer der Server-Protokolle]', '[duration of server logs]'].sort());
        expect(LegalTranslation.de['legal.privacy.section8.text']).toContain('Hessische Beauftragte');
        expect(LegalTranslation.de['legal.privacy.section6.text']).toContain('Data Privacy Framework');
        expect(LegalTranslation.de['legal.privacy.section5.text']).toContain('vServer');
        expect(all).not.toMatch(/Resend|keine Personendaten, nur/);
    });
});
