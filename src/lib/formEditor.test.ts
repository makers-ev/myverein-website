import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ backendUrl: 'http://backend.test', authClient: {} }));

import { ApiError } from './api-client';
import {
    addOption,
    allowedOps,
    applyMappingSelection,
    availableMappingTargets,
    canMove,
    canSaveDraft,
    changeFieldType,
    cleanField,
    compatibleCustomFields,
    conditionProblem,
    conditionsLostByMove,
    dependentsOf,
    isSaveConflict,
    saveTarget,
    textProblems,
    withOptionUids,
    conditionSources,
    defaultCondition,
    describeProblems,
    editableForms,
    editorErrorKey,
    editorReducer,
    type EditorState,
    fieldsEqual,
    fieldTypesFor,
    initialEditorState,
    isDirty,
    isValidFieldKey,
    keyProblem,
    lockedKeysOf,
    mappingAccepts,
    mappingSelectValue,
    moveItem,
    newField,
    parseNumberInput,
    previewFields,
    problemMessageKey,
    problemsFromError,
    publishChecks,
    renameOption,
    repairConditions,
    setConditionOp,
    shapeProblems,
    slugify,
    summarizeChanges,
    uniqueKey,
    uniqueOptionValue,
} from './formEditor';
import type { FormField } from './formSchema';

const text = (key: string, extra: Partial<FormField> = {}): FormField => ({ key, type: 'text', label: key.toUpperCase(), ...extra });
const select = (key: string, values: string[]): FormField => ({ key, type: 'select', label: key, options: values.map((v) => ({ value: v, label: v })) });

describe('field keys', () => {
    it('accepts the server pattern and refuses everything else', () => {
        for (const ok of ['ab', 'vorname', 'a_1', 'x'.repeat(41)]) expect(isValidFieldKey(ok), ok).toBe(true);
        for (const bad of ['a', '', 'Vorname', '1abc', '_abc', 'ab-c', 'ab c', 'x'.repeat(42), 'äb', '__proto__', 'constructor', 'hasownproperty']) expect(isValidFieldKey(bad), bad).toBe(false);
    });

    it('classifies key problems and duplicates', () => {
        expect(keyProblem('ok_key', ['other'])).toBeNull();
        expect(keyProblem('Bad', [])).toBe('format');
        expect(keyProblem('constructor', [])).toBe('reserved');
        expect(keyProblem('same', ['same'])).toBe('duplicate');
    });

    it('slugifies labels with umlauts and symbols', () => {
        expect(slugify('Größe des Trikots?')).toBe('groesse_des_trikots');
        expect(slugify('  Café – Süß ')).toBe('cafe_suess');
        expect(slugify('!!!')).toBe('');
    });

    it('derives unique, valid keys', () => {
        expect(uniqueKey('Vorname', [])).toBe('vorname');
        expect(uniqueKey('Vorname', ['vorname'])).toBe('vorname_2');
        expect(uniqueKey('Vorname', ['vorname', 'vorname_2'])).toBe('vorname_3');
        expect(uniqueKey('123 Zahl', [])).toBe('f_123_zahl');
        expect(uniqueKey('', [])).toBe('feld');
        expect(uniqueKey('x', [])).toMatch(/^[a-z][a-z0-9_]{1,40}$/);
        expect(uniqueKey('constructor', [])).not.toBe('constructor');
        expect(uniqueKey('a'.repeat(80), [])).toHaveLength(36);
        expect(isValidFieldKey(uniqueKey('a'.repeat(80), ['a'.repeat(36)]))).toBe(true);
    });

    it('derives unique option values without markup characters', () => {
        expect(uniqueOptionValue('Rot', [])).toBe('rot');
        expect(uniqueOptionValue('Rot', ['rot'])).toBe('rot_2');
        expect(uniqueOptionValue('<b>', [])).toBe('b');
        expect(uniqueOptionValue('', [])).toBe('option');
    });
});

describe('options', () => {
    it('lets the value follow the label until it is locked or edited', () => {
        let options = addOption([]);
        expect(options).toHaveLength(1);
        options = renameOption(options, 0, 'Rot');
        expect(options[0]).toMatchObject({ value: 'rot', label: 'Rot' });
        options = renameOption(options, 0, 'Dunkelrot');
        expect(options[0]!.value).toBe('dunkelrot');
        const locked = renameOption(options, 0, 'Anders', new Set(['dunkelrot']));
        expect(locked[0]).toMatchObject({ value: 'dunkelrot', label: 'Anders' });
        const custom = renameOption([{ value: 'xl', label: 'Extra groß' }], 0, 'Extra Extra groß');
        expect(custom[0]!.value).toBe('xl');
    });

    it('keeps values unique when two options get the same label', () => {
        let options = addOption(addOption([]));
        options = renameOption(options, 0, 'Rot');
        options = renameOption(options, 1, 'Rot');
        expect(new Set(options.map((o) => o.value)).size).toBe(2);
    });
});

describe('reordering', () => {
    it('moves one place and ignores impossible moves', () => {
        expect(moveItem(['a', 'b', 'c'], 1, 'up')).toEqual(['b', 'a', 'c']);
        expect(moveItem(['a', 'b', 'c'], 1, 'down')).toEqual(['a', 'c', 'b']);
        expect(moveItem(['a', 'b', 'c'], 0, 'up')).toEqual(['a', 'b', 'c']);
        expect(moveItem(['a', 'b', 'c'], 2, 'down')).toEqual(['a', 'b', 'c']);
        expect(moveItem(['a'], 5, 'up')).toEqual(['a']);
        const input = ['a', 'b'];
        moveItem(input, 0, 'down');
        expect(input).toEqual(['a', 'b']);
    });

    it('knows which buttons are possible', () => {
        expect(canMove(0, 3, 'up')).toBe(false);
        expect(canMove(0, 3, 'down')).toBe(true);
        expect(canMove(2, 3, 'down')).toBe(false);
        expect(canMove(2, 3, 'up')).toBe(true);
        expect(canMove(0, 1, 'down')).toBe(false);
    });
});

