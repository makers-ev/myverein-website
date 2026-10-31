'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import FormRenderer, { fieldDomId, focusField } from '@/components/forms/FormRenderer';
import JoinPrivacyNotice from '@/components/verein/JoinPrivacyNotice';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { findOpenDraft } from '@/lib/applicantStatus';
import { type ApplyConflict, applyConflictKind, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    type Answers,
    applyPatch,
    carryAnswers,
    diffAnswers,
    lostEntryLabels,
    mergeConcurrentEdits,
    type FieldErrorCode,
    fieldErrorKey,
    fieldErrorsFromError,
    type FormDefinition,
    type FormFile,
    type MySubmission,
    formErrorKey,
    type OnBehalfOf,
    outdatedFrom,
    type OutdatedInfo,
    type Submission,
    validateAnswers,
    visibleAnswers,
} from '@/lib/formSchema';
import { uploadSubmissionFile } from '@/lib/formUpload';
import { createSerialQueue } from '@/lib/serialQueue';

const FORM_ID_PREFIX = 'apply';
const AUTOSAVE_DELAY_MS = 800;

export interface SubmittedResult {
    submission: Submission;
    warnings: unknown[];
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type SaveOutcome = 'ok' | 'blocked' | 'failed';

interface ApplicationFormProps {
    slug: string;
    mode: OnBehalfOf;
    /** The club's currently published definition (`GET /club-forms/:slug/aufnahme`). */
    current: FormDefinition;
    /** A resumed draft with the definition it is pinned to; `outdated` = the club published a newer version meanwhile. */
    resume?: { submission: Submission; form: FormDefinition; outdated: boolean };
    /** Lets the parent wait for a pending autosave before it replaces this form (mode switch). */
    registerFlush: (flush: (() => Promise<void>) | null) => void;
    onSubmitted: (result: SubmittedResult) => void;
    /** `ALREADY_MEMBER` / `APPLICATION_PENDING`: the parent shows the matching notice. */
    onConflict: (kind: ApplyConflict) => void;
    /** The draft was discarded (withdrawn) or never existed: start over. */
    onDiscarded: () => void;
}

/**
 * The application form of one club for one applicant mode (self or child). Owns the draft: created lazily with the first
 * answer or upload, then every change is saved with a debounced `PATCH` (one request at a time through a queue, so a slow
 * save can never overwrite a newer one; what the server stored is the baseline of the next diff). `FORM_VERSION_OUTDATED`
 * re-pins the draft to the current version, keeps the answers per key and tells the person what was dropped. Client
 * validation is a convenience before submit; field errors of the server (`422 details.fields`) are shown per field.
 */
export default function ApplicationForm({ slug, mode, current, resume, registerFlush, onSubmitted, onConflict, onDiscarded }: ApplicationFormProps) {
    const { t } = useLanguage();
    const [definition, setDefinition] = useState<FormDefinition>(resume?.form ?? current);
    const [answers, setAnswers] = useState<Answers>(resume?.submission.answers ?? {});
    const [files, setFiles] = useState<FormFile[]>(resume?.submission.files ?? []);
    const [errors, setErrors] = useState<Record<string, FieldErrorCode>>({});
    const [saveState, setSaveState] = useState<SaveState>(resume ? 'saved' : 'idle');
    const [saveErrorKey, setSaveErrorKey] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ labels: string[]; version: number } | null>(null);
    const [fatalKey, setFatalKey] = useState<string | null>(null);
    const [submitErrorKey, setSubmitErrorKey] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [hasDraft, setHasDraft] = useState(Boolean(resume));
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const [discarding, setDiscarding] = useState(false);
    const noticeRef = useRef<HTMLDivElement>(null);
    // Wave 10: "Datenschutzhinweis zur Kenntnis genommen" -- information sent along with the submit, never a requirement.
    const acknowledgedRef = useRef(false);

    // Mutable truth of the autosave machinery (state is only the display of it).
    const defRef = useRef(definition);
    const answersRef = useRef(answers);
    const filesRef = useRef(files);
    const idRef = useRef<string | null>(resume?.submission.id ?? null);
    const savedRef = useRef<Answers>(resume?.submission.answers ?? {});
    // Jobs (create, patch, re-pin, submit) run strictly one after the other.
    const [enqueue] = useState(createSerialQueue);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rejectedRef = useRef(new Map<string, string>());
    const lastErrorRef = useRef<unknown>(null);
    const alive = useRef(true);
    const outdatedSeen = useRef(false);
    const latest = useRef<{ save: () => Promise<SaveOutcome>; outdated: (info: OutdatedInfo) => Promise<void> } | null>(null);
    const propsRef = useRef({ slug, mode, current, onConflict });

