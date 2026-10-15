import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';
import { type FieldType, type FormField, isCleanText, type PatternPreset, type VisibleIf } from './formSchema';

/**
 * Pure helpers of the form editor (Wave 8 W2): the editor state and its reducer, reordering with condition repair,
 * `visibleIf` constraints (earlier fields only), field-key validation, the mapping allowlist with type compatibility,
 * local checks that mirror the server's field-definition and publish rules, the mapping of the server's problem list
 * onto plain-language texts and the change summary shown before publishing. The server (`src/lib/form-schema.ts`,
 * `src/lib/forms.ts` of the backend) stays the authority; everything here is convenience so the board sees problems
 * before the request. No I/O, no React.
 */

export const MAX_FIELDS = 60;
export const MAX_OPTIONS = 50;
export const MAX_LABEL = 200;
export const MAX_HELP = 500;
export const MAX_INFO_TEXT = 2000;
export const MAX_PRIVACY_NOTICE = 10_000;
export const MAX_FORM_NAME = 120;
export const TEXT_FIELD_MAX = 200;
export const TEXTAREA_FIELD_MAX = 5000;
export const FIELD_KEY_RE = /^[a-z][a-z0-9_]{1,40}$/;
/** Keys that match the pattern but are reserved (object-prototype names), as in the backend. */
const RESERVED_KEYS = new Set(['constructor', 'prototype', 'hasownproperty', 'tostring', 'valueof']);

/** Field types a purpose's form can use: the exit dialog has no upload. */
export function fieldTypesFor(purpose: string, all: readonly FieldType[]): FieldType[] {
    return purpose === 'austritt' ? all.filter((t) => t !== 'file' && t !== 'image') : [...all];
}

/** The purposes the UI offers in Wave 8 (the data model knows more; they have no UI yet). */
export const EDITABLE_PURPOSES = ['aufnahme', 'austritt'] as const;
export type EditablePurpose = (typeof EDITABLE_PURPOSES)[number];
export const isEditablePurpose = (value: unknown): value is EditablePurpose => typeof value === 'string' && (EDITABLE_PURPOSES as readonly string[]).includes(value);

export const PATTERN_OPTIONS: readonly PatternPreset[] = ['email', 'postal_code', 'phone'];

// ---- API shapes -----------------------------------------------------------------------------------------------

export interface FormSummary {
    id: string;
    purpose: string;
    name: string;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
    publishedVersion: number | null;
    draftVersion: number | null;
    versionCount: number;
}

