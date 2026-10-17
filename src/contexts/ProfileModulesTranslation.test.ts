import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { expiryView } from '@/lib/credentials';
import { CUSTOM_FIELD_TYPES } from '@/lib/customFields';

import ProfileModulesTranslation from './ProfileModulesTranslation';
import { translations } from './LanguageContext';

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
const de = translations.de;

describe('ProfileModulesTranslation', () => {
    it('has identical key sets in German and English and no empty text', () => {
        expect(Object.keys(ProfileModulesTranslation.en).sort()).toEqual(Object.keys(ProfileModulesTranslation.de).sort());
        for (const [key, text] of Object.entries(ProfileModulesTranslation.de)) {
            expect(text.trim(), key).not.toBe('');
            expect(ProfileModulesTranslation.en[key]!.trim(), key).not.toBe('');
        }
    });

    it('uses the same {{placeholders}} in both languages and no single-brace ones', () => {
        for (const [key, text] of Object.entries(ProfileModulesTranslation.de)) {
            const en = ProfileModulesTranslation.en[key]!;
            expect(placeholders(en), key).toEqual(placeholders(text));
            for (const value of [text, en]) expect(/(?<!\{)\{\w+\}(?!\})/.test(value), `${key} has a single-brace placeholder`).toBe(false);
        }
    });

    it('does not shadow the keys of other translation modules', () => {
        for (const key of Object.keys(ProfileModulesTranslation.de)) expect(translations.de[key]).toBe(ProfileModulesTranslation.de[key]);
        for (const key of Object.keys(ProfileModulesTranslation.en)) expect(translations.en[key]).toBe(ProfileModulesTranslation.en[key]);
    });

    it('has every static key used by the profile module components', () => {
        const root = join(__dirname, '..');
        const files = ['components/verein/ExpiryBadge.tsx', 'components/forms/FormRenderer.tsx', 'components/verein/MemberCustomFields.tsx', 'components/verein/CustomFieldFormModal.tsx', 'components/verein/ProfileModulesDialog.tsx', 'components/verein/CustomFieldsPanel.tsx', 'components/verein/CredentialsPanel.tsx', 'components/verein/ChildrenFields.tsx', 'components/verein/ProfilTab.tsx', 'app/pageContent/Verein.tsx', 'lib/credentials.ts', 'lib/profileModules.ts', 'lib/credentialOverview.ts'];
        const used = files.flatMap((f) => [...readFileSync(join(root, f), 'utf8').matchAll(/['"]((?:forms|verein)\.[\w.]+)['"]/g)].map((m) => m[1]!));
        expect(used.length).toBeGreaterThan(15);
        for (const key of used) expect(de[key], key).toBeTruthy();
    });

    it('has a text for every expiry the helper can name, with the placeholders the helper passes', () => {
        const views = [
            expiryView({ status: 'missing', daysLeft: null, validUntil: null }),
            expiryView({ status: 'expired', daysLeft: -5, validUntil: '2026-01-01' }),
            expiryView({ status: 'expired', daysLeft: -1, validUntil: '2026-01-01' }),
            expiryView({ status: 'expiring', daysLeft: 0, validUntil: '2026-01-01' }),
            expiryView({ status: 'expiring', daysLeft: 1, validUntil: '2026-01-01' }),
            expiryView({ status: 'expiring', daysLeft: 30, validUntil: '2026-01-01' }),
            expiryView({ status: 'valid', daysLeft: 300, validUntil: '2026-01-01' }, '01.01.2026'),
            expiryView({ status: 'valid', daysLeft: null, validUntil: null }),
        ];
        for (const view of views) {
            expect(view).not.toBeNull();
            expect(de[view!.key], view!.key).toBeTruthy();
            expect(placeholders(de[view!.key]!), view!.key).toEqual(Object.keys(view!.params).sort());
        }
    });

    it('has the dynamically built keys of the module catalog', () => {
        const need = (key: string) => expect(de[key], key).toBeTruthy();
        for (const st of ['active', 'archived', 'inactive']) need(`forms.mod.state.${st}`);
        for (const k of ['none', 'choice', 'text']) {
            need(`forms.cf.levels.kind.${k}`);
            need(`forms.cf.levels.kind.${k}.hint`);
        }
        for (const st of ['expired', 'expiring', 'valid', 'missing']) need(`forms.cred.overview.status.${st}`);
        for (const v of ['list', 'credentials']) need(`verein.members.view.${v}`);
        for (const e of ['self', 'guardian', 'board']) need(`forms.cred.enteredBy.${e}`);
        for (const type of CUSTOM_FIELD_TYPES) need(`forms.editor.type.${type}`);
    });
});
