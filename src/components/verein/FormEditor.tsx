'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, History, Info, Lock, Pencil, Plus, Trash2 } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import FormRenderer from '@/components/forms/FormRenderer';
import FieldEditModal from '@/components/verein/FieldEditModal';
import FormConflictDialog from '@/components/verein/FormConflictDialog';
import FormPublishDialog, { ProblemList } from '@/components/verein/FormPublishDialog';
import FormVersionsDialog from '@/components/verein/FormVersionsDialog';
import { Modal } from '@/components/Modal';
import { useConfirm } from '@/components/useConfirm';
import { useUnsavedGuard } from '@/lib/useUnsavedGuard';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    canMove,
    canSaveDraft,
    cleanFields,
    conditionsLostByMove,
    dependentsOf,
    isSaveConflict,
    saveTarget,
    textProblems,
    type CustomFieldRef,
    describeProblems,
    type DescribedProblem,
    type EditablePurpose,
    editorErrorKey,
    editorReducer,
    type EditorBase,
    fieldTitle,
    initialEditorState,
    isDirty,
    isEditablePurpose,
    lockedKeysOf,
    MAX_FIELDS,
    MAX_FORM_NAME,
    MAX_PRIVACY_NOTICE,
    newField,
    previewFields,
    problemsFromError,
    publishChecks,
    shapeProblems,
    summarizeChanges,
    uniqueKey,
    type FormDetail,
    type FormSummary,
    type FormVersion,
} from '@/lib/formEditor';
import type { FormField } from '@/lib/formSchema';

const chip = 'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground';
const warnChip = 'inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning';

/**
 * Editor of one form (Wave 8 W2, `forms:write`): fields (add / edit / delete / move with up-down buttons), privacy notice,
 * live preview with the real FormRenderer, saving the draft, the publish flow with a change summary and the server's
 * problem list, discarding the draft, version history (read-only) and archiving. Published versions are immutable --
 * the editor always works on a draft that becomes a new version. Unsaved changes are guarded (`beforeunload`, back button,
 * `onDirtyChange` for the page's tab switch).
 */