export interface FormVersion {
    id: string;
    version: number;
    status: 'draft' | 'published' | 'archived';
    fields: FormField[];
    privacyNotice: string | null;
    publishedAt: string | null;
    publishedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FormVersionSummary {
    id: string;
    version: number;
    status: 'draft' | 'published' | 'archived';
    fieldCount: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface FormDetail {
    form: { id: string; purpose: string; name: string; archivedAt: string | null; createdAt: string; updatedAt: string };
    published: FormVersion | null;
    draft: FormVersion | null;
}

/** The forms of the UI purposes, `aufnahme` first, archived ones left out. */
export function editableForms(list: readonly FormSummary[]): FormSummary[] {
    return EDITABLE_PURPOSES.flatMap((purpose) => list.filter((f) => f.purpose === purpose && !f.archivedAt));
}

// ---- keys -----------------------------------------------------------------------------------------------------

export function isValidFieldKey(key: string): boolean {
    return FIELD_KEY_RE.test(key) && !RESERVED_KEYS.has(key);
}

export type KeyProblem = 'format' | 'reserved' | 'duplicate';

export function keyProblem(key: string, others: readonly string[]): KeyProblem | null {
    if (!FIELD_KEY_RE.test(key)) return 'format';
    if (RESERVED_KEYS.has(key)) return 'reserved';
    if (others.includes(key)) return 'duplicate';
    return null;
}

/** Lower-case ASCII slug with underscores (umlauts transliterated); may be empty. */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/\p{M}+/gu, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/** A key derived from `base` that fits the key pattern and is not in `taken` (`name`, `name_2`, ...). */
export function uniqueKey(base: string, taken: readonly string[], fallback = 'feld'): string {
    let stem = slugify(base);
    if (!stem) stem = fallback;
    if (!/^[a-z]/.test(stem)) stem = `f_${stem}`;
    stem = stem.slice(0, 36).replace(/_+$/, '');
    if (stem.length < 2) stem = `${stem}x`.slice(0, 2).padEnd(2, 'x');
    const ok = (k: string) => isValidFieldKey(k) && !taken.includes(k);
    if (ok(stem)) return stem;
    for (let i = 2; i < 1000; i++) {
        const candidate = `${stem}_${i}`;
        if (ok(candidate)) return candidate;
    }
    return stem;
}

/** Option value derived from a label: clean (no `<`, `>`), at most 80 characters, unique among `taken`. */
export function uniqueOptionValue(label: string, taken: readonly string[]): string {
    const stem = (slugify(label) || 'option').slice(0, 70);
    if (!taken.includes(stem)) return stem;
    for (let i = 2; i < 1000; i++) if (!taken.includes(`${stem}_${i}`)) return `${stem}_${i}`;
    return stem;
}

export interface FieldOption {
    value: string;
    label: string;
}

/**
 * New label for option `index`: its value follows the label (`Rot` -> `rot`) as long as it was derived from the old label
 * (or empty) and is not `locked` (already part of a published version, where it must stay stable).
 */
export function renameOption(options: readonly FieldOption[], index: number, label: string, locked: ReadonlySet<string> = new Set()): FieldOption[] {
    const current = options[index];
    if (!current) return [...options];
    const others = options.filter((_, i) => i !== index).map((o) => o.value);
    const derived = current.value === '' || current.value === (slugify(current.label) || 'option') || /^option(_\d+)?$/.test(current.value);
    const follows = derived && !locked.has(current.value);
    const value = follows ? uniqueOptionValue(label, others) : current.value;
    return options.map((o, i) => (i === index ? { value, label } : o));
}

/** Appends an empty option with a placeholder value that is replaced by the label as soon as it is typed. */
export function addOption(options: readonly FieldOption[]): FieldOption[] {
    return [...options, { value: uniqueOptionValue('option', options.map((o) => o.value)), label: '' }];
}

// ---- field construction and type changes ----------------------------------------------------------------------

export const VALIDATION_KEYS_BY_TYPE: Record<FieldType, readonly string[]> = {
    text: ['minLength', 'maxLength', 'pattern'],
    textarea: ['minLength', 'maxLength'],
    number: ['min', 'max'],
    date: ['minDate', 'maxDate'],
    select: [],
    multiselect: [],
    checkbox: [],
    consent: [],
    file: [],
    image: [],
    info: [],
};

export const isChoiceType = (type: FieldType): boolean => type === 'select' || type === 'multiselect';

/** A fresh field of `type` with a unique key; mandatory choices start empty (flagged until the board fills them in). */
export function newField(type: FieldType, taken: readonly string[]): FormField {
    const base: FormField = { key: uniqueKey(type === 'info' ? 'hinweis' : type === 'consent' ? 'einwilligung' : 'feld', taken), type, label: '' };
    if (isChoiceType(type)) base.options = [];
    return base;
}

function prune<T extends object>(obj: T): T | undefined {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined && !(typeof v === 'number' && Number.isNaN(v)));
    return entries.length === 0 ? undefined : (Object.fromEntries(entries) as T);
}

/** Changes the type of a field and removes everything that does not apply to the new type (validation, options, mapping, info parts). */
export function changeFieldType(field: FormField, type: FieldType): FormField {
    if (field.type === type) return field;
    const next: FormField = { ...field, type };
    if (isChoiceType(type)) {
        if (!isChoiceType(field.type)) {
            next.options = [];
            delete next.optionsSource;
        }
    } else {
        delete next.options;
        delete next.optionsSource;
    }
    if (next.validation) {
        const allowed = VALIDATION_KEYS_BY_TYPE[type];
        const kept = prune(Object.fromEntries(Object.entries(next.validation).filter(([k]) => allowed.includes(k))));
        if (kept) {
            if (type === 'text' && typeof kept.maxLength === 'number') kept.maxLength = Math.min(kept.maxLength, TEXT_FIELD_MAX);
            next.validation = kept as FormField['validation'];
        } else delete next.validation;
    }
    if (type === 'info') {
        delete next.required;
        delete next.sensitive;
        delete next.validation;
        delete next.mapsTo;
        delete next.customField;
    } else {
        delete next.infoKind;
        delete next.text;
    }
    // A mapping depends on the type: the user picks it again.
    if (next.mapsTo !== undefined && !mappingAccepts(next.mapsTo, type)) delete next.mapsTo;
    if (next.customField !== undefined) delete next.customField;
    return next;
}

/** The definition as it is sent to the server: no empty strings, no `required: false`, no empty validation, trimmed texts. */
export function cleanField(field: FormField): FormField {
    const out: FormField = { key: field.key, type: field.type, label: field.label.trim() };
    const help = field.helpText?.trim();
    if (help) out.helpText = help;
    if (field.type !== 'info' && field.required) out.required = true;
    if (field.type !== 'info' && field.sensitive) out.sensitive = true;
    if (field.options && isChoiceType(field.type) && !field.optionsSource) out.options = field.options.map((o) => ({ value: o.value.trim(), label: o.label.trim() }));
    if (field.optionsSource && isChoiceType(field.type)) out.optionsSource = field.optionsSource;
    const validation = field.validation ? prune(field.validation) : undefined;
    if (validation && field.type !== 'info') {
        const allowed = VALIDATION_KEYS_BY_TYPE[field.type];
        const filtered = prune(Object.fromEntries(Object.entries(validation).filter(([k, v]) => allowed.includes(k) && v !== '')));
        if (filtered) out.validation = filtered as FormField['validation'];
    }
    if (field.visibleIf) out.visibleIf = field.visibleIf;
    if (field.mapsTo) out.mapsTo = field.mapsTo;
    if (field.customField) out.customField = field.customField;
    if (field.type === 'info') {
        if (field.infoKind) out.infoKind = field.infoKind;
        const text = field.text?.trim();
        if (text) out.text = text;
    }
    return out;
}

export const cleanFields = (fields: readonly FormField[]): FormField[] => fields.map(cleanField);

/** Parses a number input: `''` = unset, a finite number, or `'invalid'`. */
export function parseNumberInput(text: string, integer = false): number | undefined | 'invalid' {
    const trimmed = text.trim();
    if (trimmed === '') return undefined;
    const n = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) return 'invalid';
    return n;
}