describe('visibleIf constraints', () => {
    const base: FormField[] = [select('art', ['a', 'b']), { key: 'agree', type: 'checkbox', label: 'Agree' }, { key: 'info1', type: 'info', label: 'i' }, { key: 'datum', type: 'date', label: 'd' }, text('frei')];

    it('offers only earlier fields of a usable type as sources', () => {
        expect(conditionSources(base, 0)).toEqual([]);
        expect(conditionSources(base, 2).map((f) => f.key)).toEqual(['art', 'agree']);
        expect(conditionSources(base, 4).map((f) => f.key)).toEqual(['art', 'agree']);
        expect(conditionSources(base, 99).map((f) => f.key)).toEqual(['art', 'agree', 'frei']);
    });

    it('limits operators to the source type', () => {
        expect(allowedOps('checkbox')).toEqual(['checked']);
        expect(allowedOps('consent')).toEqual(['checked']);
        expect(allowedOps('multiselect')).toEqual(['in']);
        expect(allowedOps('select')).toEqual(['eq', 'neq', 'in']);
        expect(allowedOps('text')).toEqual(['eq', 'neq']);
    });

    it('builds default conditions and reshapes values when the operator changes', () => {
        expect(defaultCondition(base[0]!)).toEqual({ fieldKey: 'art', op: 'eq', value: 'a' });
        expect(defaultCondition(base[1]!)).toEqual({ fieldKey: 'agree', op: 'checked' });
        expect(defaultCondition({ key: 'm', type: 'multiselect', label: 'm', options: [{ value: 'x', label: 'x' }] })).toEqual({ fieldKey: 'm', op: 'in', value: ['x'] });
        expect(defaultCondition(text('frei'))).toEqual({ fieldKey: 'frei', op: 'eq', value: '' });
        expect(setConditionOp({ fieldKey: 'art', op: 'eq', value: 'a' }, 'in')).toEqual({ fieldKey: 'art', op: 'in', value: ['a'] });
        expect(setConditionOp({ fieldKey: 'art', op: 'in', value: ['a', 'b'] }, 'neq')).toEqual({ fieldKey: 'art', op: 'neq', value: 'a' });
        expect(setConditionOp({ fieldKey: 'art', op: 'eq', value: 'a' }, 'checked')).toEqual({ fieldKey: 'art', op: 'checked' });
    });

    it('detects invalid conditions like the server', () => {
        const fields: FormField[] = [select('art', ['a', 'b']), text('x', { visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } })];
        expect(conditionProblem(fields, 1)).toBeNull();
        expect(conditionProblem([fields[1]!, fields[0]!], 0)).toBe('source_missing');
        expect(conditionProblem([text('later', { visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } }), select('art', ['a'])], 0)).toBe('source_missing');
        expect(conditionProblem([text('self', { visibleIf: { fieldKey: 'self', op: 'eq', value: 'a' } })], 0)).toBe('source_missing');
        expect(conditionProblem([base[3]!, text('x', { visibleIf: { fieldKey: 'datum', op: 'eq', value: '1' } })], 1)).toBe('source_type');
        expect(conditionProblem([select('art', ['a']), text('x', { visibleIf: { fieldKey: 'art', op: 'checked' } })], 1)).toBe('op');
        expect(conditionProblem([select('art', ['a']), text('x', { visibleIf: { fieldKey: 'art', op: 'eq', value: '' } })], 1)).toBe('value_missing');
        expect(conditionProblem([select('art', ['a']), text('x', { visibleIf: { fieldKey: 'art', op: 'eq', value: 'zzz' } })], 1)).toBe('value_option');
        expect(conditionProblem([select('art', ['a']), text('x', { visibleIf: { fieldKey: 'art', op: 'in', value: 'a' } })], 1)).toBe('value_missing');
        expect(conditionProblem([select('art', ['a']), text('x', { visibleIf: { fieldKey: 'art', op: 'in', value: [] } })], 1)).toBe('value_missing');
        expect(conditionProblem([base[1]!, text('x', { visibleIf: { fieldKey: 'agree', op: 'checked', value: true } })], 1)).toBe('value_missing');
        expect(conditionProblem([base[1]!, text('x', { visibleIf: { fieldKey: 'agree', op: 'checked' } })], 1)).toBeNull();
    });

    it('drops conditions that lost their source structurally and keeps value problems', () => {
        const fields: FormField[] = [text('x', { visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } }), select('art', ['a']), text('y', { visibleIf: { fieldKey: 'art', op: 'eq', value: 'zzz' } })];
        const { fields: repaired, dropped } = repairConditions(fields);
        expect(dropped).toEqual(['x']);
        expect(repaired[0]!.visibleIf).toBeUndefined();
        expect(repaired[2]!.visibleIf).toEqual({ fieldKey: 'art', op: 'eq', value: 'zzz' });
    });
});

