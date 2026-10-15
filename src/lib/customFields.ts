import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';
import { type FieldOption, isValidFieldKey, keyProblem, MAX_LABEL, MAX_OPTIONS, withOptionUids } from './formEditor';
import { type Answers, diffAnswers, type FormField, isCleanText, isEmptyAnswer } from './formSchema';

/**
 * Pure helpers of the custom fields UI (Wave 8 W5): definitions of a club (`/member-fields`), the values of one member
 * (`/club-members/:id/custom-fields`, `/club-members/me/custom-fields`), the rules that lock changes (explained before the
 * server refuses them), the diff of a value edit and the mapping of the server's error codes onto plain-language texts. The
 * server is the authority for visibility and write rights; the UI only hides/disables what it is told is not allowed.
 */

export const CUSTOM_FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox'] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];
export const VISIBLE_TO = ['vorstand', 'funktionstraeger', 'mitglied'] as const;
export type VisibleTo = (typeof VISIBLE_TO)[number];
export const EDITABLE_BY = ['vorstand', 'self'] as const;
export type EditableBy = (typeof EDITABLE_BY)[number];

export const MAX_CUSTOM_FIELDS = 100;

export const isCustomFieldType = (v: unknown): v is CustomFieldType => typeof v === 'string' && (CUSTOM_FIELD_TYPES as readonly string[]).includes(v);
export const isChoice = (type: string): boolean => type === 'select' || type === 'multiselect';

/** Definition as `GET /member-fields` returns it (`valueCount` only for `forms:write`). */
export interface CustomFieldDefinition {
    id: string;
    key: string;
    label: string;
    type: CustomFieldType;
    options: FieldOption[] | null;
    visibleTo: VisibleTo;
    editableBy: EditableBy;
    sensitive: boolean;
    sortOrder: number;
    archived: boolean;
    archivedAt: string | null;
    valueCount?: number;
}

/** One field of a member as `GET /club-members/:id/custom-fields` returns it: definition + value + what the caller may do. */
export interface MemberCustomField extends Omit<CustomFieldDefinition, 'valueCount'> {
    /** The caller may change this value (board with `members:write` [+ `members:read_sensitive`], or the person itself for `editableBy = self`). */
    editable: boolean;
    value: unknown;
    updatedAt: string | null;
}

// ---- definition form ------------------------------------------------------------------------------------------

export interface DefinitionForm {
    key: string;
    label: string;
    type: CustomFieldType;
    options: FieldOption[];
    visibleTo: VisibleTo;
    editableBy: EditableBy;
    sensitive: boolean;
}

export const emptyDefinitionForm = (): DefinitionForm => ({ key: '', label: '', type: 'text', options: [], visibleTo: 'vorstand', editableBy: 'vorstand', sensitive: false });

export function formFromDefinition(def: CustomFieldDefinition): DefinitionForm {
    return { key: def.key, label: def.label, type: def.type, options: withOptionUids((def.options ?? []).map((o) => ({ ...o }))), visibleTo: def.visibleTo, editableBy: def.editableBy, sensitive: def.sensitive };
}

export type DefinitionProblem = 'label' | 'label_text' | 'key_format' | 'key_reserved' | 'key_duplicate' | 'options_missing' | 'option_label' | 'option_duplicate' | 'too_many_options';

/** Local checks of a definition form (the server repeats them); `existingKeys` are the keys of all other definitions of the club (incl. archived). */
export function definitionProblems(form: DefinitionForm, existingKeys: readonly string[], isNew: boolean): DefinitionProblem[] {
    const problems: DefinitionProblem[] = [];
    const label = form.label.trim();
    if (label === '' || label.length > MAX_LABEL) problems.push('label');
    else if (!isCleanText(label)) problems.push('label_text');
    if (isNew) {
        const kp = keyProblem(form.key, existingKeys);
        if (kp === 'format') problems.push('key_format');
        else if (kp === 'reserved') problems.push('key_reserved');
        else if (kp === 'duplicate') problems.push('key_duplicate');
    }
    if (isChoice(form.type)) {
        if (form.options.length === 0) problems.push('options_missing');
        if (form.options.length > MAX_OPTIONS) problems.push('too_many_options');
        if (form.options.some((o) => o.label.trim() === '' || o.value.trim() === '' || !isCleanText(o.label))) problems.push('option_label');
        if (new Set(form.options.map((o) => o.value)).size !== form.options.length) problems.push('option_duplicate');
    }
    return problems;
}

/** Whether a key can be used as it is (pattern, reserved names). */
export const isUsableKey = isValidFieldKey;