// ---- conditions -----------------------------------------------------------------------------------------------

/** Source fields a `visibleIf` may refer to (backend `CONDITION_SOURCE_TYPES`). */
export const CONDITION_SOURCE_TYPES: readonly FieldType[] = ['text', 'select', 'multiselect', 'checkbox', 'consent'];

export type ConditionOp = VisibleIf['op'];

/** Earlier fields (before `index`) that can be a condition source. */
export function conditionSources(fields: readonly FormField[], index: number): FormField[] {
    return fields.slice(0, Math.max(0, index)).filter((f) => CONDITION_SOURCE_TYPES.includes(f.type));
}

/** Operators that fit a source type (a subset of what the server accepts, enough for the editor). */
export function allowedOps(sourceType: FieldType): ConditionOp[] {
    if (sourceType === 'checkbox' || sourceType === 'consent') return ['checked'];
    if (sourceType === 'multiselect') return ['in'];
    if (sourceType === 'select') return ['eq', 'neq', 'in'];
    return ['eq', 'neq'];
}

export function defaultCondition(source: FormField): VisibleIf {
    const op = allowedOps(source.type)[0]!;
    if (op === 'checked') return { fieldKey: source.key, op };
    const first = source.options?.[0]?.value;
    if (op === 'in') return { fieldKey: source.key, op, value: first ? [first] : [] };
    return { fieldKey: source.key, op, value: first ?? '' };
}

/** Switches the operator and reshapes the value (`eq`/`neq` take one text, `in` a list, `checked` none). */
export function setConditionOp(cond: VisibleIf, op: ConditionOp): VisibleIf {
    if (op === 'checked') return { fieldKey: cond.fieldKey, op };
    const current = Array.isArray(cond.value) ? cond.value : typeof cond.value === 'string' && cond.value !== '' ? [cond.value] : [];
    if (op === 'in') return { fieldKey: cond.fieldKey, op, value: current };
    return { fieldKey: cond.fieldKey, op, value: current[0] ?? '' };
}

export type ConditionProblem = 'source_missing' | 'source_type' | 'op' | 'value_missing' | 'value_option';