describe('editor reducer', () => {
    const start = (): EditorState => initialEditorState('Antrag', [select('art', ['a', 'b']), text('x', { visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } })], null);

    it('adds, updates and removes fields', () => {
        let s = editorReducer(start(), { type: 'add', field: text('neu') });
        expect(s.fields.map((f) => f.key)).toEqual(['art', 'x', 'neu']);
        s = editorReducer(s, { type: 'update', index: 2, field: { ...text('neu'), label: 'Neu' } });
        expect(s.fields[2]!.label).toBe('Neu');
        s = editorReducer(s, { type: 'remove', index: 2 });
        expect(s.fields).toHaveLength(2);
        expect(editorReducer(s, { type: 'remove', index: 9 })).toBe(s);
        expect(editorReducer(s, { type: 'update', index: 9, field: text('q') })).toBe(s);
    });

    it('follows a renamed key in conditions', () => {
        const s = editorReducer(start(), { type: 'update', index: 0, field: { ...select('kategorie', ['a', 'b']) } });
        expect(s.fields[1]!.visibleIf?.fieldKey).toBe('kategorie');
        expect(s.droppedConditions).toEqual([]);
    });

    it('drops the condition when its source is removed or moved behind it, and reports it once', () => {
        let s = editorReducer(start(), { type: 'move', index: 0, direction: 'down' });
        expect(s.fields.map((f) => f.key)).toEqual(['x', 'art']);
        expect(s.fields[0]!.visibleIf).toBeUndefined();
        expect(s.droppedConditions).toEqual(['x']);
        s = editorReducer(s, { type: 'ackDropped' });
        expect(s.droppedConditions).toEqual([]);
        const removed = editorReducer(start(), { type: 'remove', index: 0 });
        expect(removed.fields[0]!.visibleIf).toBeUndefined();
        expect(removed.droppedConditions).toEqual(['x']);
    });

    it('ignores impossible moves and caps the field count', () => {
        const s = start();
        expect(editorReducer(s, { type: 'move', index: 0, direction: 'up' })).toBe(s);
        const full = initialEditorState('F', Array.from({ length: 60 }, (_, i) => text(`f_${i}`)), null);
        expect(editorReducer(full, { type: 'add', field: text('one_more') })).toBe(full);
    });

    it('sets name, notice and resets from the server state', () => {
        let s = editorReducer(start(), { type: 'setName', name: 'Neu' });
        s = editorReducer(s, { type: 'setPrivacyNotice', privacyNotice: 'Text' });
        expect(s.name).toBe('Neu');
        expect(s.privacyNotice).toBe('Text');
        s = editorReducer(s, { type: 'reset', name: 'A', fields: [], privacyNotice: null as unknown as string });
        expect(s).toEqual({ name: 'A', fields: [], privacyNotice: '', droppedConditions: [], undo: null });
    });

    it('does not mutate its input', () => {
        const s = start();
        const snapshot = JSON.stringify(s);
        editorReducer(s, { type: 'move', index: 0, direction: 'down' });
        editorReducer(s, { type: 'remove', index: 0 });
        expect(JSON.stringify(s)).toBe(snapshot);
    });
});

describe('changing a field type', () => {
    it('removes what does not apply any more', () => {
        const field: FormField = { key: 'a_field', type: 'text', label: 'A', required: true, sensitive: true, mapsTo: 'firstName', validation: { minLength: 2, maxLength: 150, pattern: 'email' } };
        const asNumber = changeFieldType(field, 'number');
        expect(asNumber.validation).toBeUndefined();
        expect(asNumber.mapsTo).toBeUndefined();
        expect(asNumber.required).toBe(true);
        const asTextarea = changeFieldType(field, 'textarea');
        expect(asTextarea.validation).toEqual({ minLength: 2, maxLength: 150 });
        const info = changeFieldType(field, 'info');
        expect(info.required).toBeUndefined();
        expect(info.sensitive).toBeUndefined();
        expect(info.validation).toBeUndefined();
    });

    it('creates and removes options and info parts', () => {
        const sel = changeFieldType(text('a_field'), 'select');
        expect(sel.options).toEqual([]);
        expect(changeFieldType(sel, 'multiselect').options).toEqual([]);
        expect(changeFieldType(sel, 'text').options).toBeUndefined();
        const info: FormField = { key: 'hinweis', type: 'info', label: 'H', text: 'T', infoKind: 'privacy_notice' };
        const back = changeFieldType(info, 'text');
        expect(back.text).toBeUndefined();
        expect(back.infoKind).toBeUndefined();
    });

    it('caps the max length of a text when a textarea becomes a text and drops the custom field link', () => {
        const area: FormField = { key: 'langtext', type: 'textarea', label: 'L', validation: { maxLength: 3000 }, customField: 'x_field' };
        const asText = changeFieldType(area, 'text');
        expect(asText.validation?.maxLength).toBe(200);
        expect(asText.customField).toBeUndefined();
    });

    it('creates new fields with fitting defaults', () => {
        expect(newField('select', []).options).toEqual([]);
        expect(newField('info', ['hinweis']).key).toBe('hinweis_2');
        expect(newField('consent', []).key).toBe('einwilligung');
        expect(newField('text', ['feld']).key).toBe('feld_2');
    });
});

describe('cleaning the definition for the server', () => {
    it('drops empty values and keeps only what applies', () => {
        const dirty: FormField = {
            key: 'a_field',
            type: 'text',
            label: '  Name  ',
            helpText: '   ',
            required: false,
            sensitive: false,
            validation: { minLength: undefined, maxLength: 20, min: 3 },
        };
        expect(cleanField(dirty)).toEqual({ key: 'a_field', type: 'text', label: 'Name', validation: { maxLength: 20 } });
        expect(cleanField({ key: 'sel', type: 'select', label: 'S', options: [{ value: ' a ', label: ' A ' }], optionsSource: 'member_categories' })).toEqual({ key: 'sel', type: 'select', label: 'S', optionsSource: 'member_categories' });
        expect(cleanField({ key: 'hinweis', type: 'info', label: 'I', text: '  ', infoKind: 'privacy_notice', required: true })).toEqual({ key: 'hinweis', type: 'info', label: 'I', infoKind: 'privacy_notice' });
    });

    it('parses number inputs', () => {
        expect(parseNumberInput('')).toBeUndefined();
        expect(parseNumberInput(' 12 ')).toBe(12);
        expect(parseNumberInput('1,5')).toBe(1.5);
        expect(parseNumberInput('abc')).toBe('invalid');
        expect(parseNumberInput('1.5', true)).toBe('invalid');
        expect(parseNumberInput('Infinity')).toBe('invalid');
    });
});