    function setAnswersBoth(next: Answers) {
        answersRef.current = next;
        setAnswers(next);
    }
    function setFilesBoth(update: (prev: FormFile[]) => FormFile[]) {
        filesRef.current = update(filesRef.current);
        if (alive.current) setFiles(filesRef.current);
    }
    function setDefinitionBoth(next: FormDefinition) {
        defRef.current = next;
        setDefinition(next);
    }


    /**
     * Creates the draft -- unless an open draft of the same club and mode already exists (second tab, lost state after a
     * reload): that one is resumed, so the person never ends up with two drafts. The lookup is best effort; if it fails the
     * draft is created as usual.
     */
    async function createDraft(initial: Answers): Promise<void> {
        const { slug: s, mode: m } = propsRef.current;
        let existing: MySubmission | undefined;
        try {
            const mine = await apiFetch<{ data: MySubmission[] }>('/form-submissions/mine');
            existing = findOpenDraft(mine.data, s, m);
        } catch {
            existing = undefined;
        }
        if (existing) {
            idRef.current = existing.id;
            savedRef.current = existing.answers ?? {};
            if (alive.current) setHasDraft(true);
            // What the person typed so far goes into the resumed draft; what the draft already holds shows up in the form.
            if (Object.keys(initial).length > 0) {
                const res = await apiFetch<{ data: { submission: Submission } }>(`/form-submissions/${existing.id}`, { method: 'PATCH', body: { answers: initial } });
                savedRef.current = res.data.submission.answers ?? {};
            }
            if (alive.current) setAnswersBoth({ ...savedRef.current, ...answersRef.current });
            return;
        }
        const res = await apiFetch<{ data: { submission: Submission } }>('/form-submissions', {
            method: 'POST',
            body: { clubSlug: s, formVersionId: defRef.current.formVersionId, onBehalfOf: m, ...(Object.keys(initial).length > 0 ? { answers: initial } : {}) },
        });
        idRef.current = res.data.submission.id;
        savedRef.current = res.data.submission.answers ?? {};
        if (alive.current) setHasDraft(true);
    }

    /** Sends what changed since the last successful save. Must run inside the queue. */
    async function savePending(attempt = 0): Promise<SaveOutcome> {
        const def = defRef.current;
        const all = answersRef.current;
        // Answers that fail the (mirrored) validation are not sent: one invalid entry must not block the others.
        const skip = new Set(Object.keys(validateAnswers(def.fields, all, { mode: 'draft' })));
        for (const [key, json] of [...rejectedRef.current]) {
            if (JSON.stringify(all[key]) === json) skip.add(key);
            else rejectedRef.current.delete(key);
        }
        const patch = diffAnswers(savedRef.current, visibleAnswers(def.fields, all), skip);
        if (Object.keys(patch).length === 0) {
            if (alive.current && idRef.current) setSaveState('saved');
            return 'ok';
        }
        if (alive.current) setSaveState('saving');
        try {
            if (!idRef.current) {
                await createDraft(applyPatch({}, patch));
            } else {
                const res = await apiFetch<{ data: { submission: Submission } }>(`/form-submissions/${idRef.current}`, { method: 'PATCH', body: { answers: patch } });
                savedRef.current = res.data.submission.answers ?? {};
            }
            if (alive.current) {
                setSaveState('saved');
                setSaveErrorKey(null);
            }
            return 'ok';
        } catch (err) {
            lastErrorRef.current = err;
            const conflict = applyConflictKind(err);
            if (conflict && conflict !== 'other') {
                propsRef.current.onConflict(conflict);
                return 'failed';
            }
            const outdated = outdatedFrom(err);
            if (outdated) {
                await handleOutdated(outdated);
                return 'blocked';
            }
            const fieldErrors = fieldErrorsFromError(err);
            if (fieldErrors && attempt < 2) {
                for (const key of Object.keys(fieldErrors)) rejectedRef.current.set(key, JSON.stringify(all[key]));
                if (alive.current) {
                    setErrors((e) => ({ ...e, ...fieldErrors }));
                    setSaveState('idle');
                }
                // The valid changes of the same patch still go out.
                await savePending(attempt + 1);
                return 'blocked';
            }
            if (alive.current) {
                setSaveState('error');
                setSaveErrorKey(formErrorKey(err));
            }
            return 'failed';
        }
    }

