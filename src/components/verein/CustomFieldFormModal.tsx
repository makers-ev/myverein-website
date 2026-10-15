'use client';

import { useId, useState } from 'react';
import { Lock } from 'lucide-react';

import OptionsEditor from '@/components/forms/OptionsEditor';
import { Modal } from '@/components/Modal';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    CUSTOM_FIELD_TYPES,
    type CustomFieldDefinition,
    customFieldErrorKey,
    type CustomFieldType,
    changeLocks,
    definitionCreateBody,
    definitionPatch,
    definitionProblems,
    type DefinitionForm,
    EDITABLE_BY,
    emptyDefinitionForm,
    formFromDefinition,
    isChoice,
    lockViolations,
    nextSortOrder,
    VISIBLE_TO,
    widensVisibility,
} from '@/lib/customFields';
import { MAX_LABEL, uniqueKey } from '@/lib/formEditor';

/**
 * Create / edit dialog of a custom field definition (`forms:write`). The key is derived from the label for a new field and is
 * fixed afterwards. Everything the server would refuse is explained up front: the type of a field with values, switching
 * off `sensitive` on a field with values, and wider audiences for protected or valued fields without `members:read_sensitive`.
 */
export default function CustomFieldFormModal({
    clubId,
    definition,
    all,
    canReadSensitive,
    onClose,
    onSaved,
}: {
    /** `null` = create. */
    definition: CustomFieldDefinition | null;
    all: CustomFieldDefinition[];
    clubId: string;
    canReadSensitive: boolean;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const ids = useId();
    const isNew = definition === null;
    const [initial] = useState<DefinitionForm>(() => (definition ? formFromDefinition(definition) : emptyDefinitionForm()));
    const [form, setForm] = useState<DefinitionForm>(initial);
    const [keyTouched, setKeyTouched] = useState(false);
    const [attempted, setAttempted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const existingKeys = all.filter((d) => d.id !== definition?.id).map((d) => d.key);
    const locks = definition ? changeLocks(definition, canReadSensitive) : null;
    const problems = definitionProblems(form, existingKeys, isNew);
    const violations = definition ? lockViolations(definition, form, canReadSensitive) : [];
    const lockedOptionValues = new Set((definition?.valueCount ?? 0) > 0 ? (definition?.options ?? []).map((o) => o.value) : []);
    const dirty = JSON.stringify(form) !== JSON.stringify(initial);
    const patch = definition ? definitionPatch(definition, form) : null;
    const valid = problems.length === 0 && violations.length === 0;

    function setLabel(label: string) {
        setForm((f) => ({ ...f, label, ...(isNew && !keyTouched ? { key: label.trim() === '' ? '' : uniqueKey(label, existingKeys) } : {}) }));
    }

    async function requestClose() {
        if (dirty && !(await confirm({ title: t('forms.confirm.discard.title'), body: t('verein.form.discard'), confirmLabel: t('forms.confirm.discard.confirm'), danger: true }))) return;
        onClose();
    }

    async function save() {
        setAttempted(true);
        if (!valid || saving) return;
        if (definition && patch && Object.keys(patch).length === 0) {
            onClose();
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (definition) {
                await apiFetch(`/member-fields/${definition.id}?clubId=${clubId}`, { method: 'PATCH', body: patch });
            } else {
                await apiFetch(`/member-fields?clubId=${clubId}`, { method: 'POST', body: definitionCreateBody(form, nextSortOrder(all)) });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(t(customFieldErrorKey(err)));
            setSaving(false);
        }
    }

    const visibilityDisabled = (value: (typeof VISIBLE_TO)[number]) => !!definition && widensVisibility(definition.visibleTo, value) && !!locks?.wideningNeedsPermission;
    const sensitiveDisabled = !!definition && definition.sensitive && (!!locks?.sensitiveLocked || !!locks?.sensitiveNeedsPermission);

    return (
        <Modal
            open
            size="lg"
            onClose={saving ? () => {} : () => void requestClose()}
            title={definition ? t('forms.cf.edit.title', { label: definition.label }) : t('forms.cf.create.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => void requestClose()} disabled={saving} className={secondaryButtonClass}>
                        {t('forms.editor.field.cancel')}
                    </button>
                    <button type="button" onClick={() => void save()} disabled={saving} className={primaryButtonClass}>
                        {definition ? t('verein.profil.save') : t('forms.cf.create.submit')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor={`${ids}-label`} className="block text-xs font-semibold text-muted-foreground">
                        {t('forms.editor.field.label')} *
                    </label>
                    <input id={`${ids}-label`} value={form.label} maxLength={MAX_LABEL} aria-invalid={attempted && problems.includes('label') ? true : undefined} onChange={(e) => setLabel(e.target.value)} className={`mt-1 ${inputClass}`} />
                </div>

                <div>
                    <label htmlFor={`${ids}-key`} className="block text-xs font-semibold text-muted-foreground">
                        {t('forms.editor.field.key')}
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                        {!isNew && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                        <input
                            id={`${ids}-key`}
                            value={form.key}
                            readOnly={!isNew}
                            maxLength={41}
                            autoCapitalize="none"
                            spellCheck={false}
                            onChange={(e) => {
                                setKeyTouched(true);
                                setForm({ ...form, key: e.target.value });
                            }}
                            className={`${inputClass} font-mono`}
                        />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{isNew ? t('forms.cf.key.hint') : t('forms.cf.key.locked')}</p>
                    {(form.key !== '' || attempted) && isNew && (
                        <p className="mt-1 text-xs text-muted-foreground">{t('forms.cf.key.export', { key: form.key || '…' })}</p>
                    )}
                </div>

                <div>
                    <label htmlFor={`${ids}-type`} className="block text-xs font-semibold text-muted-foreground">
                        {t('forms.editor.field.type')}
                    </label>
                    <select
                        id={`${ids}-type`}
                        value={form.type}
                        disabled={!!locks?.typeLocked}
                        onChange={(e) => {
                            const type = e.target.value as CustomFieldType;
                            setForm({ ...form, type, options: isChoice(type) ? form.options : [] });
                        }}
                        className={`mt-1 ${inputClass}`}
                    >
                        {CUSTOM_FIELD_TYPES.map((value) => (
                            <option key={value} value={value}>
                                {t(`forms.editor.type.${value}`)}
                            </option>
                        ))}
                    </select>
                    {locks?.typeLocked && <p className="mt-1 text-xs text-muted-foreground">{t('forms.cf.type.locked', { count: definition?.valueCount ?? 0 })}</p>}
                </div>

                {isChoice(form.type) && (
                    <fieldset className="rounded-lg border border-border p-3">
                        <legend className="px-1 text-xs font-semibold text-muted-foreground">{t('forms.editor.field.options')}</legend>
                        <OptionsEditor
                            options={form.options}
                            lockedValues={lockedOptionValues}
                            protectLocked
                            onChange={(options) => setForm({ ...form, options })}
                            error={attempted && (problems.includes('options_missing') || problems.includes('option_label') || problems.includes('option_duplicate')) ? t('forms.editor.field.optionsInvalid') : null}
                        />
                        {(definition?.valueCount ?? 0) > 0 && <p className="mt-2 text-xs text-muted-foreground">{t('forms.cf.options.inUse')}</p>}
                    </fieldset>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor={`${ids}-visible`} className="block text-xs font-semibold text-muted-foreground">
                            {t('forms.cf.visibleTo')}
                        </label>
                        <select id={`${ids}-visible`} value={form.visibleTo} onChange={(e) => setForm({ ...form, visibleTo: e.target.value as DefinitionForm['visibleTo'] })} className={`mt-1 ${inputClass}`}>
                            {VISIBLE_TO.map((value) => (
                                <option key={value} value={value} disabled={visibilityDisabled(value)}>
                                    {t(`forms.cf.visibleTo.${value}`)}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">{t(`forms.cf.visibleTo.${form.visibleTo}.hint`)}</p>
                        {locks?.wideningNeedsPermission && <p className="mt-1 text-xs text-muted-foreground">{t('forms.cf.visibleTo.wideningLocked')}</p>}
                    </div>
                    <div>
                        <label htmlFor={`${ids}-editable`} className="block text-xs font-semibold text-muted-foreground">
                            {t('forms.cf.editableBy')}
                        </label>
                        <select id={`${ids}-editable`} value={form.editableBy} onChange={(e) => setForm({ ...form, editableBy: e.target.value as DefinitionForm['editableBy'] })} className={`mt-1 ${inputClass}`}>
                            {EDITABLE_BY.map((value) => (
                                <option key={value} value={value}>
                                    {t(`forms.cf.editableBy.${value}`)}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">{t(`forms.cf.editableBy.${form.editableBy}.hint`)}</p>
                    </div>
                </div>

                <div className="rounded-lg border border-border p-3">
                    <label className={`flex items-start gap-2 text-sm text-foreground ${sensitiveDisabled ? 'opacity-70' : ''}`}>
                        <input type="checkbox" checked={form.sensitive} disabled={sensitiveDisabled} onChange={(e) => setForm({ ...form, sensitive: e.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" />
                        <span>
                            {t('forms.cf.sensitive')}
                            <span className="block text-xs text-muted-foreground">{t('forms.cf.sensitive.hint')}</span>
                        </span>
                    </label>
                    {locks?.sensitiveLocked && <p className="mt-2 text-xs text-muted-foreground">{t('forms.cf.sensitive.locked')}</p>}
                    {!locks?.sensitiveLocked && locks?.sensitiveNeedsPermission && <p className="mt-2 text-xs text-muted-foreground">{t('forms.cf.sensitive.needsPermission')}</p>}
                    {form.sensitive && <p className="mt-2 text-xs text-muted-foreground">{t('forms.cf.sensitive.writeHint')}</p>}
                </div>

                {attempted && (problems.length > 0 || violations.length > 0) && (
                    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        <ul className="list-disc space-y-0.5 pl-5">
                            {problems.map((p) => (
                                <li key={p}>{t(`forms.cf.problem.${p}`)}</li>
                            ))}
                            {violations.map((v) => (
                                <li key={v}>{t(`forms.cf.violation.${v}`)}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
            {dialog}
        </Modal>
    );
}
