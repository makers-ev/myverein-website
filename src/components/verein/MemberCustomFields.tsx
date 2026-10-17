'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

import FormRenderer, { focusField } from '@/components/forms/FormRenderer';
import ExpiryBadge, { EnteredByNote } from '@/components/verein/ExpiryBadge';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/components/useConfirm';
import { useUnsavedGuard } from '@/lib/useUnsavedGuard';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDate, primaryButtonClass } from '@/lib/clubMembers';
import { asExpiry } from '@/lib/credentials';
import { customFieldErrorKey, displayValue, type MemberCustomField, partitionFields, toFormField, valuesPatch, valuesToAnswers } from '@/lib/customFields';
import { type Answers, type FieldErrorCode, fieldErrorsFromError, validateAnswers } from '@/lib/formSchema';

interface Props {
    clubId: string;
    /** `me` = the caller's own record (`PATCH`), otherwise the `club_members.id` of a member (`PUT`, board). */
    target: string;
    /** Heading level text; defaults to the generic custom fields heading. */
    title?: string;
    /** The caller may not read protected fields (`members:read_sensitive` missing): a note says that more may exist. */
    showSensitiveNote?: boolean;
    /** Reports unsaved edits to the surrounding dialog. */
    onDirtyChange?: (dirty: boolean) => void;
    /** Show everything as plain values (details for people without `members:write`); nothing can be changed here. */
    readOnlyView?: boolean;
    /** Shown in place of the section when there are no fields at all (otherwise nothing renders), e.g. to point the board to the module catalog. */
    emptyHint?: React.ReactNode;
}

/**
 * Custom fields of one member (Wave 8 W5): what the caller's role may see (from `GET .../custom-fields`, the server decides) and
 * edit. Editable fields are rendered with the shared FormRenderer, the rest read-only with option labels; protected fields carry a
 * lock marker. Only changed editable values are sent. External guests (403) and clubs without visible fields render nothing.
 */