/** `sortOrder` for a new definition: after all existing ones, in steps of 10. */
export function nextSortOrder(defs: readonly Pick<CustomFieldDefinition, 'sortOrder'>[]): number {
    return Math.min(100_000, defs.reduce((max, d) => Math.max(max, d.sortOrder), -10) + 10);
}

const VISIBILITY_RANK: Record<VisibleTo, number> = { vorstand: 0, funktionstraeger: 1, mitglied: 2 };

/** Whether `to` lets more people read the field than `from` (the server then needs `members:read_sensitive` for protected fields). */
export const widensVisibility = (from: VisibleTo, to: VisibleTo): boolean => VISIBILITY_RANK[to] > VISIBILITY_RANK[from];

export interface ChangeLocks {
    /** The type cannot change any more: values exist. */
    typeLocked: boolean;
    /** `sensitive` cannot be switched off: values exist (create a new field instead). */
    sensitiveLocked: boolean;
    /** `sensitive` could be switched off by the board in principle but this caller lacks `members:read_sensitive`. */
    sensitiveNeedsPermission: boolean;
    /** A wider audience needs `members:read_sensitive` (field is sensitive or already holds values) and the caller lacks it. */
    wideningNeedsPermission: boolean;
}

/** The locks that apply to editing an existing definition (mirrors the server's PATCH rules so they can be explained up front). */
export function changeLocks(def: Pick<CustomFieldDefinition, 'sensitive' | 'valueCount'>, canReadSensitive: boolean): ChangeLocks {
    const values = def.valueCount ?? 0;
    return {
        typeLocked: values > 0,
        sensitiveLocked: def.sensitive && values > 0,
        sensitiveNeedsPermission: def.sensitive && values === 0 && !canReadSensitive,
        wideningNeedsPermission: (def.sensitive || values > 0) && !canReadSensitive,
    };
}

/** Whether the form (against the stored definition) asks for something the locks refuse; returns the reasons in order. */
export function lockViolations(def: CustomFieldDefinition, form: DefinitionForm, canReadSensitive: boolean): Array<'type' | 'sensitive' | 'sensitive_permission' | 'widening'> {
    const locks = changeLocks(def, canReadSensitive);
    const out: Array<'type' | 'sensitive' | 'sensitive_permission' | 'widening'> = [];
    if (form.type !== def.type && locks.typeLocked) out.push('type');
    if (def.sensitive && !form.sensitive) {
        if (locks.sensitiveLocked) out.push('sensitive');
        else if (locks.sensitiveNeedsPermission) out.push('sensitive_permission');
    }
    if (widensVisibility(def.visibleTo, form.visibleTo) && locks.wideningNeedsPermission) out.push('widening');
    return out;
}

/** The PATCH body: only what differs from the stored definition. Empty = nothing to save. */
export function definitionPatch(def: CustomFieldDefinition, form: DefinitionForm): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    if (form.label.trim() !== def.label) patch.label = form.label.trim();
    if (form.type !== def.type) patch.type = form.type;
    const options = isChoice(form.type) ? form.options.map((o) => ({ value: o.value.trim(), label: o.label.trim() })) : null;
    const stored = def.options === null ? null : def.options.map((o) => ({ value: o.value, label: o.label }));
    if (JSON.stringify(options) !== JSON.stringify(stored) && (options !== null || stored !== null)) patch.options = options;
    if (form.visibleTo !== def.visibleTo) patch.visibleTo = form.visibleTo;
    if (form.editableBy !== def.editableBy) patch.editableBy = form.editableBy;
    if (form.sensitive !== def.sensitive) patch.sensitive = form.sensitive;
    return patch;
}

/** The POST body of a new definition. */
export function definitionCreateBody(form: DefinitionForm, sortOrder: number): Record<string, unknown> {
    return {
        key: form.key.trim(),
        label: form.label.trim(),
        type: form.type,
        ...(isChoice(form.type) ? { options: form.options.map((o) => ({ value: o.value.trim(), label: o.label.trim() })) } : {}),
        visibleTo: form.visibleTo,
        editableBy: form.editableBy,
        sensitive: form.sensitive,
        sortOrder,
    };
}

// ---- errors ---------------------------------------------------------------------------------------------------

/** Translation key for a failed custom field request (definitions and values). */
export function customFieldErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        switch (code) {
            case 'custom_field_has_values':
                return 'forms.cf.err.hasValues';
            case 'option_in_use':
                return 'forms.cf.err.optionInUse';
            case 'sensitive_locked':
                return 'forms.cf.err.sensitiveLocked';
            case 'custom_field_exists':
                return 'forms.cf.err.exists';
            case 'custom_field_limit':
                return 'forms.cf.err.limit';
            case 'custom_field_archived':
                return 'forms.cf.err.archived';
        }
        if (err.status === 403) {
            if (/read_sensitive/i.test(err.message)) return 'forms.cf.err.needsSensitive';
            if (/forms:write/i.test(err.message)) return 'forms.cf.err.needsForms';
            if (/members:write|permission to change|only be changed by the board/i.test(err.message)) return 'forms.cf.err.cannotEdit';
            return 'forms.cf.err.forbidden';
        }
        if (err.status === 422) {
            if (err.details && typeof err.details === 'object' && 'fields' in err.details) return 'forms.err.fieldsInvalid';
            return 'forms.cf.err.invalid';
        }
        if (err.status === 404) return 'forms.cf.err.notFound';
    }
    return memberErrorKey(err);
}

