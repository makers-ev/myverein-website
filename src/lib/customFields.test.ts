import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { ApiError } from './api-client';
import {
    changeLocks,
    CUSTOM_FIELD_TYPES,
    type CustomFieldDefinition,
    customFieldErrorKey,
    definitionCreateBody,
    definitionPatch,
    definitionProblems,
    deleteOutcomeOf,
    displayValue,
    editableFields,
    emptyDefinitionForm,
    formFromDefinition,
    lockViolations,
    type MemberCustomField,
    nextSortOrder,
    partitionFields,
    readOnlyFields,
    toFormField,
    valuesPatch,
    valuesToAnswers,
    widensVisibility,
} from './customFields';

const def = (extra: Partial<CustomFieldDefinition> = {}): CustomFieldDefinition => ({
    id: '1',
    key: 'trikot',
    label: 'Trikotgröße',
    type: 'select',
    options: [
        { value: 'm', label: 'M' },
        { value: 'l', label: 'L' },
    ],
    visibleTo: 'vorstand',
    editableBy: 'vorstand',
    sensitive: false,
    sortOrder: 0,
    archived: false,
    archivedAt: null,
    valueCount: 0,
    ...extra,
});

const field = (extra: Partial<MemberCustomField> = {}): MemberCustomField => {
    const { valueCount, ...rest } = def();
    void valueCount;
    return { ...rest, editable: true, value: null, updatedAt: null, ...extra };
};

describe('definition form problems', () => {
    const ok = { ...emptyDefinitionForm(), key: 'trikot', label: 'Trikot' };

    it('accepts a sound text definition and a sound choice', () => {
        expect(definitionProblems(ok, [], true)).toEqual([]);
        expect(definitionProblems({ ...ok, type: 'select', options: [{ value: 'a', label: 'A' }] }, [], true)).toEqual([]);
    });

    it('flags label, key and options', () => {
        expect(definitionProblems({ ...ok, label: '  ' }, [], true)).toContain('label');
        expect(definitionProblems({ ...ok, label: 'a\u0007' }, [], true)).toContain('label_text');
        expect(definitionProblems({ ...ok, key: 'Bad Key' }, [], true)).toContain('key_format');
        expect(definitionProblems({ ...ok, key: 'constructor' }, [], true)).toContain('key_reserved');
        expect(definitionProblems(ok, ['trikot'], true)).toContain('key_duplicate');
        expect(definitionProblems({ ...ok, type: 'select' }, [], true)).toContain('options_missing');
        expect(definitionProblems({ ...ok, type: 'multiselect', options: [{ value: 'a', label: '' }] }, [], true)).toContain('option_label');
        expect(definitionProblems({ ...ok, type: 'select', options: [{ value: 'a', label: 'A' }, { value: 'a', label: 'B' }] }, [], true)).toContain('option_duplicate');
    });

    it('does not check the immutable key when editing', () => {
        expect(definitionProblems({ ...ok, key: 'Whatever' }, ['trikot'], false)).toEqual([]);
    });

    it('puts new fields behind the existing ones', () => {
        expect(nextSortOrder([])).toBe(0);
        expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 30 }])).toBe(40);
        expect(nextSortOrder([{ sortOrder: 100_000 }])).toBe(100_000);
    });
});