/** Why the `visibleIf` of the field at `index` is invalid (mirrors the server), or `null`. */
export function conditionProblem(fields: readonly FormField[], index: number): ConditionProblem | null {
    const field = fields[index];
    const cond = field?.visibleIf;
    if (!field || !cond) return null;
    const source = fields.slice(0, index).find((f) => f.key === cond.fieldKey);
    if (!source) return 'source_missing';
    if (!CONDITION_SOURCE_TYPES.includes(source.type)) return 'source_type';
    if (!allowedOps(source.type).includes(cond.op)) return 'op';
    if (cond.op === 'checked') return cond.value === undefined ? null : 'value_missing';
    const values = Array.isArray(cond.value) ? cond.value : cond.value === undefined ? [] : [cond.value];
    if (values.length === 0 || values.some((v) => typeof v !== 'string' || v === '')) return 'value_missing';
    if (cond.op === 'in' ? !Array.isArray(cond.value) : Array.isArray(cond.value)) return 'value_missing';
    if (source.options && values.some((v) => !source.options!.some((o) => o.value === v))) return 'value_option';
    return null;
}

/**
 * Removes the conditions that can no longer hold structurally (their source was deleted, moved behind the field or is
 * not a possible source); value problems stay for the board to fix. Returns the keys of the fields that lost one.
 */
export function repairConditions(fields: readonly FormField[]): { fields: FormField[]; dropped: string[] } {
    const dropped: string[] = [];
    const out = fields.map((field, index) => {
        const problem = conditionProblem(fields, index);
        if (problem === 'source_missing' || problem === 'source_type') {
            dropped.push(field.key);
            const rest = { ...field };
            delete rest.visibleIf;
            return rest;
        }
        return field;
    });
    return { fields: out, dropped };
}

// ---- mapping --------------------------------------------------------------------------------------------------

/** Mapping allowlist with the field types that can carry the value (backend `MAPPING_TARGETS`). */
export const MAPPING_TARGETS = {
    firstName: ['text'],
    lastName: ['text'],
    birthDate: ['date'],
    street: ['text'],
    postalCode: ['text'],
    city: ['text'],
    phone: ['text'],
    contactEmail: ['text'],
    emergencyContactName: ['text'],
    emergencyContactPhone: ['text'],
    category: ['select'],
    photo: ['image'],
} as const satisfies Record<string, readonly FieldType[]>;

export type MappingTarget = keyof typeof MAPPING_TARGETS;
export const MAPPING_TARGET_KEYS = Object.keys(MAPPING_TARGETS) as MappingTarget[];

export function isMappingTarget(value: unknown): value is MappingTarget {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MAPPING_TARGETS, value);
}

export function mappingAccepts(target: string, type: FieldType): boolean {
    return isMappingTarget(target) && (MAPPING_TARGETS[target] as readonly string[]).includes(type);
}

/**
 * Targets the field at `index` may be saved as: they accept its type, are not used by another field and the answer is
 * not marked sensitive (sensitive answers never go to master data).
 */
export function availableMappingTargets(fields: readonly FormField[], index: number): MappingTarget[] {
    const field = fields[index];
    if (!field || field.type === 'info' || field.sensitive) return [];
    const used = new Set(fields.filter((_, i) => i !== index).map((f) => f.mapsTo));
    return MAPPING_TARGET_KEYS.filter((target) => mappingAccepts(target, field.type) && !used.has(target));
}

/** Value of the "Speichern als" select: `''`, `master:<target>` or `custom:<key>`. */
export function mappingSelectValue(field: Pick<FormField, 'mapsTo' | 'customField'>): string {
    if (field.mapsTo) return `master:${field.mapsTo}`;
    if (field.customField) return `custom:${field.customField}`;
    return '';
}

/** Applies a "Speichern als" choice; `category` switches the options to the member categories, a mapping clears the other kind. */
export function applyMappingSelection(field: FormField, value: string): FormField {
    const next: FormField = { ...field };
    delete next.mapsTo;
    delete next.customField;
    if (value.startsWith('master:')) {
        const target = value.slice('master:'.length);
        if (!mappingAccepts(target, field.type)) return next;
        next.mapsTo = target;
        delete next.sensitive;
        if (target === 'category') {
            next.optionsSource = 'member_categories';
            delete next.options;
        }
    } else if (value.startsWith('custom:')) {
        next.customField = value.slice('custom:'.length);
    }
    return next;
}