export default function MemberCustomFields({ clubId, target, title, showSensitiveNote, onDirtyChange, readOnlyView = false, emptyHint }: Props) {
    const { t, language } = useLanguage();
    const own = target === 'me';
    const path = `/club-members/${encodeURIComponent(target)}/custom-fields?clubId=${clubId}`;
    const [fields, setFields] = useState<MemberCustomField[] | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'failed' | 'hidden'>('loading');
    const [attempt, setAttempt] = useState(0);
    const [saved, setSaved] = useState<Answers>({});
    const [answers, setAnswers] = useState<Answers>({});
    const [errors, setErrors] = useState<Record<string, FieldErrorCode>>({});
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
    const alive = useRef(true);
    const { confirm, dialog } = useConfirm();

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const apply = useCallback((list: MemberCustomField[]) => {
        const next = valuesToAnswers(list);
        setFields(list);
        setSaved(next);
        setAnswers(next);
        setErrors({});
    }, []);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: { fields: MemberCustomField[] } }>(path)
            .then((res) => {
                if (cancelled) return;
                apply(res.data.fields);
                setState('ready');
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                // Guests and members whose record is not readable have no custom fields at all: nothing to show, no error.
                setState(err instanceof ApiError && (err.status === 403 || err.status === 404) ? 'hidden' : 'failed');
            });
        return () => {
            cancelled = true;
        };
    }, [path, attempt, apply]);

    const parts = useMemo(() => partitionFields(fields ?? [], readOnlyView, own), [fields, readOnlyView, own]);
    const { editable, readOnly } = parts;
    const renderFields = useMemo(() => editable.map(toFormField), [editable]);
    const patch = readOnlyView ? null : valuesPatch(fields ?? [], saved, answers, own);
    const dirty = patch !== null;
    useEffect(() => {
        onDirtyChange?.(dirty);
    }, [dirty, onDirtyChange]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
    // Reload / close / Back with unsaved custom field edits asks first (tab switches are guarded by the page via onDirtyChange).
    useUnsavedGuard(dirty, () => confirm({ title: t('forms.editor.leave.title'), body: t('forms.cf.values.leaveConfirm'), confirmLabel: t('forms.editor.leave.confirm'), danger: true }));

    if (state === 'loading') return <LoadingText />;
    if (state === 'hidden') return null;
    if (state === 'failed') return <LoadError onRetry={() => { setState('loading'); setAttempt((n) => n + 1); }} />;
    if (fields && fields.length === 0 && !showSensitiveNote && emptyHint) {
        return (
            <section className="rounded-lg border border-border p-3" aria-label={title ?? t('forms.cf.values.title')}>
                <h3 className="text-sm font-bold text-foreground">{title ?? t('forms.cf.values.title')}</h3>
                {emptyHint}
            </section>
        );
    }
    if (!fields || (fields.length === 0 && !showSensitiveNote)) return null;

    async function save() {
        if (!patch || busy) return;
        const local = validateAnswers(renderFields, answers, { mode: 'draft' });
        if (Object.keys(local).length > 0) {
            setErrors(local);
            setStatus({ ok: false, text: t('forms.err.fieldsInvalid') });
            focusField(`cf-${target}`, Object.keys(local)[0]!);
            return;
        }
        setBusy(true);
        setStatus(null);
        setErrors({});
        try {
            const res = await apiFetch<{ data: { fields: MemberCustomField[] } }>(path, { method: own ? 'PATCH' : 'PUT', body: { values: patch } });
            if (!alive.current) return;
            apply(res.data.fields);
            setStatus({ ok: true, text: t('forms.cf.values.saved') });
        } catch (err) {
            if (!alive.current) return;
            const fieldErrors = fieldErrorsFromError(err);
            if (fieldErrors) setErrors(fieldErrors);
            setStatus({ ok: false, text: t(customFieldErrorKey(err)) });
        } finally {
            if (alive.current) setBusy(false);
        }
    }

    const texts = {
        yes: t('forms.review.yes'),
        no: t('forms.review.no'),
        formatDate: (v: string) => formatDate(v, language),
        credential: {
            level: (label: string) => t('forms.cred.summary.level', { level: label }),
            obtained: (date: string) => t('forms.cred.summary.obtained', { date }),
            until: (date: string) => t('forms.cred.summary.until', { date }),
        },
    };

    return (
        <section className="rounded-lg border border-border p-3" aria-label={title ?? t('forms.cf.values.title')}>
            <h3 className="text-sm font-bold text-foreground">{title ?? t('forms.cf.values.title')}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{own ? t('forms.cf.values.hintOwn') : t('forms.cf.values.hint')}</p>

            {fields.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{t('forms.cf.values.none')}</p>}

            {readOnly.length > 0 && (
                <dl className="mt-3 space-y-2">
                    {readOnly.map((f) => {
                        const text = displayValue(f, texts);
                        return (
                            <div key={f.id} className="rounded-lg border border-border px-3 py-2">
                                <dt className="flex flex-wrap items-center gap-1.5 break-words text-xs font-semibold text-muted-foreground">
                                    {f.label}
                                    {f.sensitive && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                                            <Lock className="h-3 w-3" aria-hidden="true" />
                                            {t('forms.cf.list.sensitive')}
                                        </span>
                                    )}
                                </dt>
                                {f.helpText && <dd className="mt-0.5 whitespace-pre-line break-words text-xs text-muted-foreground">{f.helpText}</dd>}
                                <dd className={`mt-0.5 whitespace-pre-line break-words text-sm ${text === null ? 'text-muted-foreground' : 'text-foreground'}`}>{text ?? '—'}</dd>
                                {f.type === 'credential' && text !== null && (
                                    <dd className="mt-1 flex flex-wrap items-center gap-2">
                                        <ExpiryBadge expiry={asExpiry(f.expiry)} />
                                        <EnteredByNote enteredBy={f.enteredBy} />
                                    </dd>
                                )}
                                {!readOnlyView && !own && !f.editable && <dd className="mt-0.5 text-xs text-muted-foreground">{f.sensitive ? t('forms.cf.values.readonlySensitive') : f.editableBy === 'vorstand' ? t('forms.cf.values.readonlyBoard') : t('forms.cf.values.readonlySelf')}</dd>}
                                {!readOnlyView && own && f.editableBy === 'vorstand' && <dd className="mt-0.5 text-xs text-muted-foreground">{t('forms.cf.values.readonlyBoard')}</dd>}
                            </div>
                        );
                    })}
                </dl>
            )}

            {editable.length > 0 && (
                <div className="mt-3 space-y-3">
                    {editable.some((f) => f.sensitive) && (
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {t('forms.cf.values.sensitiveEdit', { fields: editable.filter((f) => f.sensitive).map((f) => f.label).join(', ') })}
                        </p>
                    )}
                    <FormRenderer
                        fields={renderFields}
                        answers={answers}
                        errors={errors}
                        idPrefix={`cf-${target}`}
                        disabled={busy}
                        onChange={(key, value) => {
                            setAnswers((a) => ({ ...a, [key]: value }));
                            setErrors((e) => {
                                if (!(key in e)) return e;
                                const copy = { ...e };
                                delete copy[key];
                                return copy;
                            });
                            setStatus(null);
                        }}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => void save()} disabled={busy || !dirty} className={primaryButtonClass}>
                            {t('forms.cf.values.save')}
                        </button>
                        {status && (
                            <span role={status.ok ? 'status' : 'alert'} className={`text-sm ${status.ok ? 'text-success' : 'text-destructive'}`}>
                                {status.text}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {editable.length === 0 && status && (
                <p role="status" className="mt-2 text-sm text-success">
                    {status.text}
                </p>
            )}

            {showSensitiveNote && <p className="mt-3 text-xs text-muted-foreground">{t('forms.cf.values.sensitiveHidden')}</p>}
            {dialog}
        </section>
    );
}