describe('locked changes', () => {
    it('locks the type once values exist and keeps sensitive fields with values sensitive', () => {
        expect(changeLocks({ sensitive: false, valueCount: 0 }, false)).toEqual({ typeLocked: false, sensitiveLocked: false, sensitiveNeedsPermission: false, wideningNeedsPermission: false });
        expect(changeLocks({ sensitive: false, valueCount: 3 }, true)).toMatchObject({ typeLocked: true, sensitiveLocked: false, wideningNeedsPermission: false });
        expect(changeLocks({ sensitive: true, valueCount: 3 }, true)).toMatchObject({ typeLocked: true, sensitiveLocked: true });
    });

    it('needs members:read_sensitive for protected or valued fields', () => {
        expect(changeLocks({ sensitive: true, valueCount: 0 }, false)).toMatchObject({ sensitiveNeedsPermission: true, wideningNeedsPermission: true });
        expect(changeLocks({ sensitive: true, valueCount: 0 }, true)).toMatchObject({ sensitiveNeedsPermission: false, wideningNeedsPermission: false });
        expect(changeLocks({ sensitive: false, valueCount: 2 }, false).wideningNeedsPermission).toBe(true);
        expect(changeLocks({ sensitive: false }, false).wideningNeedsPermission).toBe(false);
    });

    it('knows what widens the audience', () => {
        expect(widensVisibility('vorstand', 'funktionstraeger')).toBe(true);
        expect(widensVisibility('vorstand', 'mitglied')).toBe(true);
        expect(widensVisibility('mitglied', 'vorstand')).toBe(false);
        expect(widensVisibility('mitglied', 'mitglied')).toBe(false);
    });

    it('lists the violations of an edit in order', () => {
        const valued = def({ valueCount: 2, sensitive: true });
        const f = { ...formFromDefinition(valued), type: 'text' as const, sensitive: false, visibleTo: 'mitglied' as const };
        expect(lockViolations(valued, f, true)).toEqual(['type', 'sensitive']);
        expect(lockViolations(valued, f, false)).toEqual(['type', 'sensitive', 'widening']);
        const plainSensitive = def({ valueCount: 0, sensitive: true });
        expect(lockViolations(plainSensitive, { ...formFromDefinition(plainSensitive), sensitive: false }, false)).toEqual(['sensitive_permission']);
        expect(lockViolations(plainSensitive, { ...formFromDefinition(plainSensitive), sensitive: false }, true)).toEqual([]);
        expect(lockViolations(def(), { ...formFromDefinition(def()), visibleTo: 'mitglied' }, false)).toEqual([]);
    });
});

describe('definition bodies', () => {
    it('sends only what changed', () => {
        const stored = def();
        expect(definitionPatch(stored, formFromDefinition(stored))).toEqual({});
        const form = { ...formFromDefinition(stored), label: ' Neu ', visibleTo: 'mitglied' as const, options: [...stored.options!, { value: 'xl', label: 'XL' }] };
        expect(definitionPatch(stored, form)).toEqual({ label: 'Neu', visibleTo: 'mitglied', options: [...stored.options!, { value: 'xl', label: 'XL' }] });
        expect(definitionPatch(stored, { ...formFromDefinition(stored), sensitive: true, editableBy: 'self' })).toEqual({ sensitive: true, editableBy: 'self' });
    });

    it('sends null options when a choice becomes plain text and none for plain fields', () => {
        const stored = def();
        expect(definitionPatch(stored, { ...formFromDefinition(stored), type: 'text', options: [] })).toEqual({ type: 'text', options: null });
        const plain = def({ type: 'text', options: null });
        expect(definitionPatch(plain, formFromDefinition(plain))).toEqual({});
    });

    it('builds the create body with options only for choices', () => {
        expect(definitionCreateBody({ ...emptyDefinitionForm(), key: ' trikot ', label: ' Trikot ' }, 20)).toEqual({ key: 'trikot', label: 'Trikot', type: 'text', visibleTo: 'vorstand', editableBy: 'vorstand', sensitive: false, sortOrder: 20 });
        const body = definitionCreateBody({ ...emptyDefinitionForm(), key: 'groesse', label: 'G', type: 'select', options: [{ value: 'm', label: ' M ' }] }, 0);
        expect(body.options).toEqual([{ value: 'm', label: 'M' }]);
    });
});