    /**
     * The club published a new version: move the draft to it (the server keeps the answers per key), keep what was typed
     * and report which answers had no place in the new form.
     */
    async function handleOutdated(info: OutdatedInfo, depth = 0): Promise<void> {
        const next = info.current;
        if (!next) {
            if (alive.current) setFatalKey('forms.apply.noForm');
            return;
        }
        const previous = defRef.current;
        const startAnswers = answersRef.current;
        const startFiles = filesRef.current;
        const local = visibleAnswers(previous.fields, startAnswers);
        const carriedLocal = carryAnswers(next.fields, local);
        let nextAnswers: Answers = carriedLocal.answers;
        let dropped = carriedLocal.dropped;
        let nextFiles: FormFile[] | null = null;
        try {
            if (idRef.current) {
                const baseline = carryAnswers(next.fields, savedRef.current).answers;
                const patch = diffAnswers(baseline, carriedLocal.answers);
                const repin = (answersPatch: Answers) =>
                    apiFetch<{ data: { submission: Submission; repinned: boolean; droppedAnswerKeys: string[] } }>(`/form-submissions/${idRef.current}`, {
                        method: 'PATCH',
                        body: { formVersionId: next.formVersionId, ...(Object.keys(answersPatch).length > 0 ? { answers: answersPatch } : {}) },
                    });
                let res;
                try {
                    res = await repin(patch);
                } catch (err) {
                    const again = outdatedFrom(err);
                    if (again && depth < 2) return handleOutdated(again, depth + 1);
                    // A local value the new field refuses must not block the move itself; it is flagged on the next save.
                    if (!fieldErrorsFromError(err)) throw err;
                    res = await repin({});
                }
                const serverDropped = res.data.droppedAnswerKeys ?? [];
                savedRef.current = res.data.submission.answers ?? {};
                nextAnswers = { ...savedRef.current, ...Object.fromEntries(Object.entries(carriedLocal.answers).filter(([k]) => !serverDropped.includes(k))) };
                dropped = [...dropped, ...serverDropped];
                nextFiles = res.data.submission.files ?? [];
            } else {
                savedRef.current = {};
            }
        } catch (err) {
            lastErrorRef.current = err;
            const conflict = applyConflictKind(err);
            if (conflict && conflict !== 'other') {
                propsRef.current.onConflict(conflict);
                return;
            }
            if (alive.current) {
                setSaveState('error');
                setSaveErrorKey(formErrorKey(err));
            }
            return;
        }
        if (!alive.current) return;
        // Whatever was typed while the request ran is kept (the state of the form may have moved on meanwhile).
        const merged = mergeConcurrentEdits(startAnswers, answersRef.current, nextAnswers, next.fields);
        const labels = lostEntryLabels({ oldFields: previous.fields, droppedKeys: dropped, finalAnswers: merged, oldFiles: startFiles, newFiles: nextFiles ?? (idRef.current ? filesRef.current : []) });
        rejectedRef.current.clear();
        outdatedSeen.current = true;
        setDefinitionBoth(next);
        setAnswersBoth(merged);
        if (nextFiles) setFilesBoth(() => nextFiles!);
        else if (!idRef.current) setFilesBoth(() => []);
        setErrors({});
        setNotice({ labels, version: next.version });
        setSaveState(idRef.current ? 'saved' : 'idle');
        // Answers the server does not have yet (no draft was created, or typing during the request) go out with the next save.
        if (Object.keys(diffAnswers(savedRef.current, visibleAnswers(next.fields, merged))).length > 0) scheduleSave();
        setTimeout(() => noticeRef.current?.focus(), 0);
    }

    useEffect(() => {
        propsRef.current = { slug, mode, current, onConflict };
        latest.current = { save: () => savePending(), outdated: (info) => handleOutdated(info) };
    });