/** The custom-field type that can hold an answer of a form field type (a consent is stored as a checkbox). */
export const customFieldTypeFor = (type: FieldType): string => (type === 'consent' ? 'checkbox' : type);

export interface CustomFieldRef {
    key: string;
    label: string;
    type: string;
    sensitive: boolean;
    archived: boolean;
}

/** Custom fields an answer may be saved to: same type, live, not taken by another field, protected if the answer is sensitive. */
export function compatibleCustomFields(defs: readonly CustomFieldRef[], fields: readonly FormField[], index: number): CustomFieldRef[] {
    const field = fields[index];
    if (!field || field.type === 'info' || field.type === 'file' || field.type === 'image') return [];
    const used = new Set(fields.filter((_, i) => i !== index).map((f) => f.customField));
    return defs.filter((d) => !d.archived && d.type === customFieldTypeFor(field.type) && !used.has(d.key) && (!field.sensitive || d.sensitive));
}

// ---- local problems -------------------------------------------------------------------------------------------

export interface EditorProblem {
    code: string;
    fieldKey?: string;
}

/** Problems the server reports (publish and save); the first group is also detected locally. */
export const KNOWN_PROBLEM_CODES = [
    // local shape problems (block saving)
    'too_many_fields',
    'key_format',
    'key_reserved',
    'key_duplicate',
    'label_missing',
    'text_not_allowed',
    'options_missing',
    'option_label_missing',
    'option_duplicate',
    'too_many_options',
    'validation_range',
    'validation_length',
    'condition_source_missing',
    'condition_source_type',
    'condition_op',
    'condition_value_missing',
    'condition_value_option',
    'mapping_type',
    'mapping_twice',
    'custom_twice',
    'invalid_definition',
    // publish rules (server codes)
    'privacy_notice_missing',
    'privacy_notice_text_missing',
    'required_consent_missing',
    'mapping_not_allowed',
    'file_not_supported',
    'sensitive_mapping_not_allowed',
    'custom_field_unknown',
    'custom_field_type_mismatch',
    'custom_field_not_sensitive',
    'key_type_immutable',
    'no_selectable_category',
] as const;

const KNOWN_PROBLEMS = new Set<string>(KNOWN_PROBLEM_CODES);

/** Translation key of a problem code; unknown server codes fall back to a generic text. */
export function problemMessageKey(code: string): string {
    return KNOWN_PROBLEMS.has(code) ? `forms.editor.problem.${code}` : 'forms.editor.problem.other';
}

const CONDITION_CODE: Record<ConditionProblem, string> = {
    source_missing: 'condition_source_missing',
    source_type: 'condition_source_type',
    op: 'condition_op',
    value_missing: 'condition_value_missing',
    value_option: 'condition_value_option',
};

/** Shape problems (the server would refuse to save): one entry per problem and field. */
export function shapeProblems(fields: readonly FormField[]): EditorProblem[] {
    const problems: EditorProblem[] = [];
    if (fields.length > MAX_FIELDS) problems.push({ code: 'too_many_fields' });
    const seen = new Set<string>();
    const mapped = new Set<string>();
    const custom = new Set<string>();
    fields.forEach((field, index) => {
        const add = (code: string) => problems.push({ code, fieldKey: field.key });
        const kp = keyProblem(field.key, []);
        if (kp === 'format') add('key_format');
        else if (kp === 'reserved') add('key_reserved');
        if (seen.has(field.key)) add('key_duplicate');
        seen.add(field.key);

        if (field.label.trim() === '' || field.label.trim().length > MAX_LABEL) add('label_missing');
        const texts: Array<[string | undefined, boolean]> = [
            [field.label, false],
            [field.helpText, false],
            [field.text, true],
            ...(field.options ?? []).map((o): [string, boolean] => [o.label, false]),
        ];
        if (texts.some(([text, multiline]) => text !== undefined && !isCleanText(text, multiline))) add('text_not_allowed');

        if (isChoiceType(field.type)) {
            const options = field.options ?? [];
            if (field.optionsSource === undefined && options.length === 0) add('options_missing');
            if (options.length > MAX_OPTIONS) add('too_many_options');
            if (options.some((o) => o.label.trim() === '' || o.value.trim() === '')) add('option_label_missing');
            if (new Set(options.map((o) => o.value)).size !== options.length) add('option_duplicate');
        }

        const v = field.validation;
        if (v) {
            if (v.minLength !== undefined && v.maxLength !== undefined && v.minLength > v.maxLength) add('validation_range');
            else if (v.min !== undefined && v.max !== undefined && v.min > v.max) add('validation_range');
            else if (v.minDate !== undefined && v.maxDate !== undefined && v.minDate > v.maxDate) add('validation_range');
            if (field.type === 'text' && v.maxLength !== undefined && v.maxLength > TEXT_FIELD_MAX) add('validation_length');
        }

        const cp = conditionProblem(fields, index);
        if (cp) add(CONDITION_CODE[cp]);

        if (field.mapsTo !== undefined) {
            if (!mappingAccepts(field.mapsTo, field.type) || (field.mapsTo === 'category' && field.optionsSource !== 'member_categories')) add('mapping_type');
            if (mapped.has(field.mapsTo)) add('mapping_twice');
            mapped.add(field.mapsTo);
        }
        if (field.customField !== undefined) {
            if (custom.has(field.customField)) add('custom_twice');
            custom.add(field.customField);
        }
    });
    return problems;
}