describe('errors', () => {
    const err = (status: number, details?: unknown, message = 'm') => new ApiError(status, 'X', message, details);

    it('explains the locked changes and conflicts in plain language', () => {
        expect(customFieldErrorKey(err(409, { code: 'custom_field_has_values' }))).toBe('forms.cf.err.hasValues');
        expect(customFieldErrorKey(err(409, { code: 'option_in_use' }))).toBe('forms.cf.err.optionInUse');
        expect(customFieldErrorKey(err(409, { code: 'sensitive_locked' }))).toBe('forms.cf.err.sensitiveLocked');
        expect(customFieldErrorKey(err(409, { code: 'custom_field_exists' }))).toBe('forms.cf.err.exists');
        expect(customFieldErrorKey(err(409, { code: 'custom_field_limit' }))).toBe('forms.cf.err.limit');
        expect(customFieldErrorKey(err(409, { code: 'custom_field_archived' }))).toBe('forms.cf.err.archived');
    });

    it('distinguishes the missing permissions', () => {
        expect(customFieldErrorKey(err(403, undefined, 'Missing members:read_sensitive permission to lower the protection'))).toBe('forms.cf.err.needsSensitive');
        expect(customFieldErrorKey(err(403, undefined, 'Missing forms:write permission'))).toBe('forms.cf.err.needsForms');
        expect(customFieldErrorKey(err(403, undefined, 'Missing permission to change one of these custom fields'))).toBe('forms.cf.err.cannotEdit');
        expect(customFieldErrorKey(err(403, undefined, 'One of these custom fields can only be changed by the board'))).toBe('forms.cf.err.cannotEdit');
        expect(customFieldErrorKey(err(403))).toBe('forms.cf.err.forbidden');
    });

    it('falls back to validation, not-found and the shared member texts', () => {
        expect(customFieldErrorKey(err(422, { fields: { trikot: 'not_an_option' } }))).toBe('forms.err.fieldsInvalid');
        expect(customFieldErrorKey(err(422, { issues: [] }))).toBe('forms.cf.err.invalid');
        expect(customFieldErrorKey(err(404))).toBe('forms.cf.err.notFound');
        expect(customFieldErrorKey(err(429))).toBe('verein.err.rateLimit');
        expect(customFieldErrorKey(new Error('offline'))).toBe('verein.err.network');
    });

    it('reads the outcome of a delete; unknown means archived', () => {
        expect(deleteOutcomeOf({ data: { id: '1', outcome: 'deleted' } })).toBe('deleted');
        expect(deleteOutcomeOf({ data: { id: '1', outcome: 'archived' } })).toBe('archived');
        expect(deleteOutcomeOf(null)).toBe('archived');
        expect(deleteOutcomeOf({ data: {} })).toBe('archived');
    });
});