describe('mapping allowlist and type compatibility', () => {
    it('knows which types fit which target', () => {
        expect(mappingAccepts('birthDate', 'date')).toBe(true);
        expect(mappingAccepts('birthDate', 'text')).toBe(false);
        expect(mappingAccepts('category', 'select')).toBe(true);
        expect(mappingAccepts('category', 'multiselect')).toBe(false);
        expect(mappingAccepts('photo', 'image')).toBe(true);
        expect(mappingAccepts('photo', 'file')).toBe(false);
        expect(mappingAccepts('passwordHash', 'text')).toBe(false);
        expect(mappingAccepts('__proto__', 'text')).toBe(false);
    });

    it('offers only unused targets that accept the type and never for sensitive fields', () => {
        const fields: FormField[] = [text('a_first', { mapsTo: 'firstName' }), text('b_text'), { key: 'c_date', type: 'date', label: 'D' }, text('d_sens', { sensitive: true }), { key: 'e_info', type: 'info', label: 'I' }];
        const forB = availableMappingTargets(fields, 1);
        expect(forB).not.toContain('firstName');
        expect(forB).toContain('lastName');
        expect(forB).not.toContain('birthDate');
        expect(availableMappingTargets(fields, 0)).toContain('firstName');
        expect(availableMappingTargets(fields, 2)).toEqual(['birthDate']);
        expect(availableMappingTargets(fields, 3)).toEqual([]);
        expect(availableMappingTargets(fields, 4)).toEqual([]);
        expect(availableMappingTargets(fields, 99)).toEqual([]);
    });

    it('applies a selection and clears the other kind', () => {
        const f = applyMappingSelection(text('a_field', { sensitive: true }), 'master:firstName');
        expect(f.mapsTo).toBe('firstName');
        expect(f.sensitive).toBeUndefined();
        expect(mappingSelectValue(f)).toBe('master:firstName');
        const c = applyMappingSelection(f, 'custom:trikot');
        expect(c.mapsTo).toBeUndefined();
        expect(c.customField).toBe('trikot');
        expect(mappingSelectValue(c)).toBe('custom:trikot');
        expect(mappingSelectValue(applyMappingSelection(c, ''))).toBe('');
        expect(applyMappingSelection(text('a_field'), 'master:birthDate').mapsTo).toBeUndefined();
    });

    it('switches the options to the member categories for the category mapping', () => {
        const f = applyMappingSelection(select('kat', ['a']), 'master:category');
        expect(f.mapsTo).toBe('category');
        expect(f.optionsSource).toBe('member_categories');
        expect(f.options).toBeUndefined();
        expect(shapeProblems([f])).toEqual([]);
    });

    it('finds compatible custom fields: same type, live, unused, protected for sensitive answers', () => {
        const defs = [
            { key: 'trikot', label: 'Trikot', type: 'text', sensitive: false, archived: false },
            { key: 'allergie', label: 'Allergie', type: 'text', sensitive: true, archived: false },
            { key: 'alt', label: 'Alt', type: 'text', sensitive: false, archived: true },
            { key: 'zahl', label: 'Zahl', type: 'number', sensitive: false, archived: false },
            { key: 'haken', label: 'Haken', type: 'checkbox', sensitive: false, archived: false },
        ];
        const fields: FormField[] = [text('a_field'), text('b_field', { customField: 'trikot' }), { key: 'c_consent', type: 'consent', label: 'C' }, text('d_sens', { sensitive: true })];
        expect(compatibleCustomFields(defs, fields, 0).map((d) => d.key)).toEqual(['allergie']);
        expect(compatibleCustomFields(defs, fields, 1).map((d) => d.key)).toEqual(['trikot', 'allergie']);
        expect(compatibleCustomFields(defs, fields, 2).map((d) => d.key)).toEqual(['haken']);
        expect(compatibleCustomFields(defs, fields, 3).map((d) => d.key)).toEqual(['allergie']);
        expect(compatibleCustomFields(defs, [{ key: 'i_info', type: 'info', label: 'i' }], 0)).toEqual([]);
        expect(compatibleCustomFields(defs, [{ key: 'f_file', type: 'file', label: 'i' }], 0)).toEqual([]);
    });
});

describe('local problems', () => {
    const codes = (fields: FormField[]) => shapeProblems(fields).map((p) => `${p.code}${p.fieldKey ? `@${p.fieldKey}` : ''}`);

    it('accepts a sound definition', () => {
        expect(shapeProblems([text('vorname'), select('art', ['a', 'b']), { key: 'info_x', type: 'info', label: 'Hinweis', text: 'T' }])).toEqual([]);
        expect(canSaveDraft([])).toBe(true);
    });

    it('flags keys, labels, duplicates and the field cap', () => {
        expect(codes([text('Bad')])).toContain('key_format@Bad');
        expect(codes([text('constructor')])).toContain('key_reserved@constructor');
        expect(codes([text('same'), text('same')])).toContain('key_duplicate@same');
        expect(codes([{ ...text('leer'), label: '   ' }])).toContain('label_missing@leer');
        expect(codes([{ ...text('lang'), label: 'x'.repeat(201) }])).toContain('label_missing@lang');
        expect(shapeProblems(Array.from({ length: 61 }, (_, i) => text(`f_${i}`))).some((p) => p.code === 'too_many_fields')).toBe(true);
    });

    it('flags control characters but allows markup characters (plain text everywhere)', () => {
        expect(codes([{ ...text('ctrl'), label: 'a\u0007b' }])).toContain('text_not_allowed@ctrl');
        expect(codes([{ ...text('bidi'), helpText: 'x‮y' }])).toContain('text_not_allowed@bidi');
        expect(codes([{ ...text('html'), label: '<b>fett</b>' }])).toEqual([]);
        expect(codes([{ key: 'info_a', type: 'info', label: 'I', text: 'Zeile 1\nZeile 2' }])).toEqual([]);
    });

    it('flags choices without options, empty and duplicate options', () => {
        expect(codes([{ key: 'sel', type: 'select', label: 'S', options: [] }])).toContain('options_missing@sel');
        expect(codes([{ key: 'sel', type: 'select', label: 'S', optionsSource: 'member_categories' }])).toEqual([]);
        expect(codes([{ key: 'sel', type: 'select', label: 'S', options: [{ value: 'a', label: '' }] }])).toContain('option_label_missing@sel');
        expect(codes([{ key: 'sel', type: 'select', label: 'S', options: [{ value: 'a', label: 'A' }, { value: 'a', label: 'B' }] }])).toContain('option_duplicate@sel');
        expect(codes([{ key: 'sel', type: 'select', label: 'S', options: Array.from({ length: 51 }, (_, i) => ({ value: `v${i}`, label: `V${i}` })) }])).toContain('too_many_options@sel');
    });

    it('flags impossible validation ranges', () => {
        expect(codes([text('t_len', { validation: { minLength: 5, maxLength: 2 } })])).toContain('validation_range@t_len');
        expect(codes([text('t_big', { validation: { maxLength: 201 } })])).toContain('validation_length@t_big');
        expect(codes([{ key: 'num', type: 'number', label: 'N', validation: { min: 5, max: 1 } }])).toContain('validation_range@num');
        expect(codes([{ key: 'dat', type: 'date', label: 'D', validation: { minDate: '2026-02-01', maxDate: '2026-01-01' } }])).toContain('validation_range@dat');
        expect(codes([{ key: 'ok_area', type: 'textarea', label: 'A', validation: { maxLength: 3000 } }])).toEqual([]);
    });

    it('flags conditions, mapping and custom field misuse', () => {
        expect(codes([text('x_field', { visibleIf: { fieldKey: 'nope', op: 'eq', value: 'a' } })])).toContain('condition_source_missing@x_field');
        expect(codes([text('first', { mapsTo: 'firstName' }), text('second', { mapsTo: 'firstName' })])).toContain('mapping_twice@second');
        expect(codes([{ key: 'dat', type: 'date', label: 'D', mapsTo: 'firstName' }])).toContain('mapping_type@dat');
        expect(codes([{ key: 'kat', type: 'select', label: 'K', options: [{ value: 'a', label: 'A' }], mapsTo: 'category' }])).toContain('mapping_type@kat');
        expect(codes([text('c_one', { customField: 'z' }), text('c_two', { customField: 'z' })])).toContain('custom_twice@c_two');
    });
});