export type DeleteOutcome = 'archived' | 'deleted';

/** `data.outcome` of `DELETE /member-fields/:id`; anything unexpected is treated as the cautious outcome (archived). */
export function deleteOutcomeOf(res: unknown): DeleteOutcome {
    const outcome = (res as { data?: { outcome?: unknown } } | null)?.data?.outcome;
    return outcome === 'deleted' ? 'deleted' : 'archived';
}

// ---- values of a member ---------------------------------------------------------------------------------------

/** The form-engine view of a custom field so the shared `FormRenderer` can render and edit it. */
export function toFormField(field: MemberCustomField): FormField {
    return {
        key: field.key,
        type: field.type,
        label: field.label,
        ...(isChoice(field.type) && field.options ? { options: field.options } : {}),
    };
}

export const editableFields = (fields: readonly MemberCustomField[]): MemberCustomField[] => fields.filter((f) => f.editable && !f.archived);
export const readOnlyFields = (fields: readonly MemberCustomField[]): MemberCustomField[] => fields.filter((f) => !f.editable);

/**
 * Which fields are shown as inputs and which as plain values.
 * - Read-only view (details of a member for somebody without `members:write`): nothing is an input.
 * - Own record (`own`, `PATCH /club-members/me/custom-fields`): only fields with `editableBy = self`. The server also flags board
 *   fields `editable` for a person with `members:write`, but the own-values route refuses the WHOLE request with 403 as soon as one
 *   such field is in it -- so those stay read-only here (the board edits them in the member dialog).
 * - Otherwise (board dialog, `PUT`): what the server marks `editable`.
 */
export function partitionFields(fields: readonly MemberCustomField[], readOnlyView: boolean, own = false): { editable: MemberCustomField[]; readOnly: MemberCustomField[] } {
    if (readOnlyView) return { editable: [], readOnly: [...fields] };
    const canEdit = (f: MemberCustomField) => f.editable && !f.archived && (!own || f.editableBy === 'self');
    return { editable: fields.filter(canEdit), readOnly: fields.filter((f) => !canEdit(f)) };
}

/** Answers (key -> value) of the fields that have a value; empty values are left out like on the server. */
export function valuesToAnswers(fields: readonly MemberCustomField[]): Answers {
    const out: Answers = {};
    for (const f of fields) if (!isEmptyAnswer(f.value)) out[f.key] = f.value;
    return out;
}

/**
 * The write body of a value edit: only the editable fields whose answer changed; a cleared answer is `null` (the server removes
 * the value). Read-only fields are never part of it. `null` = nothing changed.
 */
export function valuesPatch(fields: readonly MemberCustomField[], saved: Answers, current: Answers, own = false): Record<string, unknown> | null {
    const editable = new Set(partitionFields(fields, false, own).editable.map((f) => f.key));
    const restrict = (a: Answers): Answers => Object.fromEntries(Object.entries(a).filter(([k]) => editable.has(k)));
    const patch = diffAnswers(restrict(saved), restrict(current));
    return Object.keys(patch).length === 0 ? null : patch;
}

/** Text of a stored value for the read-only view (option labels instead of values); `null` = no value. */
export function displayValue(field: Pick<MemberCustomField, 'type' | 'options' | 'value'>, texts: { yes: string; no: string; formatDate: (v: string) => string }): string | null {
    const { value } = field;
    if (isEmptyAnswer(value) && value !== false) return null;
    const label = (v: unknown) => (field.options ?? []).find((o) => o.value === v)?.label ?? String(v);
    switch (field.type) {
        case 'checkbox':
            return value === true ? texts.yes : texts.no;
        case 'select':
            return label(value);
        case 'multiselect':
            return Array.isArray(value) ? value.map(label).join(', ') : label(value);
        case 'date':
            return typeof value === 'string' ? texts.formatDate(value) : String(value);
        default:
            return String(value);
    }
}

/** Fields for the member list's "Details" button: a plain member may see them only if there are fields visible to them at all. */
export const hasVisibleFields = (defs: readonly Pick<CustomFieldDefinition, 'archived'>[]): boolean => defs.some((d) => !d.archived);