describe('values of a member', () => {
    const fields: MemberCustomField[] = [
        field({ key: 'trikot', value: 'm' }),
        field({ key: 'notiz_text', type: 'text', options: null, label: 'Notiz', value: 'Hallo', editable: false, editableBy: 'vorstand' }),
        field({ key: 'haken', type: 'checkbox', options: null, label: 'Haken', value: true }),
        field({ key: 'leer', type: 'text', options: null, label: 'Leer', value: null }),
    ];

    it('splits editable and read-only fields', () => {
        expect(editableFields(fields).map((f) => f.key)).toEqual(['trikot', 'haken', 'leer']);
        expect(readOnlyFields(fields).map((f) => f.key)).toEqual(['notiz_text']);
        expect(editableFields([field({ editable: true, archived: true })])).toEqual([]);
    });

    it('shows everything read-only in a read-only view, whatever the server says about editing', () => {
        expect(partitionFields(fields, true)).toEqual({ editable: [], readOnly: fields });
        const normal = partitionFields(fields, false);
        expect(normal.editable.map((f) => f.key)).toEqual(['trikot', 'haken', 'leer']);
        expect(normal.readOnly.map((f) => f.key)).toEqual(['notiz_text']);
    });

    it('treats board fields as read-only in the own profile even if the server flags them editable', () => {
        const own = partitionFields(fields, false, true);
        expect(own.editable.map((f) => f.key)).toEqual([]);
        const mixed: MemberCustomField[] = [field({ key: 'a_self', editableBy: 'self', editable: true }), field({ key: 'b_board', editableBy: 'vorstand', editable: true }), field({ key: 'c_self_locked', editableBy: 'self', editable: false })];
        const part = partitionFields(mixed, false, true);
        expect(part.editable.map((f) => f.key)).toEqual(['a_self']);
        expect(part.readOnly.map((f) => f.key)).toEqual(['b_board', 'c_self_locked']);
        // The board dialog (not own) edits everything the server flags editable.
        expect(partitionFields(mixed, false, false).editable.map((f) => f.key)).toEqual(['a_self', 'b_board']);
    });

    it('never puts a board field into the own-values request', () => {
        const mixed: MemberCustomField[] = [field({ key: 'a_self', type: 'text', options: null, editableBy: 'self', editable: true }), field({ key: 'b_board', type: 'text', options: null, editableBy: 'vorstand', editable: true })];
        const saved = {};
        expect(valuesPatch(mixed, saved, { a_self: 'x', b_board: 'y' }, true)).toEqual({ a_self: 'x' });
        expect(valuesPatch(mixed, saved, { b_board: 'y' }, true)).toBeNull();
        expect(valuesPatch(mixed, saved, { a_self: 'x', b_board: 'y' }, false)).toEqual({ a_self: 'x', b_board: 'y' });
    });

    it('builds the answers and form fields for the shared renderer', () => {
        expect(valuesToAnswers(fields)).toEqual({ trikot: 'm', notiz_text: 'Hallo', haken: true });
        expect(toFormField(fields[0]!)).toEqual({ key: 'trikot', type: 'select', label: 'Trikotgröße', options: [{ value: 'm', label: 'M' }, { value: 'l', label: 'L' }] });
        expect(toFormField(fields[1]!)).toEqual({ key: 'notiz_text', type: 'text', label: 'Notiz' });
    });

    it('sends only changed editable values; cleared values are null; read-only values never', () => {
        const saved = valuesToAnswers(fields);
        expect(valuesPatch(fields, saved, saved)).toBeNull();
        expect(valuesPatch(fields, saved, { ...saved, trikot: 'l' })).toEqual({ trikot: 'l' });
        expect(valuesPatch(fields, saved, { ...saved, haken: false })).toEqual({ haken: null });
        expect(valuesPatch(fields, saved, { ...saved, leer: '  ' })).toBeNull();
        expect(valuesPatch(fields, saved, { ...saved, leer: 'x', notiz_text: 'manipuliert' })).toEqual({ leer: 'x' });
        const { trikot, ...withoutTrikot } = saved;
        void trikot;
        expect(valuesPatch(fields, saved, withoutTrikot)).toEqual({ trikot: null });
    });

    it('renders stored values with option labels, yes/no and the date helper', () => {
        const texts = { yes: 'ja', no: 'nein', formatDate: (v: string) => `<${v}>` };
        expect(displayValue(fields[0]!, texts)).toBe('M');
        expect(displayValue({ ...fields[0]!, type: 'multiselect', value: ['m', 'l', 'zzz'] }, texts)).toBe('M, L, zzz');
        expect(displayValue(fields[2]!, texts)).toBe('ja');
        expect(displayValue({ ...fields[2]!, value: false }, texts)).toBe('nein');
        expect(displayValue({ ...fields[2]!, value: null }, texts)).toBeNull();
        expect(displayValue({ ...fields[0]!, type: 'date', value: '2026-05-01' }, texts)).toBe('<2026-05-01>');
        expect(displayValue({ ...fields[0]!, type: 'number', value: 3 }, texts)).toBe('3');
        expect(displayValue(fields[3]!, texts)).toBeNull();
        expect(displayValue({ ...fields[3]!, value: '' }, texts)).toBeNull();
    });
});