    useEffect(() => {
        alive.current = true;
        const flush = async () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            await enqueue(() => latest.current!.save());
        };
        registerFlush(flush);
        // A resumed draft that the club re-published meanwhile moves to the current version right away.
        if (resume?.outdated) void enqueue(() => latest.current!.outdated({ current: propsRef.current.current, submissionId: resume.submission.id }));
        const timer = timerRef;
        return () => {
            alive.current = false;
            registerFlush(null);
            // Unsaved typing is not lost when the form goes away (mode switch, other club): the save still runs.
            if (timer.current) {
                clearTimeout(timer.current);
                timer.current = null;
                void enqueue(() => latest.current!.save());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only; everything else goes through refs
    }, []);

    function handleChange(key: string, value: unknown) {
        setAnswersBoth({ ...answersRef.current, [key]: value });
        setErrors((e) => {
            if (!(key in e)) return e;
            const copy = { ...e };
            delete copy[key];
            return copy;
        });
        setSubmitErrorKey(null);
        setSaveState('dirty');
        scheduleSave();
    }

    function scheduleSave() {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            void enqueue(() => latest.current!.save());
        }, AUTOSAVE_DELAY_MS);
    }

    /** A draft must exist before files can be attached; it is created from the answers so far. */
    async function ensureDraft(): Promise<string> {
        await enqueue(async () => {
            const outcome = await savePending();
            if (!idRef.current && outcome !== 'blocked') {
                try {
                    await createDraft({});
                } catch (err) {
                    lastErrorRef.current = err;
                    const outdated = outdatedFrom(err);
                    if (outdated) await handleOutdated(outdated);
                }
            }
        });
        if (!idRef.current) throw lastErrorRef.current ?? new Error('draft');
        return idRef.current;
    }

    async function uploadFile(fieldKey: string, blob: Blob, filename: string, onProgress: (percent: number | null) => void, signal: AbortSignal): Promise<void> {
        const id = await ensureDraft();
        if (signal.aborted) throw new Error('aborted');
        let file: FormFile;
        try {
            file = await uploadSubmissionFile(id, fieldKey, blob, filename, onProgress, signal);
        } catch (err) {
            const outdated = outdatedFrom(err);
            if (outdated && !signal.aborted) await enqueue(() => handleOutdated(outdated));
            throw err;
        }
        const field = defRef.current.fields.find((f) => f.key === fieldKey);
        setFilesBoth((prev) => (field?.type === 'image' ? [...prev.filter((f) => f.fieldKey !== fieldKey), file] : [...prev, file]));
        setErrors((e) => {
            if (!(fieldKey in e)) return e;
            const copy = { ...e };
            delete copy[fieldKey];
            return copy;
        });
    }

    async function removeFile(file: FormFile): Promise<void> {
        if (!idRef.current) return;
        await apiFetch(`/form-submissions/${idRef.current}/files/${file.id}`, { method: 'DELETE' });
        setFilesBoth((prev) => prev.filter((f) => f.id !== file.id));
    }

    function showFieldErrors(found: Record<string, FieldErrorCode>) {
        setErrors(found);
        const first = defRef.current.fields.find((f) => f.key in found);
        if (first) setTimeout(() => focusField(FORM_ID_PREFIX, first.key), 0);
    }

    async function submit() {
        setSubmitErrorKey(null);
        outdatedSeen.current = false;
        const def = defRef.current;
        const clientErrors = validateAnswers(def.fields, answersRef.current, { mode: 'submit', uploadedFieldKeys: new Set(filesRef.current.map((f) => f.fieldKey)) });
        if (Object.keys(clientErrors).length > 0) {
            showFieldErrors(clientErrors);
            setSubmitErrorKey('forms.apply.checkEntries');
            return;
        }
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setSubmitting(true);
        try {
            const result = await enqueue(async () => {
                const outcome = await savePending();
                if (outcome !== 'ok') return { kind: outcome } as const;
                if (!idRef.current) await createDraft({});
                const res = await apiFetch<{ data: { submission: Submission; warnings?: unknown[] } }>(`/form-submissions/${idRef.current}/submit`, { method: 'POST', body: acknowledgedRef.current ? { privacyNoticeAcknowledged: true } : {} });
                return { kind: 'done', data: res.data } as const;
            });
            if (!alive.current) return;
            if (result.kind === 'done') {
                onSubmitted({ submission: result.data.submission, warnings: result.data.warnings ?? [] });
            } else if (result.kind === 'blocked') {
                // Either the form changed (notice shown) or the server flagged fields (errors shown).
                setSubmitErrorKey(outdatedSeen.current ? 'forms.err.outdated' : 'forms.apply.checkEntries');
            } else {
                setSubmitErrorKey(formErrorKey(lastErrorRef.current));
            }
        } catch (err) {
            if (!alive.current) return;
            const conflict = applyConflictKind(err);
            if (conflict && conflict !== 'other') {
                onConflict(conflict);
                return;
            }
            const outdated = outdatedFrom(err);
            if (outdated) {
                await enqueue(() => handleOutdated(outdated));
                setSubmitErrorKey('forms.err.outdated');
                return;
            }
            const fieldErrors = fieldErrorsFromError(err);
            if (fieldErrors) showFieldErrors(fieldErrors);
            setSubmitErrorKey(formErrorKey(err));
        } finally {
            if (alive.current) setSubmitting(false);
        }
    }

    async function discard() {
        setDiscarding(true);
        setSubmitErrorKey(null);
        try {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            await enqueue(async () => {
                if (!idRef.current) return;
                try {
                    await apiFetch(`/form-submissions/${idRef.current}`, { method: 'DELETE' });
                } catch (err) {
                    // Backends without the draft DELETE route: withdrawing closes the draft (files are deleted either way).
                    if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 405)) throw err;
                    await apiFetch(`/form-submissions/${idRef.current}/withdraw`, { method: 'POST' });
                }
            });
            idRef.current = null;
            if (alive.current) onDiscarded();
        } catch (err) {
            if (alive.current) {
                setSubmitErrorKey(formErrorKey(err));
                setDiscarding(false);
            }
        }
    }

    const saveText =
        saveState === 'saving' || saveState === 'dirty'
            ? t('forms.apply.saving')
            : saveState === 'saved' && hasDraft
              ? t('forms.apply.saved')
              : saveState === 'error' && saveErrorKey
                ? t('forms.apply.saveFailed', { reason: t(saveErrorKey) })
                : '';

    // Summary of the fields with an error, in form order, with links that move focus to the field.
    const errorList = definition.fields.filter((f) => f.key in errors).map((f) => ({ key: f.key, label: f.label, code: errors[f.key]! }));

    if (fatalKey) {
        return (
            <p role="alert" className="mt-4 text-sm text-destructive">
                {t(fatalKey)}
            </p>
        );
    }

    return (
        <form
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                void submit();
            }}
            className="mt-4"
        >
            <h3 className="text-sm font-bold text-foreground">{definition.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('forms.apply.requiredLegend')}</p>

            {notice && (
                <div ref={noticeRef} tabIndex={-1} role="status" className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <p className="flex items-center gap-2 font-semibold">
                        <RefreshCw className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        {t('forms.apply.updated.title')}
                    </p>
                    <p className="mt-1">{t('forms.apply.updated.body')}</p>
                    {notice.labels.length > 0 && (
                        <>
                            <p className="mt-2 font-medium">{t('forms.apply.updated.dropped')}</p>
                            <ul className="mt-1 list-inside list-disc break-words">
                                {notice.labels.map((label) => (
                                    <li key={label}>{label}</li>
                                ))}
                            </ul>
                        </>
                    )}
                    <button type="button" onClick={() => setNotice(null)} className="mt-2 text-xs font-semibold text-primary underline">
                        {t('forms.apply.updated.dismiss')}
                    </button>
                </div>
            )}

            <div className="mt-4">
                <FormRenderer
                    fields={definition.fields}
                    privacyNotice={definition.privacyNotice}
                    answers={answers}
                    onChange={handleChange}
                    errors={errors}
                    files={files}
                    disabled={submitting || discarding}
                    idPrefix={FORM_ID_PREFIX}
                    onUploadFile={uploadFile}
                    onRemoveFile={removeFile}
                />
            </div>

            <JoinPrivacyNotice
                slug={slug}
                onAcknowledgedChange={(value) => {
                    acknowledgedRef.current = value;
                }}
            />

            <p aria-live="polite" className="mt-4 min-h-4 text-xs text-muted-foreground">
                {saveText}
            </p>
            {(submitErrorKey || errorList.length > 0) && (
                <div role="alert" className="mt-2 text-sm text-destructive">
                    {submitErrorKey && <p>{t(submitErrorKey)}</p>}
                    {errorList.length > 0 && (
                        <ul className="mt-1 list-inside list-disc">
                            {errorList.map((e) => (
                                <li key={e.key}>
                                    <a
                                        href={`#${fieldDomId(FORM_ID_PREFIX, e.key)}`}
                                        onClick={(ev) => {
                                            ev.preventDefault();
                                            focusField(FORM_ID_PREFIX, e.key);
                                        }}
                                        className="underline"
                                    >
                                        {e.label}
                                    </a>
                                    : {t(fieldErrorKey(e.code))}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="submit" disabled={submitting || discarding} className={primaryButtonClass}>
                    {submitting ? t('forms.apply.submitting') : t('verein.join.submit')}
                </button>
                {hasDraft &&
                    (confirmDiscard ? (
                        <span className="flex flex-wrap items-center gap-2 text-xs text-foreground">
                            {t('forms.apply.discard.confirm')}
                            <button type="button" disabled={discarding || submitting} onClick={() => void discard()} className="rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
                                {t('forms.apply.discard.yes')}
                            </button>
                            <button type="button" disabled={discarding} onClick={() => setConfirmDiscard(false)} className="text-xs text-muted-foreground hover:text-foreground">
                                {t('verein.roles.add.cancel')}
                            </button>
                        </span>
                    ) : (
                        <button type="button" disabled={submitting || discarding} onClick={() => setConfirmDiscard(true)} className={secondaryButtonClass}>
                            {t('forms.apply.discard')}
                        </button>
                    ))}
            </div>
        </form>
    );
}
