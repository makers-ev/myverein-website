'use client';

import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { Camera, FileText, Info, Loader2, ShieldCheck, Trash2, Upload } from 'lucide-react';

import MemberPhotoDialog from '@/components/verein/MemberPhotoDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    type Answers,
    checkFieldFile,
    type FieldErrorCode,
    fieldErrorKey,
    type FormField,
    type FormFile,
    FILE_FIELD_MAX_BYTES,
    FILE_FIELD_MIME_TYPES,
    formatBytes,
    formErrorKey,
    privacyNoticeIndex,
    visibleFields,
} from '@/lib/formSchema';
import { PHOTO_OUTPUT_SIZE } from '@/lib/memberPhoto';

export interface FormRendererProps {
    fields: FormField[];
    /** Privacy notice of the form version; shown prominently right above the first consent. */
    privacyNotice?: string | null;
    answers: Answers;
    onChange: (key: string, value: unknown) => void;
    /** Field errors by key (client validation or the server's `422 details.fields`). */
    errors?: Record<string, FieldErrorCode>;
    /** Uploaded files of the submission (all fields). */
    files?: FormFile[];
    disabled?: boolean;
    /** Prefix of the DOM ids (several renderers on one page need different ones). */
    idPrefix?: string;
    /** Uploads a file/photo; reports progress; rejects with the request error. Without it, file and image fields are not offered. */
    onUploadFile?: (fieldKey: string, file: Blob, filename: string, onProgress: (percent: number | null) => void) => Promise<void>;
    onRemoveFile?: (file: FormFile) => Promise<void>;
}

/** Copy of `record` without `key`. */
function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
    const copy = { ...record };
    delete copy[key];
    return copy;
}

/** DOM id of the control (or fieldset) of a field; used to move focus to the first error. */
export const fieldDomId = (prefix: string, key: string) => `${prefix}-${key}`;

/** Moves focus to the control of the field `key`. */
export function focusField(prefix: string, key: string): void {
    document.getElementById(fieldDomId(prefix, key))?.focus();
}

function Required({ field }: { field: FormField }) {
    const { t } = useLanguage();
    if (!field.required) return null;
    return (
        <>
            <span aria-hidden="true" className="ml-0.5 text-destructive">
                *
            </span>
            <span className="sr-only"> ({t('forms.required')})</span>
        </>
    );
}

/** Label, help text, the control and the error line of one field; wires `aria-describedby`. */
function FieldShell({
    field,
    id,
    error,
    group = false,
    extra,
    children,
}: {
    field: FormField;
    id: string;
    error?: FieldErrorCode;
    /** Controls with several inputs use a fieldset/legend instead of a label. */
    group?: boolean;
    /** Extra error text outside the validation codes (upload failures): id of its element. */
    extra?: { id: string; shown: boolean };
    children: (aria: { id: string; 'aria-describedby': string | undefined; 'aria-invalid': boolean | undefined; 'aria-required': boolean | undefined }) => React.ReactNode;
}) {
    const { t } = useLanguage();
    const helpId = `${id}-help`;
    const errId = `${id}-err`;
    const describedBy = [field.helpText ? helpId : null, error ? errId : null, extra?.shown ? extra.id : null].filter(Boolean).join(' ') || undefined;
    const aria = { id, 'aria-describedby': describedBy, 'aria-invalid': error || extra?.shown ? true : undefined, 'aria-required': field.required ? true : undefined };
    const body = (
        <>
            {field.helpText && (
                <p id={helpId} className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
                    {field.helpText}
                </p>
            )}
            <div className="mt-1.5">{children(aria)}</div>
            {error && (
                <p id={errId} className="mt-1 text-xs text-destructive">
                    {t(fieldErrorKey(error))}
                </p>
            )}
        </>
    );
    if (group) {
        return (
            <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} aria-invalid={error || extra?.shown ? true : undefined} className="min-w-0 focus:outline-none">
                <legend className="text-sm font-medium text-foreground">
                    {field.label}
                    <Required field={field} />
                </legend>
                {body}
            </fieldset>
        );
    }
    return (
        <div className="min-w-0">
            <label htmlFor={id} className="block text-sm font-medium text-foreground">
                {field.label}
                <Required field={field} />
            </label>
            {body}
        </div>
    );
}

