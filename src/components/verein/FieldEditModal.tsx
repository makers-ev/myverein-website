'use client';

import { useId, useState } from 'react';
import { Info, Lock } from 'lucide-react';

import OptionsEditor from '@/components/forms/OptionsEditor';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    allowedOps,
    applyMappingSelection,
    availableMappingTargets,
    changeFieldType,
    compatibleCustomFields,
    type CustomFieldRef,
    defaultCondition,
    describeProblems,
    type EditablePurpose,
    editorReducer,
    fieldTypesFor,
    type FieldOption,
    initialEditorState,
    isChoiceType,
    mappingSelectValue,
    MAX_HELP,
    MAX_INFO_TEXT,
    MAX_LABEL,
    PATTERN_OPTIONS,
    parseNumberInput,
    conditionSources,
    setConditionOp,
    shapeProblems,
    TEXT_FIELD_MAX,
    TEXTAREA_FIELD_MAX,
    uniqueKey,
} from '@/lib/formEditor';
import { FIELD_TYPES, type FieldType, type FormField, type VisibleIf } from '@/lib/formSchema';

type NumKey = 'minLength' | 'maxLength' | 'min' | 'max';
const NUM_KEYS: readonly NumKey[] = ['minLength', 'maxLength', 'min', 'max'];

const asText = (n: number | undefined): string => (n === undefined ? '' : String(n));