describe('undisclosed value count (sensitive field without members:read_sensitive)', () => {
    it('assumes values exist: the type and protection stay locked', () => {
        const locks = changeLocks({ sensitive: true, valueCount: null }, false);
        expect(locks).toMatchObject({ typeLocked: true, sensitiveLocked: true, sensitiveNeedsPermission: false, wideningNeedsPermission: true });
        expect(changeLocks({ sensitive: false, valueCount: null }, false).typeLocked).toBe(true);
        expect(changeLocks({ sensitive: false }, false).typeLocked).toBe(false);
    });
});

describe('credential fields and help texts', () => {
    const base = { ...emptyDefinitionForm(), key: 'juleica', label: 'JuLeiCa', type: 'credential' as const };

    it('offers the credential type and needs no levels', () => {
        expect(CUSTOM_FIELD_TYPES).toContain('credential');
        expect(definitionProblems(base, [], true)).toEqual([]);
        const choice = { ...base, levelKind: 'choice' as const };
        expect(definitionProblems({ ...choice, options: [{ value: 'a', label: 'A' }] }, [], true)).toEqual([]);
        expect(definitionProblems({ ...choice, options: [{ value: 'a', label: '' }] }, [], true)).toEqual(['option_label']);
        expect(definitionProblems(choice, [], true)).toEqual(['options_missing']);
    });

    it('checks the free-text level limit (1 to 80)', () => {
        const text = { ...base, levelKind: 'text' as const };
        for (const ok of ['1', '60', '80']) expect(definitionProblems({ ...text, levelMax: ok }, [], true), ok).toEqual([]);
        for (const bad of ['', '0', '81', 'x', '1.5']) expect(definitionProblems({ ...text, levelMax: bad }, [], true), bad).toEqual(['level_limit']);
    });

    it('limits the help text', () => {
        expect(definitionProblems({ ...base, helpText: 'x'.repeat(500) }, [], true)).toEqual([]);
        expect(definitionProblems({ ...base, helpText: 'x'.repeat(501) }, [], true)).toEqual(['help_text']);
        expect(definitionProblems({ ...base, helpText: 'a\u202eb' }, [], true)).toEqual(['help_text']);
    });

    it('creates with levels as options and the trimmed help text only when given', () => {
        expect(definitionCreateBody({ ...base, levelKind: 'choice', options: [{ value: 'c', label: 'C ' }], helpText: ' Nur wenn vorhanden ' }, 10)).toMatchObject({ type: 'credential', options: [{ value: 'c', label: 'C' }], helpText: 'Nur wenn vorhanden' });
        const plain = definitionCreateBody(base, 10);
        expect(plain).not.toHaveProperty('options');
        expect(plain).not.toHaveProperty('helpText');
        expect(plain).not.toHaveProperty('validation');
        const free = definitionCreateBody({ ...base, levelKind: 'text', levelMax: ' 60 ' }, 10);
        expect(free).toMatchObject({ validation: { maxLength: 60 } });
        expect(free).not.toHaveProperty('options');
    });

    it('patches the help text (null clears it) and the levels', () => {
        const stored = def({ type: 'credential', options: null, helpText: 'Alt' });
        expect(definitionPatch(stored, formFromDefinition(stored))).toEqual({});
        expect(definitionPatch(stored, { ...formFromDefinition(stored), helpText: '' })).toEqual({ helpText: null });
        expect(definitionPatch(stored, { ...formFromDefinition(stored), helpText: 'Neu' })).toEqual({ helpText: 'Neu' });
        expect(definitionPatch(stored, { ...formFromDefinition(stored), levelKind: 'choice', options: [{ value: 'a', label: 'A' }] })).toMatchObject({ options: [{ value: 'a', label: 'A' }] });
        // a free-text level (limit instead of options) is not touched
        const freeText = def({ type: 'credential', options: null, validation: { maxLength: 60 } });
        expect(formFromDefinition(freeText)).toMatchObject({ levelKind: 'text', levelMax: '60' });
        expect(definitionPatch(freeText, formFromDefinition(freeText))).toEqual({});
        expect(definitionPatch(freeText, { ...formFromDefinition(freeText), levelMax: '40' })).toEqual({ validation: { maxLength: 40 } });
        // switching to levels clears the limit, switching to none clears the levels
        expect(definitionPatch(freeText, { ...formFromDefinition(freeText), levelKind: 'choice', options: [{ value: 'a', label: 'A' }] })).toEqual({ validation: null, options: [{ value: 'a', label: 'A' }] });
        const levels = def({ type: 'credential', options: [{ value: 'a', label: 'A' }] });
        expect(formFromDefinition(levels).levelKind).toBe('choice');
        expect(definitionPatch(levels, { ...formFromDefinition(levels), levelKind: 'none' })).toEqual({ options: null });
    });

    it('gives the renderer help text, limits and levels', () => {
        const f = field({ type: 'credential', options: [{ value: 'a', label: 'A' }], helpText: 'Hilfe', validation: { maxLength: 60 } });
        expect(toFormField(f)).toMatchObject({ type: 'credential', helpText: 'Hilfe', options: [{ value: 'a', label: 'A' }], validation: { maxLength: 60 } });
        expect(toFormField(field({ type: 'text', options: null }))).not.toHaveProperty('helpText');
    });

    it('shows a stored credential as one line and does not resend an unchanged one whatever the key order', () => {
        const value = { valid: true, level: 'a', validUntil: '2027-01-31' };
        const f = field({ key: 'juleica', type: 'credential', options: [{ value: 'a', label: 'A' }], value });
        const text = displayValue(f, { yes: 'Ja', no: 'Nein', formatDate: (v) => `d:${v}` });
        expect(text).toBe('Ja, A, d:2027-01-31');
        const own = { ...f, editableBy: 'self' as const, editable: true };
        const saved = valuesToAnswers([own]);
        expect(valuesPatch([own], saved, { juleica: { validUntil: '2027-01-31', valid: true, level: 'a' } }, true)).toBeNull();
        expect(valuesPatch([own], {}, { juleica: { valid: true } }, true)).toEqual({ juleica: { valid: true } });
        expect(valuesPatch([own], { juleica: { valid: true } }, {}, true)).toEqual({ juleica: null });
    });

    it('maps the module and credential codes', () => {
        const err = (code: string) => new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { code });
        expect(customFieldErrorKey(err('module_never_mandatory'))).toBe('forms.cf.err.neverMandatory');
        expect(customFieldErrorKey(err('credential_not_supported'))).toBe('forms.cf.err.credentialNotSupported');
        expect(customFieldErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'custom_field_limit' }))).toBe('forms.cf.err.limit');
    });
});