/** Number input that keeps what is typed (`1.`, `-`) while only valid numbers reach the answers. */
function NumberInput({
    aria,
    field,
    value,
    disabled,
    onChange,
}: {
    aria: object;
    field: FormField;
    value: unknown;
    disabled?: boolean;
    onChange: (v: number | undefined) => void;
}) {
    const [text, setText] = useState(typeof value === 'number' ? String(value) : '');
    const [seen, setSeen] = useState(value);
    // An external change (re-pinned answers, reset) replaces the draft text; our own edits already match it.
    if (value !== seen) {
        setSeen(value);
        const parsed = text.trim() === '' ? undefined : Number(text);
        if (value !== parsed) setText(typeof value === 'number' ? String(value) : '');
    }
    return (
        <input
            {...aria}
            type="number"
            inputMode="decimal"
            step="any"
            min={field.validation?.min}
            max={field.validation?.max}
            value={text}
            disabled={disabled}
            onChange={(e) => {
                setText(e.target.value);
                const n = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                onChange(n !== undefined && Number.isFinite(n) ? n : undefined);
            }}
            className={inputClass}
        />
    );
}

function PrivacyBlock({ text, title }: { text: string; title?: string }) {
    const { t } = useLanguage();
    return (
        <section className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4" aria-label={title ?? t('forms.privacy.title')}>
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {title ?? t('forms.privacy.title')}
            </h3>
            {/* Plain text on purpose: texts come from the club's form definition and are never interpreted as HTML. */}
            <div tabIndex={0} role="region" aria-label={t('forms.privacy.text')} className="mt-2 max-h-64 overflow-y-auto whitespace-pre-line break-words text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {text}
            </div>
        </section>
    );
}

/**
 * Renders a form definition (Wave 8 W1): every field type, `visibleIf`, per-field errors, file and photo upload with
 * progress. A controlled component: the caller owns `answers`/`files`, validates and talks to the backend; used by the
 * application flow and meant for the exit form and the custom fields later. All text of the definition (labels, help, options,
 * privacy notice) is rendered as plain text -- there is no HTML path.
 */