describe('publish checks and problem mapping', () => {
    const notice: FormField = { key: 'datenschutz', type: 'info', label: 'DS', infoKind: 'privacy_notice' };
    const consent: FormField = { key: 'einwilligung', type: 'consent', label: 'Ok', required: true };

    it('pre-warns when a category field exists but no category is applicant-selectable', () => {
        const category: FormField = { key: 'kategorie', type: 'select', label: 'Kategorie', mapsTo: 'category', optionsSource: 'member_categories' };
        const other: FormField[] = [{ key: 'datenschutz', type: 'info', label: 'DS', infoKind: 'privacy_notice', text: 'x' }, { key: 'ok', type: 'consent', label: 'OK', required: true }];
        const codes = (cats?: number | null, fields: FormField[] = [category, ...other]) => publishChecks(fields, '', 'aufnahme', undefined, cats).map((p) => p.code);
        expect(codes(0)).toEqual(['no_selectable_category']);
        expect(publishChecks([category, ...other], '', 'aufnahme', undefined, 0)[0]).toEqual({ code: 'no_selectable_category', fieldKey: 'kategorie' });
        expect(codes(2)).toEqual([]);
        // unknown (not loaded) and forms without a category field are not warned about
        expect(codes(null)).toEqual([]);
        expect(codes(undefined)).toEqual([]);
        expect(codes(0, other)).toEqual([]);
        expect(publishChecks([category], '', 'austritt', undefined, 0).map((p) => p.code)).not.toContain('no_selectable_category');
    });

    it('requires notice text and an unconditional required consent for the application form', () => {
        expect(publishChecks([], '', 'aufnahme').map((p) => p.code)).toEqual(['privacy_notice_missing', 'required_consent_missing']);
        expect(publishChecks([notice, consent], '', 'aufnahme')).toEqual([{ code: 'privacy_notice_text_missing', fieldKey: 'datenschutz' }]);
        expect(publishChecks([notice, consent], 'Text', 'aufnahme')).toEqual([]);
        expect(publishChecks([{ ...notice, text: 'Eigener Text' }, consent], '', 'aufnahme')).toEqual([]);
        expect(publishChecks([notice, { ...consent, required: false }], 'T', 'aufnahme').map((p) => p.code)).toEqual(['required_consent_missing']);
        const select2 = select('art', ['a']);
        expect(publishChecks([select2, notice, { ...consent, visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } }], 'T', 'aufnahme').map((p) => p.code)).toEqual(['required_consent_missing']);
    });

    it('needs nothing for the exit form but refuses mappings there', () => {
        expect(publishChecks([], '', 'austritt')).toEqual([]);
        expect(publishChecks([text('x_field', { mapsTo: 'firstName' }), text('y_field', { customField: 'k' })], '', 'austritt').map((p) => p.code)).toEqual(['mapping_not_allowed', 'mapping_not_allowed']);
    });

    it('refuses upload fields in the exit form and hides their types there', () => {
        const file: FormField = { key: 'beleg', type: 'file', label: 'B' };
        expect(publishChecks([file, { key: 'foto', type: 'image', label: 'F' }], '', 'austritt').map((p) => p.code)).toEqual(['file_not_supported', 'file_not_supported']);
        expect(publishChecks([file], '', 'aufnahme').map((p) => p.code)).not.toContain('file_not_supported');
        // Event registrations are also answered by guests: no uploads there either.
        expect(publishChecks([file], '', 'veranstaltungsanmeldung').map((p) => p.code)).toEqual(['file_not_supported']);
        const all = ['text', 'file', 'image', 'info'] as const;
        expect(fieldTypesFor('austritt', all)).toEqual(['text', 'info']);
        expect(fieldTypesFor('aufnahme', all)).toEqual(['text', 'file', 'image', 'info']);
    });

    it('refuses sensitive answers with a master data mapping', () => {
        expect(publishChecks([notice, consent, text('s_field', { sensitive: true, mapsTo: 'firstName' })], 'T', 'aufnahme')).toEqual([{ code: 'sensitive_mapping_not_allowed', fieldKey: 's_field' }]);
    });

    it('maps every server code to a text and unknown ones to a generic one', () => {
        expect(problemMessageKey('privacy_notice_missing')).toBe('forms.editor.problem.privacy_notice_missing');
        expect(problemMessageKey('key_type_immutable')).toBe('forms.editor.problem.key_type_immutable');
        expect(problemMessageKey('something_new')).toBe('forms.editor.problem.other');
        expect(problemMessageKey('__proto__')).toBe('forms.editor.problem.other');
        expect(problemMessageKey('constructor')).toBe('forms.editor.problem.other');
    });

    it('names the field a problem is about', () => {
        const fields = [text('vorname', { label: ' Vorname ' }), { ...text('leer'), label: '' }];
        const described = describeProblems([{ code: 'mapping_not_allowed', fieldKey: 'vorname' }, { code: 'required_consent_missing' }, { code: 'x', fieldKey: 'leer' }, { code: 'y', fieldKey: 'gone' }], fields);
        expect(described.map((d) => d.fieldLabel)).toEqual(['Vorname', null, 'leer', 'gone']);
        expect(described[0]!.key).toBe('forms.editor.problem.mapping_not_allowed');
        expect(described[2]!.key).toBe('forms.editor.problem.other');
    });

    it('reads the problem list of a 422 publish and the issues of a 422 save', () => {
        const fields = [text('vorname'), text('nachname')];
        const publish = new ApiError(422, 'VALIDATION_ERROR', 'The form cannot be published', { problems: [{ code: 'privacy_notice_missing' }, { code: 'custom_field_unknown', fieldKey: 'nachname' }, { nope: 1 }, { code: 5 }] });
        expect(problemsFromError(publish, fields)).toEqual([{ code: 'privacy_notice_missing' }, { code: 'custom_field_unknown', fieldKey: 'nachname' }]);
        const save = new ApiError(422, 'VALIDATION_ERROR', 'Invalid field definition', { issues: [{ path: [1, 'label'], message: 'x' }, { path: [1, 'key'], message: 'y' }, { path: [], message: 'too many' }] });
        expect(problemsFromError(save, fields)).toEqual([{ code: 'invalid_definition', fieldKey: 'nachname' }, { code: 'too_many_fields' }]);
        expect(problemsFromError(new ApiError(422, 'X', 'm', { issues: [{ path: [7], message: 'x' }] }), fields)).toEqual([{ code: 'invalid_definition' }]);
        expect(problemsFromError(new ApiError(409, 'CONFLICT', 'm', { problems: [{ code: 'a' }] }), fields)).toBeNull();
        expect(problemsFromError(new ApiError(422, 'X', 'm', { problems: [] }), fields)).toBeNull();
        expect(problemsFromError(new ApiError(422, 'X', 'm'), fields)).toBeNull();
        expect(problemsFromError(new Error('x'), fields)).toBeNull();
    });

    it('maps request errors to plain-language texts', () => {
        expect(editorErrorKey(new ApiError(409, 'CONFLICT', 'm', { code: 'no_draft' }))).toBe('forms.editor.err.noDraft');
        expect(editorErrorKey(new ApiError(409, 'CONFLICT', 'm', { code: 'version_immutable' }))).toBe('forms.editor.err.versionImmutable');
        expect(editorErrorKey(new ApiError(409, 'CONFLICT', 'm', { code: 'version_limit' }))).toBe('forms.editor.err.versionLimit');
        expect(editorErrorKey(new ApiError(409, 'CONFLICT', 'm', { code: 'form_archived' }))).toBe('forms.editor.err.archived');
        expect(editorErrorKey(new ApiError(422, 'X', 'm', { problems: [{ code: 'a' }] }))).toBe('forms.editor.err.problems');
        expect(editorErrorKey(new ApiError(422, 'X', 'm', { issues: [] }))).toBe('forms.editor.err.invalid');
        expect(editorErrorKey(new ApiError(403, 'FORBIDDEN', 'm'))).toBe('forms.editor.err.forbidden');
        expect(editorErrorKey(new ApiError(404, 'NOT_FOUND', 'm'))).toBe('forms.editor.err.notFound');
        expect(editorErrorKey(new ApiError(429, 'X', 'm'))).toBe('verein.err.rateLimit');
        expect(editorErrorKey(new Error('offline'))).toBe('verein.err.network');
    });
});