/** Whether the draft can be saved: no shape problem. */
export const canSaveDraft = (fields: readonly FormField[]): boolean => shapeProblems(fields).length === 0;

/**
 * Publish checks that need no server data (what the server checks too): the standard rules of the purpose. Shown as a
 * live checklist; they do not block saving a draft.
 */
export function publishChecks(fields: readonly FormField[], privacyNotice: string, purpose: string): EditorProblem[] {
    const problems: EditorProblem[] = [];
    if (purpose === 'aufnahme') {
        const notice = fields.find((f) => f.type === 'info' && f.infoKind === 'privacy_notice');
        if (!notice) problems.push({ code: 'privacy_notice_missing' });
        else if (!(privacyNotice.trim() || (notice.text ?? '').trim())) problems.push({ code: 'privacy_notice_text_missing', fieldKey: notice.key });
        if (!fields.some((f) => f.type === 'consent' && f.required === true && f.visibleIf === undefined)) problems.push({ code: 'required_consent_missing' });
    }
    for (const f of fields) {
        if (f.sensitive && f.mapsTo !== undefined) problems.push({ code: 'sensitive_mapping_not_allowed', fieldKey: f.key });
        if (purpose !== 'aufnahme' && (f.mapsTo !== undefined || f.customField !== undefined)) problems.push({ code: 'mapping_not_allowed', fieldKey: f.key });
        // The cancellation dialog has no upload: a file or photo field there could never be answered.
        if (purpose === 'austritt' && (f.type === 'file' || f.type === 'image')) problems.push({ code: 'file_not_supported', fieldKey: f.key });
    }
    return problems;
}

export interface DescribedProblem {
    key: string;
    code: string;
    fieldKey?: string;
    /** Label of the field the problem is about (falls back to the key); `null` for form-wide problems. */
    fieldLabel: string | null;
}