function Labeled({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-xs font-semibold text-muted-foreground">
                {label}
            </label>
            <div className="mt-1">{children}</div>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function Check({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
    return (
        <label className={`flex items-start gap-2 text-sm text-foreground ${disabled ? 'opacity-60' : ''}`}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
            <span>
                {label}
                {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
            </span>
        </label>
    );
}

/** Value input of a condition: option picker(s) for choice sources, free text otherwise. */
function ConditionValue({ cond, source, categories, onChange }: { cond: VisibleIf; source: FormField; categories: ReadonlyArray<{ key: string; name: string }>; onChange: (next: VisibleIf) => void }) {
    const { t } = useLanguage();
    if (cond.op === 'checked') return null;
    const choices: FieldOption[] | null = source.options ?? (source.optionsSource === 'member_categories' && categories.length > 0 ? categories.map((c) => ({ value: c.key, label: c.name })) : null);
    if (cond.op === 'in') {
        const selected = Array.isArray(cond.value) ? cond.value.filter((v): v is string => typeof v === 'string') : [];
        if (!choices) {
            return (
                <input
                    aria-label={t('forms.editor.field.condition.valuesText')}
                    value={selected.join(', ')}
                    onChange={(e) => onChange({ ...cond, value: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
                    className={inputClass}
                />
            );
        }
        return (
            <fieldset>
                <legend className="sr-only">{t('forms.editor.field.condition.value')}</legend>
                <div className="space-y-1">
                    {choices.map((o) => (
                        <label key={o.value} className="flex items-start gap-2 text-sm text-foreground">
                            <input
                                type="checkbox"
                                checked={selected.includes(o.value)}
                                onChange={(e) => onChange({ ...cond, value: e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value) })}
                                className="mt-0.5 h-4 w-4 accent-primary"
                            />
                            <span className="min-w-0 break-words">{o.label || o.value}</span>
                        </label>
                    ))}
                </div>
            </fieldset>
        );
    }
    const current = typeof cond.value === 'string' ? cond.value : '';
    if (choices) {
        return (
            <select aria-label={t('forms.editor.field.condition.value')} value={current} onChange={(e) => onChange({ ...cond, value: e.target.value })} className={inputClass}>
                <option value="">{t('forms.select.placeholder')}</option>
                {choices.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label || o.value}
                    </option>
                ))}
            </select>
        );
    }
    return <input aria-label={t('forms.editor.field.condition.value')} value={current} maxLength={80} onChange={(e) => onChange({ ...cond, value: e.target.value })} className={inputClass} />;
}

/**
 * Dialog for one field of the form (add / edit): type, label, help text, key, required, sensitive, type specific settings
 * (options, length / range / date limits, validation preset), the `visibleIf` builder (only earlier fields) and, for
 * the application form, the mapping ("Speichern als": master data or a custom field). Texts of the definition are plain
 * text everywhere. The key and type of a field that is part of the published version are locked (the server refuses a type
 * change and a renamed key would be a different field).
 */
export default function FieldEditModal({
    field,
    index,
    fields,
    publishedFields,
    purpose,
    customFields,
    customFieldsFailed,
    categories,
    onSave,
    onClose,
}: {
    /** `null` = add a new field at the end. */
    field: FormField | null;
    index: number;
    fields: FormField[];
    publishedFields: FormField[];
    purpose: EditablePurpose;
    customFields: CustomFieldRef[];
    customFieldsFailed: boolean;
    categories: ReadonlyArray<{ key: string; name: string }>;
    onSave: (field: FormField) => void;
    onClose: () => void;
}) {
    const { t } = useLanguage();
    const ids = useId();
    const isNew = field === null;
    const otherKeys = fields.filter((_, i) => i !== index).map((f) => f.key);
    const published = field ? publishedFields.find((f) => f.key === field.key) : undefined;
    const keyLocked = !isNew && published !== undefined;
    const lockedOptionValues = new Set((published?.options ?? []).map((o) => o.value));

    const [initial] = useState<FormField>(() => field ?? { key: uniqueKey('feld', fields.map((f) => f.key)), type: 'text', label: '' });
    const [draft, setDraft] = useState<FormField>(initial);
    const [keyTouched, setKeyTouched] = useState(!isNew);
    const [nums, setNums] = useState<Record<NumKey, string>>(() => ({
        minLength: asText(initial.validation?.minLength),
        maxLength: asText(initial.validation?.maxLength),
        min: asText(initial.validation?.min),
        max: asText(initial.validation?.max),
    }));
    const [attempted, setAttempted] = useState(false);

    // The field as it would be saved: typed numbers merged into the validation, invalid entries reported separately.
    const invalidNums: NumKey[] = [];
    const validation: NonNullable<FormField['validation']> = { ...draft.validation };
    for (const k of NUM_KEYS) {
        const parsed = parseNumberInput(nums[k], k === 'minLength' || k === 'maxLength');
        if (parsed === 'invalid') invalidNums.push(k);
        else if (parsed === undefined) delete validation[k];
        else validation[k] = parsed;
    }
    const composed: FormField = { ...draft };
    if (Object.keys(validation).length > 0) composed.validation = validation;
    else delete composed.validation;

    const applied = editorReducer(initialEditorState('', fields, ''), isNew ? { type: 'add', field: composed } : { type: 'update', index, field: composed }).fields;
    const appliedIndex = isNew ? applied.length - 1 : index;
    const problems = describeProblems(
        shapeProblems(applied).filter((p) => p.fieldKey === composed.key),
        applied,
    );
    const dirty = JSON.stringify(composed) !== JSON.stringify(initial) || (isNew && composed.label !== '');
    const valid = problems.length === 0 && invalidNums.length === 0;

    function update(patch: Partial<FormField>) {
        setDraft((d) => ({ ...d, ...patch }));
    }
    function setLabel(label: string) {
        setDraft((d) => ({ ...d, label, ...(!keyTouched && !keyLocked ? { key: uniqueKey(label, otherKeys) } : {}) }));
    }
    function setType(type: FieldType) {
        const next = changeFieldType(draft, type);
        setDraft(next);
        setNums({ minLength: asText(next.validation?.minLength), maxLength: asText(next.validation?.maxLength), min: asText(next.validation?.min), max: asText(next.validation?.max) });
    }
    function setValidation(patch: Partial<NonNullable<FormField['validation']>>) {
        setDraft((d) => {
            const merged = { ...d.validation, ...patch };
            for (const k of Object.keys(merged) as Array<keyof typeof merged>) if (merged[k] === undefined || merged[k] === '') delete merged[k];
            const next = { ...d };
            if (Object.keys(merged).length > 0) next.validation = merged;
            else delete next.validation;
            return next;
        });
    }

    function requestClose() {
        if (dirty && !window.confirm(t('forms.editor.field.discard'))) return;
        onClose();
    }

    function save() {
        setAttempted(true);
        if (!valid) return;
        onSave(composed);
    }

    const type = draft.type;
    const isInfo = type === 'info';
    const textual = type === 'text' || type === 'textarea';
    const sources = conditionSources(applied, appliedIndex);
    const cond = draft.visibleIf;
    const source = cond ? applied.slice(0, appliedIndex).find((f) => f.key === cond.fieldKey) : undefined;
    const mappingTargets = purpose === 'aufnahme' && !isInfo ? availableMappingTargets(applied, appliedIndex) : [];
    const customChoices = purpose === 'aufnahme' && !isInfo ? compatibleCustomFields(customFields, applied, appliedIndex) : [];
    const mappingValue = mappingSelectValue(draft);
    const mappingAvailable = purpose === 'aufnahme' && !isInfo && type !== 'file';

    return (
        <Modal
            open
            size="lg"
            onClose={requestClose}
            title={isNew ? t('forms.editor.field.add') : t('forms.editor.field.edit', { label: field?.label.trim() || field?.key || '' })}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={requestClose} className={secondaryButtonClass}>
                        {t('forms.editor.field.cancel')}
                    </button>
                    <button type="button" onClick={save} className={primaryButtonClass}>
                        {isNew ? t('forms.editor.field.addSubmit') : t('forms.editor.field.apply')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <Labeled label={t('forms.editor.field.type')} htmlFor={`${ids}-type`} hint={keyLocked ? t('forms.editor.field.typeLocked') : t(`forms.editor.typeHelp.${type}`)}>
                    <select id={`${ids}-type`} value={type} disabled={keyLocked} onChange={(e) => setType(e.target.value as FieldType)} className={inputClass}>
                        {[...new Set([...fieldTypesFor(purpose, FIELD_TYPES), type])].map((value) => (
                            <option key={value} value={value}>
                                {t(`forms.editor.type.${value}`)}
                            </option>
                        ))}
                    </select>
                </Labeled>

                <Labeled label={`${isInfo ? t('forms.editor.field.title') : type === 'consent' ? t('forms.editor.field.consentText') : t('forms.editor.field.label')} *`} htmlFor={`${ids}-label`}>
                    <input id={`${ids}-label`} value={draft.label} maxLength={MAX_LABEL} onChange={(e) => setLabel(e.target.value)} aria-invalid={attempted && draft.label.trim() === '' ? true : undefined} className={inputClass} />
                </Labeled>

                {!isInfo && (
                    <Labeled label={t('forms.editor.field.help')} htmlFor={`${ids}-help`} hint={t('forms.editor.field.helpHint')}>
                        <input id={`${ids}-help`} value={draft.helpText ?? ''} maxLength={MAX_HELP} onChange={(e) => update({ helpText: e.target.value })} className={inputClass} />
                    </Labeled>
                )}

                {isInfo && (
                    <>
                        <Check
                            checked={draft.infoKind === 'privacy_notice'}
                            onChange={(v) => {
                                const next = { ...draft };
                                if (v) next.infoKind = 'privacy_notice';
                                else delete next.infoKind;
                                setDraft(next);
                            }}
                            label={t('forms.editor.field.privacyBlock')}
                            hint={t('forms.editor.field.privacyBlockHint')}
                        />
                        <Labeled label={t('forms.editor.field.infoText')} htmlFor={`${ids}-text`} hint={draft.infoKind === 'privacy_notice' ? t('forms.editor.field.infoTextPrivacyHint') : t('forms.editor.field.infoTextHint')}>
                            <textarea id={`${ids}-text`} rows={4} maxLength={MAX_INFO_TEXT} value={draft.text ?? ''} onChange={(e) => update({ text: e.target.value })} className={inputClass} />
                        </Labeled>
                    </>
                )}

                <div>
                    <label htmlFor={`${ids}-key`} className="block text-xs font-semibold text-muted-foreground">
                        {t('forms.editor.field.key')}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                        {keyLocked && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                        <input
                            id={`${ids}-key`}
                            value={draft.key}
                            readOnly={keyLocked}
                            maxLength={41}
                            autoCapitalize="none"
                            spellCheck={false}
                            onChange={(e) => {
                                setKeyTouched(true);
                                update({ key: e.target.value });
                            }}
                            className={`${inputClass} font-mono`}
                        />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{keyLocked ? t('forms.editor.field.keyLocked') : t('forms.editor.field.keyHint')}</p>
                </div>

                {!isInfo && <Check checked={draft.required === true} onChange={(v) => update({ required: v })} label={t('forms.editor.field.required')} hint={type === 'consent' ? t('forms.editor.field.requiredConsentHint') : undefined} />}

                {isChoiceType(type) && (
                    <fieldset className="space-y-2 rounded-lg border border-border p-3">
                        <legend className="px-1 text-xs font-semibold text-muted-foreground">{t('forms.editor.field.options')}</legend>
                        {purpose === 'aufnahme' && (
                            <Check
                                checked={draft.optionsSource === 'member_categories'}
                                disabled={draft.mapsTo === 'category'}
                                onChange={(v) => {
                                    const next = { ...draft };
                                    if (v) {
                                        next.optionsSource = 'member_categories';
                                        delete next.options;
                                    } else {
                                        delete next.optionsSource;
                                        next.options = [];
                                    }
                                    setDraft(next);
                                }}
                                label={t('forms.editor.field.optionsCategories')}
                                hint={draft.mapsTo === 'category' ? t('forms.editor.field.optionsCategoriesLocked') : t('forms.editor.field.optionsCategoriesHint')}
                            />
                        )}
                        {draft.optionsSource === undefined && (
                            <OptionsEditor
                                options={draft.options ?? []}
                                lockedValues={lockedOptionValues}
                                onChange={(options) => update({ options })}
                                error={attempted && problems.some((p) => p.code === 'options_missing' || p.code === 'option_label_missing' || p.code === 'option_duplicate') ? t('forms.editor.field.optionsInvalid') : null}
                            />
                        )}
                    </fieldset>
                )}

                {(textual || type === 'number' || type === 'date') && (
                    <fieldset className="space-y-3 rounded-lg border border-border p-3">
                        <legend className="px-1 text-xs font-semibold text-muted-foreground">{t('forms.editor.field.validation')}</legend>
                        {textual && (
                            <div className="grid grid-cols-2 gap-3">
                                <Labeled label={t('forms.editor.field.minLength')} htmlFor={`${ids}-minl`}>
                                    <input id={`${ids}-minl`} type="number" inputMode="numeric" min={0} value={nums.minLength} aria-invalid={invalidNums.includes('minLength') || undefined} onChange={(e) => setNums({ ...nums, minLength: e.target.value })} className={inputClass} />
                                </Labeled>
                                <Labeled label={t('forms.editor.field.maxLength')} htmlFor={`${ids}-maxl`} hint={t('forms.editor.field.maxLengthHint', { max: type === 'text' ? TEXT_FIELD_MAX : TEXTAREA_FIELD_MAX })}>
                                    <input id={`${ids}-maxl`} type="number" inputMode="numeric" min={1} max={type === 'text' ? TEXT_FIELD_MAX : TEXTAREA_FIELD_MAX} value={nums.maxLength} aria-invalid={invalidNums.includes('maxLength') || undefined} onChange={(e) => setNums({ ...nums, maxLength: e.target.value })} className={inputClass} />
                                </Labeled>
                            </div>
                        )}
                        {type === 'text' && (
                            <Labeled label={t('forms.editor.field.pattern')} htmlFor={`${ids}-pattern`} hint={t('forms.editor.field.patternHint')}>
                                <select
                                    id={`${ids}-pattern`}
                                    value={draft.validation?.pattern ?? ''}
                                    onChange={(e) => setValidation({ pattern: (e.target.value || undefined) as NonNullable<FormField['validation']>['pattern'] })}
                                    className={inputClass}
                                >
                                    <option value="">{t('forms.editor.field.pattern.none')}</option>
                                    {PATTERN_OPTIONS.map((p) => (
                                        <option key={p} value={p}>
                                            {t(`forms.editor.field.pattern.${p}`)}
                                        </option>
                                    ))}
                                </select>
                            </Labeled>
                        )}
                        {type === 'number' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Labeled label={t('forms.editor.field.min')} htmlFor={`${ids}-min`}>
                                    <input id={`${ids}-min`} type="number" step="any" value={nums.min} aria-invalid={invalidNums.includes('min') || undefined} onChange={(e) => setNums({ ...nums, min: e.target.value })} className={inputClass} />
                                </Labeled>
                                <Labeled label={t('forms.editor.field.max')} htmlFor={`${ids}-max`}>
                                    <input id={`${ids}-max`} type="number" step="any" value={nums.max} aria-invalid={invalidNums.includes('max') || undefined} onChange={(e) => setNums({ ...nums, max: e.target.value })} className={inputClass} />
                                </Labeled>
                            </div>
                        )}
                        {type === 'date' && (
                            <div className="grid grid-cols-2 gap-3">
                                <Labeled label={t('forms.editor.field.minDate')} htmlFor={`${ids}-mind`}>
                                    <input id={`${ids}-mind`} type="date" value={draft.validation?.minDate ?? ''} onChange={(e) => setValidation({ minDate: e.target.value || undefined })} className={inputClass} />
                                </Labeled>
                                <Labeled label={t('forms.editor.field.maxDate')} htmlFor={`${ids}-maxd`}>
                                    <input id={`${ids}-maxd`} type="date" value={draft.validation?.maxDate ?? ''} onChange={(e) => setValidation({ maxDate: e.target.value || undefined })} className={inputClass} />
                                </Labeled>
                            </div>
                        )}
                    </fieldset>
                )}

                {!isInfo && (
                    <Check
                        checked={draft.sensitive === true}
                        disabled={draft.mapsTo !== undefined}
                        onChange={(v) => {
                            const next = { ...draft };
                            if (v) next.sensitive = true;
                            else delete next.sensitive;
                            setDraft(next);
                        }}
                        label={t('forms.editor.field.sensitive')}
                        hint={draft.mapsTo !== undefined ? t('forms.editor.field.sensitiveMapped') : t('forms.editor.field.sensitiveHint')}
                    />
                )}

                <fieldset className="space-y-2 rounded-lg border border-border p-3">
                    <legend className="px-1 text-xs font-semibold text-muted-foreground">{t('forms.editor.field.condition')}</legend>
                    {sources.length === 0 && !cond ? (
                        <p className="text-xs text-muted-foreground">{t('forms.editor.field.condition.noSources')}</p>
                    ) : (
                        <>
                            <Check
                                checked={cond !== undefined}
                                onChange={(v) => {
                                    const next = { ...draft };
                                    if (v) next.visibleIf = defaultCondition(sources[0]!);
                                    else delete next.visibleIf;
                                    setDraft(next);
                                }}
                                label={t('forms.editor.field.condition.enable')}
                                hint={t('forms.editor.field.condition.hint')}
                            />
                            {cond && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Labeled label={t('forms.editor.field.condition.field')} htmlFor={`${ids}-cf`}>
                                        <select
                                            id={`${ids}-cf`}
                                            value={source ? cond.fieldKey : ''}
                                            onChange={(e) => {
                                                const next = sources.find((f) => f.key === e.target.value);
                                                if (next) update({ visibleIf: defaultCondition(next) });
                                            }}
                                            className={inputClass}
                                        >
                                            {!source && <option value="">{t('forms.select.placeholder')}</option>}
                                            {sources.map((f) => (
                                                <option key={f.key} value={f.key}>
                                                    {f.label.trim() || f.key}
                                                </option>
                                            ))}
                                        </select>
                                    </Labeled>
                                    {source && (
                                        <Labeled label={t('forms.editor.field.condition.op')} htmlFor={`${ids}-co`}>
                                            <select id={`${ids}-co`} value={cond.op} onChange={(e) => update({ visibleIf: setConditionOp(cond, e.target.value as VisibleIf['op']) })} className={inputClass}>
                                                {allowedOps(source.type).map((op) => (
                                                    <option key={op} value={op}>
                                                        {t(`forms.editor.field.condition.op.${op}`)}
                                                    </option>
                                                ))}
                                            </select>
                                        </Labeled>
                                    )}
                                    {source && cond.op !== 'checked' && (
                                        <div className="sm:col-span-2">
                                            <p className="mb-1 text-xs font-semibold text-muted-foreground">{t('forms.editor.field.condition.value')}</p>
                                            <ConditionValue cond={cond} source={source} categories={categories} onChange={(next) => update({ visibleIf: next })} />
                                        </div>
                                    )}
                                    {!source && (
                                        <p role="alert" className="text-xs text-destructive sm:col-span-2">
                                            {t('forms.editor.problem.condition_source_missing')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </fieldset>

                {mappingAvailable && (
                    <fieldset className="space-y-2 rounded-lg border border-border p-3">
                        <legend className="px-1 text-xs font-semibold text-muted-foreground">{t('forms.editor.field.mapping')}</legend>
                        <p className="text-xs text-muted-foreground">{t('forms.editor.field.mappingHint')}</p>
                        <select aria-label={t('forms.editor.field.mapping')} value={mappingValue} disabled={draft.sensitive === true} onChange={(e) => setDraft(applyMappingSelection(draft, e.target.value))} className={inputClass}>
                            <option value="">{t('forms.editor.field.mapping.none')}</option>
                            {mappingTargets.length > 0 && (
                                <optgroup label={t('forms.editor.field.mapping.master')}>
                                    {mappingTargets.map((target) => (
                                        <option key={target} value={`master:${target}`}>
                                            {t(`forms.review.target.${target}`)}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {customChoices.length > 0 && (
                                <optgroup label={t('forms.editor.field.mapping.custom')}>
                                    {customChoices.map((c) => (
                                        <option key={c.key} value={`custom:${c.key}`}>
                                            {c.label}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {/* A mapping that is no longer offered (custom field archived) stays visible so it can be removed. */}
                            {draft.customField && !customChoices.some((c) => c.key === draft.customField) && <option value={`custom:${draft.customField}`}>{draft.customField}</option>}
                        </select>
                        {draft.sensitive === true && <p className="text-xs text-muted-foreground">{t('forms.editor.field.mappingSensitive')}</p>}
                        {customFieldsFailed && <p className="text-xs text-destructive">{t('forms.editor.field.customFailed')}</p>}
                        {!customFieldsFailed && customChoices.length === 0 && !draft.customField && <p className="text-xs text-muted-foreground">{t('forms.editor.field.customNone')}</p>}
                        {draft.customField && (
                            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                {t('forms.editor.field.customTypeHint')}
                            </p>
                        )}
                    </fieldset>
                )}

                {attempted && !valid && (
                    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        <p className="font-semibold">{t('forms.editor.field.problems')}</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {problems.map((p, i) => (
                                <li key={`${p.code}-${i}`}>{t(p.key)}</li>
                            ))}
                            {invalidNums.map((k) => (
                                <li key={k}>{t('forms.editor.field.numberInvalid')}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
    );
}