describe('dirty state and change summary', () => {
    const published = { fields: [text('vorname'), text('nachname')], privacyNotice: 'Alt' };

    it('compares by content, not by property order or empty values', () => {
        const base = { name: 'Antrag', fields: published.fields, privacyNotice: 'Alt' };
        const same = initialEditorState('Antrag', [{ label: 'VORNAME', type: 'text', key: 'vorname', helpText: '', required: false }, text('nachname')], 'Alt');
        expect(isDirty(same, base)).toBe(false);
        expect(fieldsEqual(base.fields, same.fields)).toBe(true);
        expect(isDirty({ ...same, name: 'Anders' }, base)).toBe(true);
        expect(isDirty({ ...same, privacyNotice: 'Neu' }, base)).toBe(true);
        expect(isDirty({ ...same, fields: [...same.fields].reverse() }, base)).toBe(true);
        expect(isDirty({ ...same, name: ' Antrag ' }, base)).toBe(false);
    });

    it('summarises added, removed, changed and reordered fields and the notice', () => {
        const none = summarizeChanges(published, { fields: published.fields, privacyNotice: 'Alt' });
        expect(none.none).toBe(true);
        const draft = { fields: [text('nachname', { required: true }), text('ort')], privacyNotice: 'Neu' };
        const s = summarizeChanges(published, draft);
        expect(s.added.map((f) => f.key)).toEqual(['ort']);
        expect(s.removed.map((f) => f.key)).toEqual(['vorname']);
        expect(s.changed.map((f) => f.key)).toEqual(['nachname']);
        expect(s.privacyNoticeChanged).toBe(true);
        expect(s.none).toBe(false);
        const reordered = summarizeChanges(published, { fields: [...published.fields].reverse(), privacyNotice: 'Alt' });
        expect(reordered.reordered).toBe(true);
        expect(reordered.none).toBe(false);
        const first = summarizeChanges(null, { fields: published.fields, privacyNotice: '' });
        expect(first.added).toHaveLength(2);
    });

    it('locks the keys of the published version', () => {
        expect([...lockedKeysOf({ fields: published.fields })]).toEqual(['vorname', 'nachname']);
        expect(lockedKeysOf(null).size).toBe(0);
    });
});