/** Problems with the message key and the label of their field, ready to render. */
export function describeProblems(problems: readonly EditorProblem[], fields: readonly FormField[]): DescribedProblem[] {
    const byKey = new Map(fields.map((f) => [f.key, f.label.trim()]));
    return problems.map((p) => ({
        key: problemMessageKey(p.code),
        code: p.code,
        ...(p.fieldKey !== undefined ? { fieldKey: p.fieldKey } : {}),
        fieldLabel: p.fieldKey === undefined ? null : byKey.get(p.fieldKey) || p.fieldKey,
    }));
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Problems of a failed save/publish request: the publish list (`422 details.problems`) or the schema issues of a save
 * (`422 details.issues`, path `[fieldIndex, ...]`). `null` = the error carries no such list.
 */
export function problemsFromError(err: unknown, fields: readonly FormField[]): EditorProblem[] | null {
    if (!(err instanceof ApiError) || err.status !== 422 || !isRecord(err.details)) return null;
    const details = err.details;
    if (Array.isArray(details.problems)) {
        const out: EditorProblem[] = [];
        for (const p of details.problems) {
            if (!isRecord(p) || typeof p.code !== 'string') continue;
            out.push({ code: p.code, ...(typeof p.fieldKey === 'string' ? { fieldKey: p.fieldKey } : {}) });
        }
        return out.length > 0 ? out : null;
    }
    if (Array.isArray(details.issues)) {
        const out: EditorProblem[] = [];
        for (const issue of details.issues) {
            if (!isRecord(issue) || !Array.isArray(issue.path)) continue;
            const index = issue.path[0];
            if (typeof index === 'number') {
                const field = fields[index];
                out.push({ code: 'invalid_definition', ...(field ? { fieldKey: field.key } : {}) });
            } else out.push({ code: 'too_many_fields' });
        }
        // One entry per field is enough.
        const unique = new Map(out.map((p) => [`${p.code}:${p.fieldKey ?? ''}`, p]));
        return unique.size > 0 ? [...unique.values()] : null;
    }
    return null;
}

/** Translation key for a failed editor request (list, load, save, publish, discard, archive). */
export function editorErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        switch (code) {
            case 'no_draft':
                return 'forms.editor.err.noDraft';
            case 'version_immutable':
                return 'forms.editor.err.versionImmutable';
            case 'form_limit':
                return 'forms.editor.err.formLimit';
            case 'version_limit':
                return 'forms.editor.err.versionLimit';
            case 'form_archived':
                return 'forms.editor.err.archived';
            case 'form_purpose_exists':
                return 'forms.editor.err.purposeExists';
        }
        if (err.status === 422 && problemsFromError(err, [])) return 'forms.editor.err.problems';
        if (err.status === 422) return 'forms.editor.err.invalid';
        if (err.status === 403) return 'forms.editor.err.forbidden';
        if (err.status === 404) return 'forms.editor.err.notFound';
        if (err.status === 413) return 'forms.editor.err.tooLarge';
    }
    return memberErrorKey(err);
}

// ---- editor state ---------------------------------------------------------------------------------------------

export interface EditorState {
    name: string;
    fields: FormField[];
    privacyNotice: string;
    /** Keys of fields that lost their condition through the last structural change (shown once as a notice). */
    droppedConditions: string[];
}

export type EditorAction =
    | { type: 'reset'; name: string; fields: FormField[]; privacyNotice: string }
    | { type: 'add'; field: FormField }
    | { type: 'update'; index: number; field: FormField }
    | { type: 'remove'; index: number }
    | { type: 'move'; index: number; direction: 'up' | 'down' }
    | { type: 'setName'; name: string }
    | { type: 'setPrivacyNotice'; privacyNotice: string }
    | { type: 'ackDropped' };

export function initialEditorState(name: string, fields: readonly FormField[], privacyNotice: string | null | undefined): EditorState {
    return { name, fields: fields.map((f) => ({ ...f })), privacyNotice: privacyNotice ?? '', droppedConditions: [] };
}

export const canMove = (index: number, length: number, direction: 'up' | 'down'): boolean => (direction === 'up' ? index > 0 : index < length - 1);

/** Moves the item at `index` one place; out-of-range moves return the list unchanged. */
export function moveItem<T>(items: readonly T[], index: number, direction: 'up' | 'down'): T[] {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
    const copy = [...items];
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
    return copy;
}

/** Moves conditions along with a renamed key. */
function renameConditionRefs(fields: readonly FormField[], from: string, to: string): FormField[] {
    if (from === to) return [...fields];
    return fields.map((f) => (f.visibleIf?.fieldKey === from ? { ...f, visibleIf: { ...f.visibleIf, fieldKey: to } } : f));
}

function withRepair(state: EditorState, fields: FormField[]): EditorState {
    const repaired = repairConditions(fields);
    return { ...state, fields: repaired.fields, droppedConditions: [...new Set([...state.droppedConditions, ...repaired.dropped])] };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case 'reset':
            return initialEditorState(action.name, action.fields, action.privacyNotice);
        case 'add':
            return state.fields.length >= MAX_FIELDS ? state : withRepair(state, [...state.fields, action.field]);
        case 'update': {
            const old = state.fields[action.index];
            if (!old) return state;
            const renamed = renameConditionRefs(state.fields, old.key, action.field.key);
            return withRepair(state, renamed.map((f, i) => (i === action.index ? action.field : f)));
        }
        case 'remove':
            if (action.index < 0 || action.index >= state.fields.length) return state;
            return withRepair(state, state.fields.filter((_, i) => i !== action.index));
        case 'move':
            if (!canMove(action.index, state.fields.length, action.direction)) return state;
            return withRepair(state, moveItem(state.fields, action.index, action.direction));
        case 'setName':
            return { ...state, name: action.name };
        case 'setPrivacyNotice':
            return { ...state, privacyNotice: action.privacyNotice };
        case 'ackDropped':
            return state.droppedConditions.length === 0 ? state : { ...state, droppedConditions: [] };
    }
}