export default function FormRenderer({
    fields,
    privacyNotice,
    answers,
    onChange,
    errors = {},
    files = [],
    disabled = false,
    idPrefix,
    onUploadFile,
    onRemoveFile,
}: FormRendererProps) {
    const { t, language } = useLanguage();
    const autoId = useId();
    const prefix = idPrefix ?? `ff${autoId.replace(/:/g, '')}`;
    const shown = visibleFields(fields, answers);
    const noticeAt = privacyNoticeIndex(fields, privacyNotice);

    const [uploading, setUploading] = useState<Record<string, number | null>>({});
    const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
    const [removing, setRemoving] = useState<Record<string, boolean>>({});
    const [cropField, setCropField] = useState<FormField | null>(null);
    const [previews, setPreviews] = useState<Record<string, string>>({});
    const previewsRef = useRef<Record<string, string>>({});
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        const urls = previewsRef;
        return () => {
            alive.current = false;
            Object.values(urls.current).forEach((u) => URL.revokeObjectURL(u));
        };
    }, []);

    function setPreview(key: string, blob: Blob | null) {
        const old = previewsRef.current[key];
        if (old) URL.revokeObjectURL(old);
        if (blob) previewsRef.current[key] = URL.createObjectURL(blob);
        else delete previewsRef.current[key];
        setPreviews({ ...previewsRef.current });
    }

    async function runUpload(field: FormField, blob: Blob, filename: string) {
        if (!onUploadFile) return;
        setUploadErrors((e) => omit(e, field.key));
        setUploading((u) => ({ ...u, [field.key]: 0 }));
        try {
            await onUploadFile(field.key, blob, filename, (p) => {
                if (alive.current) setUploading((u) => ({ ...u, [field.key]: p }));
            });
        } catch (err) {
            if (alive.current) {
                setUploadErrors((e) => ({ ...e, [field.key]: t(formErrorKey(err)) }));
                if (field.type === 'image') setPreview(field.key, null);
            }
        } finally {
            if (alive.current) {
                setUploading((u) => omit(u, field.key));
            }
        }
    }

    function pickDocument(field: FormField, e: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(e.target.files ?? []);
        e.target.value = '';
        const file = picked[0];
        if (!file) return;
        const problem = checkFieldFile(file);
        if (problem) {
            setUploadErrors((errs) => ({ ...errs, [field.key]: t(problem === 'file_type' ? 'forms.err.fileType' : 'forms.err.fileSize') }));
            return;
        }
        void runUpload(field, file, file.name);
    }

    async function remove(field: FormField, file: FormFile) {
        if (!onRemoveFile) return;
        setRemoving((r) => ({ ...r, [file.id]: true }));
        setUploadErrors((e) => omit(e, field.key));
        try {
            await onRemoveFile(file);
            if (field.type === 'image' && alive.current) setPreview(field.key, null);
        } catch (err) {
            if (alive.current) setUploadErrors((e) => ({ ...e, [field.key]: t(formErrorKey(err)) }));
        } finally {
            if (alive.current) {
                setRemoving((r) => omit(r, file.id));
            }
        }
    }

    function renderField(field: FormField) {
        const id = fieldDomId(prefix, field.key);
        const error = errors[field.key];
        const value = answers[field.key];
        const v = field.validation;

        switch (field.type) {
            case 'info':
                if (field.infoKind === 'privacy_notice') return <PrivacyBlock text={(field.text ?? '').trim() || privacyNotice || ''} title={field.label} />;
                return (
                    <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="font-medium">{field.label}</p>
                            {field.text && <p className="mt-1 whitespace-pre-line break-words text-muted-foreground">{field.text}</p>}
                        </div>
                    </div>
                );

            case 'text':
            case 'textarea':
                return (
                    <FieldShell field={field} id={id} error={error}>
                        {(aria) =>
                            field.type === 'textarea' ? (
                                <textarea
                                    {...aria}
                                    rows={4}
                                    maxLength={v?.maxLength ?? 5000}
                                    value={typeof value === 'string' ? value : ''}
                                    disabled={disabled}
                                    onChange={(e) => onChange(field.key, e.target.value)}
                                    className={inputClass}
                                />
                            ) : (
                                <input
                                    {...aria}
                                    type={v?.pattern === 'email' ? 'email' : v?.pattern === 'phone' ? 'tel' : 'text'}
                                    inputMode={v?.pattern === 'postal_code' ? 'numeric' : undefined}
                                    maxLength={v?.maxLength ?? 200}
                                    value={typeof value === 'string' ? value : ''}
                                    disabled={disabled}
                                    onChange={(e) => onChange(field.key, e.target.value)}
                                    className={inputClass}
                                />
                            )
                        }
                    </FieldShell>
                );

            case 'number':
                return (
                    <FieldShell field={field} id={id} error={error}>
                        {(aria) => <NumberInput aria={aria} field={field} value={value} disabled={disabled} onChange={(n) => onChange(field.key, n)} />}
                    </FieldShell>
                );

            case 'date':
                return (
                    <FieldShell field={field} id={id} error={error}>
                        {(aria) => (
                            <input
                                {...aria}
                                type="date"
                                min={v?.minDate}
                                max={v?.maxDate}
                                value={typeof value === 'string' ? value : ''}
                                disabled={disabled}
                                onChange={(e) => onChange(field.key, e.target.value)}
                                className={`${inputClass} sm:w-auto`}
                            />
                        )}
                    </FieldShell>
                );

            case 'select':
                return (
                    <FieldShell field={field} id={id} error={error}>
                        {(aria) => (
                            <select {...aria} value={typeof value === 'string' ? value : ''} disabled={disabled} onChange={(e) => onChange(field.key, e.target.value)} className={inputClass}>
                                <option value="">{t('forms.select.placeholder')}</option>
                                {(field.options ?? []).map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </FieldShell>
                );

            case 'multiselect': {
                const selected = Array.isArray(value) ? (value as unknown[]).filter((x): x is string => typeof x === 'string') : [];
                return (
                    <FieldShell field={field} id={id} error={error} group>
                        {() => (
                            <div className="space-y-1.5">
                                {(field.options ?? []).map((o) => (
                                    <label key={o.value} className="flex items-start gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(o.value)}
                                            disabled={disabled}
                                            onChange={(e) => onChange(field.key, e.target.checked ? [...selected, o.value] : selected.filter((x) => x !== o.value))}
                                            className="mt-0.5 h-4 w-4 accent-[var(--color-primary,currentColor)]"
                                        />
                                        <span className="min-w-0 break-words">{o.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </FieldShell>
                );
            }

            case 'checkbox':
            case 'consent': {
                const consent = field.type === 'consent';
                const errId = `${id}-err`;
                const helpId = `${id}-help`;
                const describedBy = [field.helpText ? helpId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;
                return (
                    <div className={consent ? 'rounded-xl border-2 border-primary/40 bg-primary/5 p-3' : ''}>
                        <label className="flex items-start gap-2.5 text-sm text-foreground">
                            <input
                                id={id}
                                type="checkbox"
                                checked={value === true}
                                disabled={disabled}
                                aria-describedby={describedBy}
                                aria-invalid={error ? true : undefined}
                                aria-required={field.required ? true : undefined}
                                onChange={(e) => onChange(field.key, e.target.checked)}
                                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-primary,currentColor)]"
                            />
                            <span className={`min-w-0 whitespace-pre-line break-words ${consent ? 'font-medium' : ''}`}>
                                {field.label}
                                <Required field={field} />
                            </span>
                        </label>
                        {field.helpText && (
                            <p id={helpId} className="mt-1 whitespace-pre-line pl-7 text-xs text-muted-foreground">
                                {field.helpText}
                            </p>
                        )}
                        {error && (
                            <p id={errId} className="mt-1 pl-7 text-xs text-destructive">
                                {t(fieldErrorKey(error))}
                            </p>
                        )}
                    </div>
                );
            }

            case 'image':
            case 'file': {
                const own = files.filter((f) => f.fieldKey === field.key);
                const busy = field.key in uploading;
                const uploadError = uploadErrors[field.key];
                const shownError = uploadError ?? (error ? t(fieldErrorKey(error)) : null);
                const image = field.type === 'image';
                const current = image ? own[0] : undefined;
                const preview = previews[field.key] ?? current?.url ?? null;
                const pickId = `${id}-pick`;
                const errId = `${id}-err`;
                const progress = uploading[field.key];
                return (
                    <FieldShell field={field} id={id} error={undefined} group extra={{ id: errId, shown: Boolean(shownError) }}>
                        {() =>
                            !onUploadFile ? (
                                <p className="text-sm text-muted-foreground">{t('forms.file.unavailable')}</p>
                            ) : (
                                <div className="space-y-2">
                                    {image ? (
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                                                {preview ? (
                                                    // eslint-disable-next-line @next/next/no-img-element -- blob/signed URL, not optimisable
                                                    <img src={preview} alt={t('forms.image.alt', { label: field.label })} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Camera className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" disabled={disabled || busy} onClick={() => setCropField(field)} className={secondaryButtonClass}>
                                                    {current ? t('forms.image.change') : t('forms.image.choose')}
                                                </button>
                                                {current && onRemoveFile && (
                                                    <button type="button" disabled={disabled || busy || removing[current.id]} onClick={() => void remove(field, current)} className={secondaryButtonClass}>
                                                        {t('forms.file.remove')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {own.length > 0 && (
                                                <ul className="space-y-1.5">
                                                    {own.map((f) => (
                                                        <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                                                            <span className="flex min-w-0 items-center gap-2">
                                                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                                <span className="truncate text-foreground">{f.filename}</span>
                                                                <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(f.sizeBytes, language)}</span>
                                                            </span>
                                                            {onRemoveFile && (
                                                                <button
                                                                    type="button"
                                                                    disabled={disabled || busy || removing[f.id]}
                                                                    onClick={() => void remove(field, f)}
                                                                    aria-label={t('forms.file.removeNamed', { name: f.filename })}
                                                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                                                                >
                                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div>
                                                <input
                                                    id={pickId}
                                                    type="file"
                                                    accept={FILE_FIELD_MIME_TYPES.join(',')}
                                                    disabled={disabled || busy}
                                                    onChange={(e) => pickDocument(field, e)}
                                                    className="peer sr-only"
                                                />
                                                <label
                                                    htmlFor={pickId}
                                                    className={`${secondaryButtonClass} cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50`}
                                                >
                                                    <Upload className="h-4 w-4" aria-hidden="true" />
                                                    {own.length > 0 ? t('forms.file.addAnother') : t('forms.file.choose')}
                                                </label>
                                                <p className="mt-1 text-xs text-muted-foreground">{t('forms.file.hint', { mb: Math.round(FILE_FIELD_MAX_BYTES / (1024 * 1024)) })}</p>
                                            </div>
                                        </>
                                    )}
                                    {busy && (
                                        <div role="status" className="space-y-1">
                                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                                {progress === null || progress === undefined ? t('forms.file.uploading') : t('forms.file.uploadingPercent', { percent: progress })}
                                            </p>
                                            {typeof progress === 'number' && (
                                                <progress value={progress} max={100} aria-label={t('forms.file.uploading')} className="h-1.5 w-full max-w-xs accent-[var(--color-primary,currentColor)]" />
                                            )}
                                        </div>
                                    )}
                                    {shownError && (
                                        <p id={errId} role="alert" className="text-xs text-destructive">
                                            {shownError}
                                        </p>
                                    )}
                                </div>
                            )
                        }
                    </FieldShell>
                );
            }

            default:
                return null;
        }
    }

    return (
        <div className="space-y-5">
            {shown.map((field) => {
                const index = fields.indexOf(field);
                return (
                    <Fragment key={field.key}>
                        {noticeAt === index && privacyNotice && <PrivacyBlock text={privacyNotice} />}
                        {renderField(field)}
                    </Fragment>
                );
            })}
            {noticeAt !== null && privacyNotice && (noticeAt >= fields.length || !shown.some((f) => fields.indexOf(f) === noticeAt)) && (
                // The anchor field is hidden or the notice goes last: still show it exactly once (never skipped).
                <PrivacyBlock text={privacyNotice} />
            )}
            {cropField && onUploadFile && (
                <MemberPhotoDialog
                    title={cropField.label}
                    hint={t('forms.image.hint')}
                    round={false}
                    maxBytes={FILE_FIELD_MAX_BYTES}
                    outputSize={PHOTO_OUTPUT_SIZE}
                    onClose={() => setCropField(null)}
                    onSave={async (jpeg) => {
                        const field = cropField;
                        setPreview(field.key, jpeg);
                        // The dialog closes right away; the upload shows its progress and errors in the field.
                        void runUpload(field, jpeg, 'foto.jpg');
                    }}
                />
            )}
        </div>
    );
}