export default function FormEditor({
    clubId,
    form,
    customFields,
    customFieldsFailed,
    categories,
    onBack,
    onDirtyChange,
}: {
    clubId: string;
    form: FormSummary;
    customFields: CustomFieldRef[];
    customFieldsFailed: boolean;
    categories: ReadonlyArray<{ key: string; name: string }>;
    /** `changed`: the list should reload (published, archived, discarded). */
    onBack: (changed: boolean) => void;
    onDirtyChange: (dirty: boolean) => void;
}) {
    const { t, language } = useLanguage();
    const purpose: EditablePurpose = isEditablePurpose(form.purpose) ? form.purpose : 'aufnahme';

    const [detail, setDetail] = useState<FormDetail | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [state, dispatch] = useReducer(editorReducer, undefined, () => initialEditorState('', [], ''));
    const [base, setBase] = useState<EditorBase>({ name: '', fields: [], privacyNotice: '' });
    const [busy, setBusy] = useState(false);
    const [flash, setFlash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [serverProblems, setServerProblems] = useState<DescribedProblem[] | null>(null);
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [publishOpen, setPublishOpen] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [versionsOpen, setVersionsOpen] = useState(false);
    const [panel, setConfirm] = useState<'discard' | 'archive' | null>(null);
    const { confirm: ask, dialog: confirmDialog } = useConfirm();
    // The draft on the server is not the one that was loaded (changed, published or discarded elsewhere): the person decides.
    const [conflict, setConflict] = useState<{ latest: FormDetail | null } | null>(null);
    // After a move the focus follows the item (button of the same direction, else the other one) and a live message says where it went.
    const [moved, setMoved] = useState<{ uid: string; direction: 'up' | 'down'; text: string } | null>(null);
    const [previewAnswers, setPreviewAnswers] = useState<Record<string, unknown>>({});
    const changedRef = useRef(false);

    const applyDetail = useCallback((d: FormDetail) => {
        const source = d.draft ?? d.published;
        const fields = source?.fields ?? [];
        const privacyNotice = source?.privacyNotice ?? '';
        dispatch({ type: 'reset', name: d.form.name, fields, privacyNotice });
        setBase({ name: d.form.name, fields, privacyNotice });
        setDetail(d);
    }, []);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: FormDetail }>(`/forms/${form.id}?clubId=${clubId}`)
            .then((res) => {
                if (cancelled) return;
                applyDetail(res.data);
                setLoadFailed(false);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, form.id, attempt, applyDetail]);

    const dirty = detail !== null && isDirty(state, base);
    useEffect(() => {
        onDirtyChange(dirty);
    }, [dirty, onDirtyChange]);
    useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
    useUnsavedGuard(dirty, () => ask({ title: t('forms.editor.leave.title'), body: t('forms.editor.leaveConfirm'), confirmLabel: t('forms.editor.leave.confirm'), danger: true }));

    // Focus follows a moved field.
    useEffect(() => {
        if (!moved) return;
        const preferred = document.getElementById(`mv-${moved.uid}-${moved.direction}`) as HTMLButtonElement | null;
        const other = document.getElementById(`mv-${moved.uid}-${moved.direction === 'up' ? 'down' : 'up'}`) as HTMLButtonElement | null;
        (preferred && !preferred.disabled ? preferred : other)?.focus();
    }, [moved, state.fields]);

    async function leave() {
        if (dirty && !(await ask({ title: t('forms.editor.leave.title'), body: t('forms.editor.leaveConfirm'), confirmLabel: t('forms.editor.leave.confirm'), danger: true }))) return;
        onBack(changedRef.current);
    }

    if (loadFailed) return <LoadError onRetry={() => setAttempt((n) => n + 1)} />;
    if (!detail) return <LoadingText />;

    const published = detail.published;
    const hasDraft = detail.draft !== null;
    const locked = lockedKeysOf(published);
    const shape = shapeProblems(state.fields);
    const checks = publishChecks(state.fields, state.privacyNotice, purpose, customFieldsFailed ? undefined : customFields);
    const textIssues = textProblems(state.name, state.privacyNotice);
    const nameIssue = textIssues.find((p) => p.code === 'name_missing' || p.code === 'name_invalid');
    const privacyIssue = textIssues.find((p) => p.code === 'privacy_invalid');
    const nameInvalid = nameIssue !== undefined;
    const saveBlocked = !canSaveDraft(state.fields) || textIssues.length > 0;
    const describedShape = describeProblems(shape, state.fields);
    const describedChecks = describeProblems(checks, state.fields);
    const summary = summarizeChanges(published, state);
    const problemKeys = new Set(shape.map((p) => p.fieldKey));
    const fieldCount = state.fields.length;

    /** The draft on the server right now, to show what differs after a conflict (`null` if it cannot be read). */
    async function loadLatest(): Promise<FormDetail | null> {
        try {
            return (await apiFetch<{ data: FormDetail }>(`/forms/${form.id}?clubId=${clubId}`)).data;
        } catch {
            return null;
        }
    }

    async function raiseConflict() {
        setPublishOpen(false);
        setConflict({ latest: await loadLatest() });
    }

    /**
     * Saves the draft BY ITS NUMBER (the server refuses with 409 when that draft changed, was published or was discarded meanwhile);
     * `force` = the person chose to keep their version: save into the current draft / start a new one. Returns the saved draft or `null`
     * (failure or conflict, already reported).
     */
    async function persistDraft(force = false): Promise<FormVersion | null> {
        const loadedNumber = detail?.draft?.version ?? null;
        try {
            const res = await apiFetch<{ data: { form: FormDetail['form']; draft: FormVersion } }>(saveTarget(form.id, clubId, loadedNumber, force), {
                method: 'PUT',
                body: { fields: cleanFields(state.fields), name: state.name.trim(), privacyNotice: state.privacyNotice.trim() === '' ? null : state.privacyNotice.trim() },
            });
            const draft = res.data.draft;
            setDetail((d) => (d ? { ...d, form: res.data.form, draft } : d));
            setBase({ name: res.data.form.name, fields: draft.fields, privacyNotice: draft.privacyNotice ?? '' });
            changedRef.current = true;
            return draft;
        } catch (err) {
            if (!force && isSaveConflict(err, loadedNumber !== null)) {
                await raiseConflict();
                return null;
            }
            reportFailure(err);
            return null;
        }
    }

    /** Publishing acts on the CURRENT draft: it must still be the one that was loaded/saved here, else the person decides first. */
    async function draftIsCurrent(): Promise<boolean> {
        const latest = await loadLatest();
        if (latest === null) return true; // cannot tell: the server's own checks (no_draft, problems) still apply
        const mine = detail?.draft;
        if (!mine || !latest.draft || latest.draft.version !== mine.version || latest.draft.updatedAt !== mine.updatedAt) {
            setPublishOpen(false);
            setConflict({ latest });
            return false;
        }
        return true;
    }

    function reportFailure(err: unknown, inDialog = false) {
        const problems = problemsFromError(err, state.fields);
        const text = t(editorErrorKey(err));
        if (inDialog) {
            setServerProblems(problems ? describeProblems(problems, state.fields) : null);
            setPublishError(problems ? null : text);
        } else {
            setServerProblems(problems ? describeProblems(problems, state.fields) : null);
            setError(text);
        }
    }

    async function save() {
        if (saveBlocked || busy) return;
        setBusy(true);
        setError(null);
        setFlash(null);
        setServerProblems(null);
        const draft = await persistDraft();
        if (draft) setFlash(t('forms.editor.saved', { version: draft.version }));
        setBusy(false);
    }

    async function publish() {
        if (busy) return;
        setBusy(true);
        setPublishError(null);
        setServerProblems(null);
        try {
            if (dirty) {
                const draft = await persistDraft();
                if (!draft) {
                    // The save itself was refused or conflicted: it has been reported, nothing is published.
                    setPublishOpen(false);
                    return;
                }
            } else if (!(await draftIsCurrent())) {
                return;
            }
            const res = await apiFetch<{ data: { version: FormVersion } }>(`/forms/${form.id}/publish?clubId=${clubId}`, { method: 'POST', body: {} });
            changedRef.current = true;
            setPublishOpen(false);
            setFlash(t('forms.editor.published', { version: res.data.version.version }));
            setError(null);
            // Reload the published state (the draft is gone, the new version is live).
            setAttempt((n) => n + 1);
        } catch (err) {
            if (isSaveConflict(err, false)) await raiseConflict();
            else reportFailure(err, true);
        } finally {
            setBusy(false);
        }
    }

    async function keepMine() {
        setBusy(true);
        setError(null);
        const draft = await persistDraft(true);
        if (draft) {
            setConflict(null);
            setFlash(t('forms.editor.conflict.kept', { version: draft.version }));
        }
        setBusy(false);
    }

    function reloadTheirs() {
        setConflict(null);
        setFlash(null);
        setAttempt((n) => n + 1);
    }

    async function discard() {
        setBusy(true);
        setError(null);
        setFlash(null);
        try {
            if (hasDraft) {
                await apiFetch(`/forms/${form.id}/draft?clubId=${clubId}`, { method: 'DELETE' });
                changedRef.current = true;
                setAttempt((n) => n + 1);
                setFlash(t('forms.editor.discarded'));
            } else {
                dispatch({ type: 'reset', name: base.name, fields: [...base.fields], privacyNotice: base.privacyNotice });
                setFlash(t('forms.editor.changesDiscarded'));
            }
            setConfirm(null);
        } catch (err) {
            setConfirm(null);
            reportFailure(err);
        } finally {
            setBusy(false);
        }
    }

    async function archive() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/forms/${form.id}/archive?clubId=${clubId}`, { method: 'POST', body: {} });
            onDirtyChange(false);
            onBack(true);
        } catch (err) {
            setConfirm(null);
            reportFailure(err);
            setBusy(false);
        }
    }

    async function removeField(index: number) {
        const field = state.fields[index]!;
        const label = fieldTitle(field, t('forms.editor.field.untitled'));
        const dependents = dependentsOf(state.fields, field.key).map((f) => fieldTitle(f, f.key));
        const ok = await ask({
            title: t('forms.editor.field.deleteTitle'),
            body: (
                <>
                    <p>{t('forms.editor.field.deleteConfirm', { label })}</p>
                    {dependents.length > 0 && <p className="mt-2 font-medium">{t('forms.editor.field.deleteDependents', { fields: dependents.join(', ') })}</p>}
                </>
            ),
            confirmLabel: t('forms.editor.field.deleteSubmit'),
            danger: true,
        });
        if (ok) dispatch({ type: 'remove', index });
    }

    async function moveField(index: number, direction: 'up' | 'down') {
        const field = state.fields[index]!;
        const label = fieldTitle(field, t('forms.editor.field.untitled'));
        const lost = conditionsLostByMove(state.fields, index, direction).map((f) => fieldTitle(f, f.key));
        if (lost.length > 0) {
            const ok = await ask({
                title: t('forms.editor.field.moveTitle'),
                body: t('forms.editor.field.moveConditions', { label, fields: lost.join(', ') }),
                confirmLabel: t('forms.editor.field.moveSubmit'),
            });
            if (!ok) return;
        }
        const position = direction === 'up' ? index : index + 2;
        dispatch({ type: 'move', index, direction });
        setMoved({ uid: field.uid ?? '', direction, text: t('forms.editor.field.moved', { label, position, count: state.fields.length }) });
    }

    function goToField(key: string) {
        const index = state.fields.findIndex((f) => f.key === key);
        if (index < 0) return;
        setPublishOpen(false);
        setEditing(index);
    }

    function addPrivacyBlock() {
        const field: FormField = { ...newField('info', state.fields.map((f) => f.key)), key: uniqueKey('datenschutz', state.fields.map((f) => f.key)), label: t('forms.editor.preset.privacyTitle'), infoKind: 'privacy_notice' };
        dispatch({ type: 'add', field });
    }
    function addConsent() {
        const field: FormField = { ...newField('consent', state.fields.map((f) => f.key)), label: t('forms.editor.preset.consentLabel'), required: true };
        dispatch({ type: 'add', field });
    }

    async function insertTemplate() {
        if (state.privacyNotice.trim() !== '' && !(await ask({ title: t('forms.editor.privacy.replaceTitle'), body: t('forms.editor.privacy.replaceConfirm'), confirmLabel: t('forms.editor.privacy.replaceSubmit') }))) return;
        dispatch({ type: 'setPrivacyNotice', privacyNotice: t('forms.editor.privacy.template') });
    }

    function mappingChip(field: FormField): string | null {
        if (field.mapsTo) return t('forms.editor.list.mapsTo', { target: t(`forms.review.target.${field.mapsTo}`) });
        if (field.customField) {
            const def = customFields.find((c) => c.key === field.customField);
            return t('forms.editor.list.mapsToCustom', { name: def?.label ?? field.customField });
        }
        return null;
    }

    const editingField = editing === null ? null : editing === 'new' ? null : (state.fields[editing] ?? null);
    const publishedLabel = published ? t('forms.editor.status.published', { version: published.version, date: formatDate(published.publishedAt, language) }) : t('forms.editor.status.unpublished');

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => void leave()} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('forms.editor.back')}
                </button>
                <div className="flex flex-wrap items-center gap-2" aria-live="polite">
                    <span className={chip}>{publishedLabel}</span>
                    {hasDraft && <span className={chip}>{t('forms.editor.status.draft', { version: detail.draft!.version })}</span>}
                    {dirty && (
                        <span className={warnChip}>
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {t('forms.editor.status.unsaved')}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground" role="note">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="space-y-1">
                    <p className="font-semibold">{t('forms.editor.immutable.title')}</p>
                    <p>{t('forms.editor.immutable.body')}</p>
                </div>
            </div>

            <div>
                <label htmlFor="form-editor-name" className="block text-xs font-semibold text-muted-foreground">
                    {t('forms.editor.name')}
                </label>
                <input
                    id="form-editor-name"
                    value={state.name}
                    maxLength={MAX_FORM_NAME}
                    aria-invalid={nameInvalid || undefined}
                    aria-describedby={nameInvalid ? 'form-editor-name-err' : undefined}
                    onChange={(e) => dispatch({ type: 'setName', name: e.target.value })}
                    className={`mt-1 sm:max-w-md ${inputClass}`}
                />
                {nameIssue && (
                    <p id="form-editor-name-err" role="alert" className="mt-1 text-xs text-destructive">
                        {t(nameIssue.code === 'name_missing' ? 'forms.editor.checks.name' : 'forms.editor.checks.nameText')}
                    </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{purpose === 'aufnahme' ? t('forms.editor.purpose.aufnahme.hint') : t('forms.editor.purpose.austritt.hint')}</p>
            </div>

            {(flash || error) && (
                <div>
                    {flash && (
                        <p role="status" className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground">
                            {flash}
                        </p>
                    )}
                    {error && (
                        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                            <p>{error}</p>
                            {serverProblems && serverProblems.length > 0 && (
                                <div className="mt-2 text-foreground">
                                    <ProblemList problems={serverProblems} onGoToField={goToField} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="min-w-0 space-y-4">
                    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="form-editor-fields">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 id="form-editor-fields" className="text-sm font-bold text-foreground">
                                {t('forms.editor.fields.title', { count: fieldCount, max: MAX_FIELDS })}
                            </h3>
                            <button type="button" disabled={fieldCount >= MAX_FIELDS} onClick={() => setEditing('new')} className={`${primaryButtonClass} inline-flex items-center gap-1.5`}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {t('forms.editor.field.add')}
                            </button>
                        </div>

                        <p className="sr-only" role="status" aria-live="polite">
                            {moved?.text ?? ''}
                        </p>

                        {state.undo && (
                            <div role="status" className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/50 p-2 text-xs text-foreground">
                                <p>{state.undo.kind === 'remove' ? t('forms.editor.undo.removed', { label: fieldTitle({ key: state.undo.keys[0] ?? '', label: state.undo.label }, t('forms.editor.field.untitled')) }) : t('forms.editor.undo.moved', { label: fieldTitle({ key: state.undo.keys[0] ?? '', label: state.undo.label }, t('forms.editor.field.untitled')) })}</p>
                                <button type="button" onClick={() => dispatch({ type: 'undo' })} className="shrink-0 font-semibold text-primary underline">
                                    {t('forms.editor.undo.action')}
                                </button>
                            </div>
                        )}

                        {state.droppedConditions.length > 0 && (
                            <div role="status" className="mb-3 flex items-start justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
                                <p>
                                    {t('forms.editor.droppedConditions', {
                                        fields: state.droppedConditions.map((k) => fieldTitle(state.fields.find((f) => f.key === k) ?? { key: k, label: '' }, k)).join(', '),
                                    })}
                                </p>
                                <button type="button" onClick={() => dispatch({ type: 'ackDropped' })} className="shrink-0 font-semibold underline">
                                    {t('forms.editor.droppedConditions.ok')}
                                </button>
                            </div>
                        )}

                        {fieldCount === 0 ? (
                            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('forms.editor.fields.empty')}</p>
                        ) : (
                            <ol className="space-y-2">
                                {state.fields.map((field, index) => {
                                    const title = fieldTitle(field, t('forms.editor.field.untitled'));
                                    const map = mappingChip(field);
                                    return (
                                        <li key={field.uid ?? `${field.key}-${index}`} className="rounded-lg border border-border bg-background p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="break-words text-sm font-semibold text-foreground">
                                                        <span className="mr-1.5 text-xs font-normal text-muted-foreground">{index + 1}.</span>
                                                        {field.label.trim() === '' ? <em className="font-normal text-muted-foreground">{title}</em> : title}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                        <span className={chip}>{t(`forms.editor.type.${field.type}`)}</span>
                                                        {field.required && <span className={chip}>{t('forms.required')}</span>}
                                                        {field.sensitive && (
                                                            <span className={`${chip} gap-1`}>
                                                                <Lock className="h-3 w-3" aria-hidden="true" />
                                                                {t('forms.editor.list.sensitive')}
                                                            </span>
                                                        )}
                                                        {field.visibleIf && <span className={chip}>{t('forms.editor.list.conditional')}</span>}
                                                        {map && <span className={chip}>{map}</span>}
                                                        {locked.has(field.key) && <span className={chip}>{t('forms.editor.list.live')}</span>}
                                                        {problemKeys.has(field.key) && <span className={warnChip}>{t('forms.editor.list.incomplete')}</span>}
                                                        <code className="text-xs text-muted-foreground">{field.key}</code>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-0.5">
                                                    <button
                                                        type="button"
                                                        id={`mv-${field.uid}-up`}
                                                        disabled={!canMove(index, fieldCount, 'up')}
                                                        onClick={() => void moveField(index, 'up')}
                                                        aria-label={t('forms.editor.field.up', { label: title })}
                                                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                                                    >
                                                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        id={`mv-${field.uid}-down`}
                                                        disabled={!canMove(index, fieldCount, 'down')}
                                                        onClick={() => void moveField(index, 'down')}
                                                        aria-label={t('forms.editor.field.down', { label: title })}
                                                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                                                    >
                                                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditing(index)}
                                                        aria-label={t('forms.editor.field.editNamed', { label: title })}
                                                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    >
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void removeField(index)}
                                                        aria-label={t('forms.editor.field.deleteNamed', { label: title })}
                                                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </section>

                    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="form-editor-privacy">
                        <h3 id="form-editor-privacy" className="text-sm font-bold text-foreground">
                            {t('forms.editor.privacy.title')}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">{purpose === 'aufnahme' ? t('forms.editor.privacy.hintAufnahme') : t('forms.editor.privacy.hintAustritt')}</p>
                        <textarea
                            aria-labelledby="form-editor-privacy"
                            rows={8}
                            maxLength={MAX_PRIVACY_NOTICE}
                            value={state.privacyNotice}
                            aria-invalid={privacyIssue ? true : undefined}
                            aria-describedby={privacyIssue ? 'form-editor-privacy-err' : undefined}
                            onChange={(e) => dispatch({ type: 'setPrivacyNotice', privacyNotice: e.target.value })}
                            className={`mt-2 ${inputClass}`}
                        />
                        {privacyIssue && (
                            <p id="form-editor-privacy-err" role="alert" className="mt-1 text-xs text-destructive">
                                {t('forms.editor.privacy.invalid')}
                            </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                            <button type="button" onClick={() => void insertTemplate()} className={secondaryButtonClass}>
                                {t('forms.editor.privacy.insertTemplate')}
                            </button>
                            <span className="text-xs text-muted-foreground">{t('forms.editor.privacy.count', { count: state.privacyNotice.length, max: MAX_PRIVACY_NOTICE })}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{t('forms.editor.privacy.plain')}</p>
                    </section>

                    {(describedShape.length > 0 || describedChecks.length > 0) && (
                        <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="form-editor-checks">
                            <h3 id="form-editor-checks" className="text-sm font-bold text-foreground">
                                {t('forms.editor.checks.title')}
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">{t('forms.editor.checks.hint')}</p>
                            <div className="mt-2 space-y-2">
                                
                                <ProblemList problems={[...describedShape, ...describedChecks]} onGoToField={goToField} goLabel={t('forms.editor.problem.goto')} />
                                {checks.some((p) => p.code === 'privacy_notice_missing') && (
                                    <button type="button" onClick={addPrivacyBlock} className={secondaryButtonClass}>
                                        {t('forms.editor.preset.addPrivacy')}
                                    </button>
                                )}{' '}
                                {checks.some((p) => p.code === 'required_consent_missing') && (
                                    <button type="button" onClick={addConsent} className={secondaryButtonClass}>
                                        {t('forms.editor.preset.addConsent')}
                                    </button>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <section className="min-w-0 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4 lg:self-start" aria-labelledby="form-editor-preview">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 id="form-editor-preview" className="text-sm font-bold text-foreground">
                            {t('forms.editor.preview.title')}
                        </h3>
                        <button type="button" onClick={() => setPreviewAnswers({})} className="text-xs font-semibold text-primary underline">
                            {t('forms.editor.preview.reset')}
                        </button>
                    </div>
                    <p className="mb-3 text-xs text-muted-foreground">{t('forms.editor.preview.hint')}</p>
                    {fieldCount === 0 && state.privacyNotice.trim() === '' ? (
                        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('forms.editor.preview.empty')}</p>
                    ) : (
                        <div className="max-h-[70vh] overflow-y-auto pr-1">
                            <FormRenderer
                                fields={previewFields(state.fields, categories)}
                                privacyNotice={state.privacyNotice.trim() === '' ? null : state.privacyNotice}
                                answers={previewAnswers}
                                onChange={(key, value) => setPreviewAnswers((a) => ({ ...a, [key]: value }))}
                                idPrefix="form-preview"
                            />
                        </div>
                    )}
                </section>
            </div>

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
                <button type="button" onClick={() => void save()} disabled={busy || saveBlocked || (!dirty && hasDraft)} className={primaryButtonClass}>
                    {t('forms.editor.save')}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setPublishError(null);
                        setServerProblems(null);
                        setPublishOpen(true);
                    }}
                    disabled={busy || saveBlocked || (!hasDraft && !dirty)}
                    className={secondaryButtonClass}
                >
                    {t('forms.editor.publish')}
                </button>
                <button type="button" onClick={() => setConfirm('discard')} disabled={busy || (!hasDraft && !dirty)} className={secondaryButtonClass}>
                    {hasDraft ? t('forms.editor.discardDraft') : t('forms.editor.discardChanges')}
                </button>
                <button type="button" onClick={() => setVersionsOpen(true)} className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}>
                    <History className="h-4 w-4" aria-hidden="true" />
                    {t('forms.editor.versions')}
                </button>
                <button type="button" onClick={() => setConfirm('archive')} disabled={busy} className="ml-auto rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50">
                    {t('forms.editor.archive')}
                </button>
            </div>
            {saveBlocked && (hasDraft || dirty) && <p className="text-xs text-muted-foreground">{t('forms.editor.saveBlocked')}</p>}

            {editing !== null && (
                <FieldEditModal
                    key={editing === 'new' ? 'new' : `${editing}-${editingField?.key ?? ''}`}
                    field={editingField}
                    index={editing === 'new' ? fieldCount : editing}
                    fields={state.fields}
                    publishedFields={published?.fields ?? []}
                    purpose={purpose}
                    customFields={customFields}
                    customFieldsFailed={customFieldsFailed}
                    categories={categories}
                    onSave={(field) => {
                        if (editing === 'new') dispatch({ type: 'add', field });
                        else dispatch({ type: 'update', index: editing, field });
                        setEditing(null);
                    }}
                    onClose={() => setEditing(null)}
                />
            )}

            {publishOpen && (
                <FormPublishDialog
                    summary={summary}
                    publishedVersion={published?.version ?? null}
                    needsSave={dirty}
                    checks={describedChecks.concat(describedShape)}
                    serverProblems={serverProblems}
                    error={publishError}
                    busy={busy}
                    onConfirm={() => void publish()}
                    onGoToField={goToField}
                    onClose={() => setPublishOpen(false)}
                />
            )}

            {conflict && (
                <FormConflictDialog
                    latest={conflict.latest}
                    mine={state}
                    busy={busy}
                    onKeep={() => void keepMine()}
                    onReload={reloadTheirs}
                />
            )}

            {confirmDialog}

            {versionsOpen && <FormVersionsDialog clubId={clubId} formId={form.id} categories={categories} onClose={() => setVersionsOpen(false)} />}

            {panel === 'discard' && (
                <Modal
                    open
                    onClose={busy ? () => {} : () => setConfirm(null)}
                    title={hasDraft ? t('forms.editor.discardDraft.title') : t('forms.editor.discardChanges.title')}
                    footer={
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setConfirm(null)} disabled={busy} className={secondaryButtonClass}>
                                {t('forms.editor.publish.cancel')}
                            </button>
                            <button type="button" onClick={() => void discard()} disabled={busy} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">
                                {hasDraft ? t('forms.editor.discardDraft') : t('forms.editor.discardChanges')}
                            </button>
                        </div>
                    }
                >
                    <p className="text-sm text-foreground">{hasDraft ? t('forms.editor.discardDraft.body') : t('forms.editor.discardChanges.body')}</p>
                </Modal>
            )}

            {panel === 'archive' && (
                <Modal
                    open
                    onClose={busy ? () => {} : () => setConfirm(null)}
                    title={t('forms.editor.archive.title')}
                    footer={
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setConfirm(null)} disabled={busy} className={secondaryButtonClass}>
                                {t('forms.editor.publish.cancel')}
                            </button>
                            <button type="button" onClick={() => void archive()} disabled={busy} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">
                                {t('forms.editor.archive.confirm')}
                            </button>
                        </div>
                    }
                >
                    <p className="text-sm text-foreground">{purpose === 'aufnahme' ? t('forms.editor.archive.bodyAufnahme') : t('forms.editor.archive.bodyAustritt')}</p>
                    {dirty && <p className="mt-2 text-sm text-muted-foreground">{t('forms.editor.archive.unsaved')}</p>}
                </Modal>
            )}
        </div>
    );
}