// ---- comparison and change summary ----------------------------------------------------------------------------

/** Key-order independent JSON so two equal definitions compare equal whatever their property order. */
function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (isRecord(value)) {
        return `{${Object.keys(value)
            .filter((k) => value[k] !== undefined)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}

export function fieldsEqual(a: readonly FormField[], b: readonly FormField[]): boolean {
    return stable(cleanFields(a)) === stable(cleanFields(b));
}

export interface EditorBase {
    name: string;
    fields: readonly FormField[];
    privacyNotice: string;
}

/** Whether the editor differs from what the server holds (unsaved changes). */
export function isDirty(state: Pick<EditorState, 'name' | 'fields' | 'privacyNotice'>, base: EditorBase): boolean {
    return state.name.trim() !== base.name.trim() || state.privacyNotice.trim() !== base.privacyNotice.trim() || !fieldsEqual(state.fields, base.fields);
}

export interface ChangeSummary {
    added: FormField[];
    removed: FormField[];
    changed: FormField[];
    reordered: boolean;
    privacyNoticeChanged: boolean;
    /** Nothing differs from the published version. */
    none: boolean;
}

/** What the draft changes compared with the published version (`null` = first version: everything is new). */
export function summarizeChanges(published: { fields: readonly FormField[]; privacyNotice: string | null } | null, draft: { fields: readonly FormField[]; privacyNotice: string }): ChangeSummary {
    const next = cleanFields(draft.fields);
    const prev = published ? cleanFields(published.fields) : [];
    const prevByKey = new Map(prev.map((f) => [f.key, f]));
    const nextByKey = new Map(next.map((f) => [f.key, f]));
    const added = next.filter((f) => !prevByKey.has(f.key));
    const removed = prev.filter((f) => !nextByKey.has(f.key));
    const changed = next.filter((f) => prevByKey.has(f.key) && stable(prevByKey.get(f.key)) !== stable(f));
    const commonPrev = prev.filter((f) => nextByKey.has(f.key)).map((f) => f.key);
    const commonNext = next.filter((f) => prevByKey.has(f.key)).map((f) => f.key);
    const reordered = commonPrev.join('\n') !== commonNext.join('\n');
    const privacyNoticeChanged = (published?.privacyNotice ?? '').trim() !== draft.privacyNotice.trim();
    return { added, removed, changed, reordered, privacyNoticeChanged, none: added.length + removed.length + changed.length === 0 && !reordered && !privacyNoticeChanged };
}

/**
 * Fields of the preview: member categories filled in where the field takes its options from them, a key as label where the
 * label is still empty, and later duplicates of a key left out (the preview must not break while the board is mid-edit).
 */
export function previewFields(fields: readonly FormField[], categories: ReadonlyArray<{ key: string; name: string }>): FormField[] {
    const seen = new Set<string>();
    const out: FormField[] = [];
    for (const field of cleanFields(fields)) {
        if (seen.has(field.key)) continue;
        seen.add(field.key);
        const labelled = field.label === '' ? { ...field, label: field.key } : field;
        if (labelled.optionsSource === 'member_categories') {
            const { optionsSource, ...rest } = labelled;
            void optionsSource;
            out.push({ ...rest, options: categories.map((c) => ({ value: c.key, label: c.name })) });
        } else out.push(labelled);
    }
    return out;
}

/** Label of a field for lists: its label, or a placeholder text when it has none yet. */
export const fieldTitle = (field: Pick<FormField, 'label' | 'key'>, fallback: string): string => field.label.trim() || fallback;

/** Keys of the fields in the published version: their key and type are locked in the editor (the server refuses a type change). */
export const lockedKeysOf = (published: Pick<FormVersion, 'fields'> | null): Set<string> => new Set((published?.fields ?? []).map((f) => f.key));