describe('preview and lists', () => {
    it('fills the member categories into the preview', () => {
        const fields: FormField[] = [{ key: 'kat', type: 'select', label: 'K', optionsSource: 'member_categories' }];
        const [f] = previewFields(fields, [{ key: 'aktiv', name: 'Aktiv' }]);
        expect(f!.options).toEqual([{ value: 'aktiv', label: 'Aktiv' }]);
        expect(f!.optionsSource).toBeUndefined();
    });

    it('survives duplicate keys and empty labels while the board is mid-edit', () => {
        const preview = previewFields([text('same'), text('same', { label: 'zweites' }), { ...text('leer'), label: '' }], []);
        expect(preview.map((f) => f.key)).toEqual(['same', 'leer']);
        expect(preview[1]!.label).toBe('leer');
    });

    it('lists the standard forms first, aufnahme before austritt, without archived and other purposes', () => {
        const mk = (id: string, purpose: string, archivedAt: string | null = null) => ({ id, purpose, name: id, archivedAt, createdAt: '', updatedAt: '', publishedVersion: 1, draftVersion: null, versionCount: 1 });
        expect(editableForms([mk('a', 'austritt'), mk('b', 'umfrage'), mk('c', 'aufnahme'), mk('d', 'aufnahme', '2026-01-01')]).map((f) => f.id)).toEqual(['c', 'a']);
    });
});

describe('stable ids', () => {
    it('gives every field and option a unique id that survives moving and renaming, and never sends it', () => {
        const s = initialEditorState('F', [select('art', ['a', 'b']), text('x')], null);
        const uids = s.fields.map((f) => f.uid);
        expect(new Set(uids).size).toBe(2);
        expect(s.fields[0]!.options!.every((o) => o.uid)).toBe(true);
        const moved = editorReducer(s, { type: 'move', index: 0, direction: 'down' });
        expect(moved.fields.map((f) => f.uid)).toEqual([uids[1], uids[0]]);
        const renamed = editorReducer(moved, { type: 'update', index: 1, field: { ...moved.fields[1]!, key: 'kategorie' } });
        expect(renamed.fields[1]!.uid).toBe(uids[0]);
        const added = editorReducer(renamed, { type: 'add', field: text('neu') });
        expect(added.fields[2]!.uid).toBeTruthy();
        expect(new Set(added.fields.map((f) => f.uid)).size).toBe(3);
        const cleaned = cleanField(s.fields[0]!);
        expect(JSON.stringify(cleaned)).not.toContain('uid');
        expect(fieldsEqual(s.fields, [select('art', ['a', 'b']), text('x')])).toBe(true);
    });

    it('keeps the id of an option while its label changes', () => {
        const options = withOptionUids([{ value: 'rot', label: 'Rot' }]);
        const renamed = renameOption(options, 0, 'Dunkelrot');
        expect(renamed[0]!.uid).toBe(options[0]!.uid);
    });
});

describe('undo, dependents and confirmations', () => {
    const fields = (): FormField[] => [select('art', ['a']), text('x', { visibleIf: { fieldKey: 'art', op: 'eq', value: 'a' } }), text('y')];

    it('names the fields that depend on a field', () => {
        expect(dependentsOf(fields(), 'art').map((f) => f.key)).toEqual(['x']);
        expect(dependentsOf(fields(), 'y')).toEqual([]);
    });

    it('names the fields that would lose their condition by a move', () => {
        expect(conditionsLostByMove(fields(), 0, 'down').map((f) => f.key)).toEqual(['x']);
        expect(conditionsLostByMove(fields(), 1, 'up').map((f) => f.key)).toEqual(['x']);
        expect(conditionsLostByMove(fields(), 2, 'up')).toEqual([]);
        expect(conditionsLostByMove(fields(), 0, 'up')).toEqual([]);
    });

    it('restores the fields (and their conditions) after a delete or a move', () => {
        const s = initialEditorState('F', fields(), null);
        const removed = editorReducer(s, { type: 'remove', index: 0 });
        expect(removed.fields).toHaveLength(2);
        expect(removed.fields[0]!.visibleIf).toBeUndefined();
        expect(removed.undo?.kind).toBe('remove');
        const back = editorReducer(removed, { type: 'undo' });
        expect(back.fields.map((f) => f.key)).toEqual(['art', 'x', 'y']);
        expect(back.fields[1]!.visibleIf).toEqual({ fieldKey: 'art', op: 'eq', value: 'a' });
        expect(back.undo).toBeNull();
        expect(back.droppedConditions).toEqual([]);
        const moved = editorReducer(s, { type: 'move', index: 0, direction: 'down' });
        expect(moved.undo?.kind).toBe('move');
        expect(editorReducer(moved, { type: 'undo' }).fields.map((f) => f.key)).toEqual(['art', 'x', 'y']);
    });

    it('does nothing without something to undo and forgets the undo after an edit', () => {
        const s = initialEditorState('F', fields(), null);
        expect(editorReducer(s, { type: 'undo' })).toBe(s);
        const removed = editorReducer(s, { type: 'remove', index: 2 });
        expect(editorReducer(removed, { type: 'add', field: text('neu') }).undo).toBeNull();
        expect(editorReducer(removed, { type: 'update', index: 0, field: select('art', ['a', 'b']) }).undo).toBeNull();
    });
});

describe('saving by draft number and conflicts', () => {
    it('saves a loaded draft by its number and everything else into the draft route', () => {
        expect(saveTarget('f1', 'c1', 3)).toBe('/forms/f1/versions/3?clubId=c1');
        expect(saveTarget('f1', 'c1', null)).toBe('/forms/f1/draft?clubId=c1');
        expect(saveTarget('f1', 'c1', 3, true)).toBe('/forms/f1/draft?clubId=c1');
    });

    it('recognises a changed, published or discarded draft as a conflict, nothing else', () => {
        expect(isSaveConflict(new ApiError(409, 'CONFLICT', 'm', { code: 'version_immutable' }), true)).toBe(true);
        expect(isSaveConflict(new ApiError(409, 'CONFLICT', 'm', { code: 'no_draft' }), false)).toBe(true);
        expect(isSaveConflict(new ApiError(404, 'NOT_FOUND', 'm'), true)).toBe(true);
        expect(isSaveConflict(new ApiError(404, 'NOT_FOUND', 'm'), false)).toBe(false);
        expect(isSaveConflict(new ApiError(409, 'CONFLICT', 'm', { code: 'form_archived' }), true)).toBe(false);
        expect(isSaveConflict(new ApiError(422, 'X', 'm'), true)).toBe(false);
        expect(isSaveConflict(new Error('offline'), true)).toBe(false);
    });
});