describe('translated module definitions in the editor', () => {
    // Fetched with ?lang=en: the top level is English, the stored (German) text is translations.de.
    const translated = def({
        type: 'credential',
        options: null,
        key: 'mod_q_juleica',
        label: 'Youth leader card',
        helpText: 'Tick only if you have it.',
        translations: { de: { label: 'JuLeiCa', helpText: 'Nur ankreuzen, wenn vorhanden.' }, en: { label: 'Youth leader card', helpText: 'Tick only if you have it.' } },
    });

    it('shows and compares the stored text, never the English one', () => {
        const form = formFromDefinition(translated);
        expect(form).toMatchObject({ label: 'JuLeiCa', helpText: 'Nur ankreuzen, wenn vorhanden.' });
        expect(definitionPatch(translated, form)).toEqual({});
        expect(definitionPatch(translated, { ...form, label: 'Jugendleiter-Card' })).toEqual({ label: 'Jugendleiter-Card' });
    });

    it('takes the top-level text of a board-edited or manual definition (translations null)', () => {
        const own = def({ label: 'Eigenes Feld', helpText: 'Hilfe', translations: null });
        expect(formFromDefinition(own)).toMatchObject({ label: 'Eigenes Feld', helpText: 'Hilfe' });
        expect(definitionPatch(own, formFromDefinition(own))).toEqual({});
    });
});
