import { describe, expect, it } from 'vitest';

import { localizedTexts, storedTexts, textLang, withLang } from './profileTexts';

const item = { label: 'Staplerschein', description: 'Gabelstapler', helpText: 'Nur ankreuzen', translations: { de: { label: 'Staplerschein', helpText: 'Nur ankreuzen' }, en: { label: 'Forklift licence', description: 'Forklift', helpText: 'Tick only if you have it' } } };

describe('textLang', () => {
    it('is German for German and English for everything else', () => {
        expect(textLang('de')).toBe('de');
        expect(textLang('en')).toBe('en');
        expect(textLang('fr')).toBe('en');
    });
});

describe('localizedTexts', () => {
    it('prefers the translation of the language and falls back to the text', () => {
        expect(localizedTexts(item, 'en')).toEqual({ label: 'Forklift licence', description: 'Forklift', helpText: 'Tick only if you have it' });
        expect(localizedTexts(item, 'de')).toEqual({ label: 'Staplerschein', description: 'Gabelstapler', helpText: 'Nur ankreuzen' });
    });
    it('keeps the stored text for board-edited or manual fields (translations null) and for empty translations', () => {
        expect(localizedTexts({ label: 'Eigenes Feld', helpText: null, translations: null }, 'en')).toEqual({ label: 'Eigenes Feld', description: null, helpText: null });
        expect(localizedTexts({ label: 'X', helpText: 'h', translations: { en: { label: ' ', helpText: '' } } }, 'en')).toEqual({ label: 'X', description: null, helpText: 'h' });
        expect(localizedTexts({ label: 'X' }, 'en').label).toBe('X');
    });
});

describe('storedTexts', () => {
    it('is the German text of a translated definition (its top level may already be English)', () => {
        expect(storedTexts({ label: 'Forklift licence', helpText: 'Tick only if you have it', translations: item.translations })).toEqual({ label: 'Staplerschein', helpText: 'Nur ankreuzen' });
        expect(storedTexts({ label: 'Staplerschein', helpText: null, translations: { de: { label: 'Staplerschein', helpText: null } } })).toEqual({ label: 'Staplerschein', helpText: null });
    });
    it('is the top level text without translations', () => {
        expect(storedTexts({ label: 'Eigen', helpText: 'h', translations: null })).toEqual({ label: 'Eigen', helpText: 'h' });
        expect(storedTexts({ label: 'Eigen' })).toEqual({ label: 'Eigen', helpText: null });
    });
});

describe('withLang', () => {
    it('adds the language to a path with or without a query', () => {
        expect(withLang('/member-fields', 'en')).toBe('/member-fields?lang=en');
        expect(withLang('/member-fields?clubId=c', 'de')).toBe('/member-fields?clubId=c&lang=de');
    });
});