describe('name and privacy notice checks', () => {
    it('applies the server character policy to the name and the notice', () => {
        expect(textProblems('Aufnahme', 'Text\nmit Zeilenumbruch')).toEqual([]);
        expect(textProblems('  ', '')).toEqual([{ code: 'name_missing' }]);
        expect(textProblems('x'.repeat(121), '')).toEqual([{ code: 'name_missing' }]);
        expect(textProblems('Na\u0007me', '')).toEqual([{ code: 'name_invalid' }]);
        expect(textProblems('Name\nzwei', '')).toEqual([{ code: 'name_invalid' }]);
        expect(textProblems('Name', 'a\u0007b')).toEqual([{ code: 'privacy_invalid' }]);
        expect(textProblems('Name', 'a\u202eb')).toEqual([{ code: 'privacy_invalid' }]);
        expect(textProblems('Name', 'x'.repeat(10_001))).toEqual([{ code: 'privacy_invalid' }]);
    });

    it('maps the schema issues of a refused body onto name, notice and fields', () => {
        const err = new ApiError(422, 'VALIDATION_ERROR', 'Invalid request body', [{ path: ['name'], message: 'x' }, { path: ['privacyNotice'], message: 'y' }, { path: ['fields'], message: 'z' }, { path: ['other'], message: 'q' }]);
        expect(problemsFromError(err, [])).toEqual([{ code: 'name_invalid' }, { code: 'privacy_invalid' }, { code: 'invalid_definition' }]);
        expect(problemsFromError(new ApiError(422, 'X', 'm', [{ path: ['other'] }]), [])).toBeNull();
        expect(problemsFromError(new ApiError(422, 'X', 'm', []), [])).toBeNull();
    });
});

describe('local custom field checks on publishing', () => {
    const defs = [
        { key: 'trikot', label: 'T', type: 'text', sensitive: false, archived: false },
        { key: 'allergie', label: 'A', type: 'text', sensitive: true, archived: false },
        { key: 'alt', label: 'Alt', type: 'text', sensitive: false, archived: true },
    ];
    const notice: FormField = { key: 'datenschutz', type: 'info', label: 'DS', infoKind: 'privacy_notice' };
    const consent: FormField = { key: 'einwilligung', type: 'consent', label: 'Ok', required: true };
    const codes = (fields: FormField[], customFields = defs) => publishChecks([notice, consent, ...fields], 'T', 'aufnahme', customFields).map((p) => `${p.code}@${p.fieldKey}`);

    it('finds unknown, archived, mistyped and unprotected targets', () => {
        expect(codes([text('a_field', { customField: 'trikot' })])).toEqual([]);
        expect(codes([text('a_field', { customField: 'nope' })])).toEqual(['custom_field_unknown@a_field']);
        expect(codes([text('a_field', { customField: 'alt' })])).toEqual(['custom_field_unknown@a_field']);
        expect(codes([{ key: 'z', type: 'number', label: 'Z', customField: 'trikot' }])).toEqual(['custom_field_type_mismatch@z']);
        expect(codes([text('s_field', { customField: 'trikot', sensitive: true })])).toEqual(['custom_field_not_sensitive@s_field']);
        expect(codes([text('s_field', { customField: 'allergie', sensitive: true })])).toEqual([]);
    });

    it('stays silent when the definitions are not known', () => {
        expect(publishChecks([notice, consent, text('a_field', { customField: 'nope' })], 'T', 'aufnahme')).toEqual([]);
    });
});

describe('credential fields and never-mandatory modules in forms', () => {
    const notice: FormField = { key: 'datenschutz', type: 'info', label: 'DS', infoKind: 'privacy_notice' };
    const consent: FormField = { key: 'einwilligung', type: 'consent', label: 'Ok', required: true };

    it('refuses a credential field in a form with the server code', () => {
        const credential: FormField = { key: 'lizenz', type: 'credential', label: 'Lizenz' };
        expect(shapeProblems([credential])).toContainEqual({ code: 'credential_not_supported', fieldKey: 'lizenz' });
        expect(shapeProblems([text('a_field')]).map((p) => p.code)).not.toContain('credential_not_supported');
    });

    it('warns before publishing when a required field maps to a driving licence, qualification or Kinderschutz module', () => {
        const check = (extra: Partial<FormField>) => publishChecks([notice, consent, text('a_field', extra)], 'T', 'aufnahme').map((p) => `${p.code}@${p.fieldKey}`);
        expect(check({ required: true, customField: 'mod_ks_fuehrungszeugnis' })).toEqual(['module_never_mandatory@a_field']);
        expect(check({ required: true, customField: 'mod_q_juleica' })).toEqual(['module_never_mandatory@a_field']);
        expect(check({ required: true, customField: 'mod_fs_stapler' })).toEqual(['module_never_mandatory@a_field']);
        expect(check({ customField: 'mod_q_juleica' })).toEqual([]);
        expect(check({ required: true, customField: 'mod_sp_trikot' })).toEqual([]);
        expect(check({ required: true, customField: 'trikot' })).toEqual([]);
    });

    it('knows both server codes', () => {
        expect(problemMessageKey('credential_not_supported')).toBe('forms.editor.problem.credential_not_supported');
        expect(problemMessageKey('module_never_mandatory')).toBe('forms.editor.problem.module_never_mandatory');
    });

    it('reads the problem list of a refused publish', () => {
        const err = new ApiError(422, 'UNPROCESSABLE_ENTITY', 'x', { problems: [{ code: 'module_never_mandatory', fieldKey: 'ks95' }, { code: 'credential_not_supported', fieldKey: 'lizenz' }] });
        expect(problemsFromError(err, [])).toEqual([{ code: 'module_never_mandatory', fieldKey: 'ks95' }, { code: 'credential_not_supported', fieldKey: 'lizenz' }]);
    });
});
