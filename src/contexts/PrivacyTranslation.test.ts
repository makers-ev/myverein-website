import { describe, expect, it } from 'vitest';

import PrivacyTranslation from './PrivacyTranslation';

const de = PrivacyTranslation.de ?? {};
const en = PrivacyTranslation.en ?? {};
const placeholders = (v: string) => (v.match(/\{\{\w+\}\}/g) ?? []).sort().join(',');

describe('PrivacyTranslation', () => {
    it('has the same keys in German and English', () => {
        expect(Object.keys(en).filter((k) => !(k in de))).toEqual([]);
        expect(Object.keys(de).filter((k) => !(k in en))).toEqual([]);
    });

    it('uses the same placeholders in both languages', () => {
        for (const key of Object.keys(de)) expect(placeholders(en[key] ?? ''), key).toBe(placeholders(de[key]!));
    });

    it('never calls a consent a duty (Koppelungsverbot): no "Pflicht"/"mandatory" in the consent, join and own-privacy texts', () => {
        const consentKeys = Object.keys(de).filter((k) => /^privacy\.(member|voluntary|proof|join|own|state|settings\.ageHint)/.test(k));
        expect(consentKeys.length).toBeGreaterThan(10);
        for (const key of consentKeys) {
            expect(de[key], key).not.toMatch(/pflicht|verpflichtend|zwingend/i);
            expect(en[key], key).not.toMatch(/mandatory|obligatory|compulsory/i);
        }
    });

    it('tells the applicant that acknowledging the privacy notice is no consent', () => {
        expect(de['privacy.join.notAConsent']).toMatch(/keine Einwilligung/);
        expect(en['privacy.join.notAConsent']).toMatch(/not a consent/);
    });
});
