'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Baby, Check, FileText, Lock, ShieldCheck, X } from 'lucide-react';

import AnswerList from '@/components/forms/AnswerList';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import {
    type ApplicationReview,
    type ApproveResult,
    approveBody,
    type ClubApplication,
    duplicateKindKey,
    isStaleDecision,
    mappingReasonKey,
    mappingTargetText,
    NOTE_MAX_LENGTH,
    type ReviewFile,
    rejectBody,
    reviewErrorKey,
    reviewWarningKey,
    safeDownloadName,
    shortHash,
} from '@/lib/applicationReview';
import { formatDate, inputClass, type MemberCategory, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { formatBytes } from '@/lib/formSchema';
import { fetchAuthedBlob } from '@/lib/formUpload';
import { formatBerlinDateTime } from '@/lib/keyHistory';
import { saveBlob } from '@/lib/memberCsv';

export interface DecisionOutcome {
    action: 'approved' | 'rejected';
    name: string;
    child: boolean;
    /** Answers that could not be taken over into the member record (only on approval). */
    skipped: number;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mt-5">
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <div className="mt-2">{children}</div>
        </section>
    );
}

/**
 * Review of one application (Wave 8 W4): answers rendered against the form version the person filled in, uploaded files
 * (fetched with the session -- never a raw URL), consent evidence, mapping preview, duplicate hint and warnings; the board
 * accepts (optionally overriding the category) or rejects (internal note + a message to the applicant). Protected answers
 * the caller may not read arrive redacted and are shown as such.
 */
export default function ApplicationReviewDialog({
    clubId,
    application,
    onClose,
    onDecided,
}: {
    clubId: string;
    application: ClubApplication;
    onClose: () => void;
    /** A decision went through (or turned out to be stale); the parent reloads its lists. */
    onDecided: (outcome: DecisionOutcome | null) => void;
}) {
    const { t, language } = useLanguage();
    const ids = useId();
    const [review, setReview] = useState<ApplicationReview | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [categories, setCategories] = useState<MemberCategory[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [note, setNote] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    // Another board member decided (or the applicant withdrew) meanwhile: only closing makes sense.
    const [stale, setStale] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const [fileBusy, setFileBusy] = useState<string | null>(null);
    const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
    const [preview, setPreview] = useState<{ id: string; url: string } | null>(null);
    const alive = useRef(true);
    const abort = useRef<AbortController | null>(null);
    const previewUrl = useRef<string | null>(null);
    const errorRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        alive.current = true;
        const controller = new AbortController();
        abort.current = controller;
        return () => {
            alive.current = false;
            controller.abort();
            if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: ApplicationReview }>(`/club-applications/${application.id}?clubId=${encodeURIComponent(clubId)}`)
            .then((res) => {
                if (cancelled) return;
                setReview(res.data);
                setLoadFailed(false);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });
        // Categories are only needed for the override; without them the applicant's wish is simply taken over.
        apiFetch<{ data: MemberCategory[] }>(`/club-members/categories?clubId=${encodeURIComponent(clubId)}`)
            .then((res) => {
                if (!cancelled) setCategories(res.data.filter((c) => !c.archived));
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [application.id, clubId, reloadKey]);

    const pending = review?.application.status === 'pending' && !stale;
    const subjectName = review?.subject.displayName ?? application.subjectName ?? application.name ?? '—';
    const child = (review?.application.onBehalfOf ?? application.onBehalfOf) === 'guardian';

    const wishedCategory = (() => {
        const key = review?.application.category ?? application.category;
        if (!key) return null;
        const found = categories.find((c) => c.key === key);
        if (found) return found.name;
        const text = t(`verein.category.${key}`);
        return text === `verein.category.${key}` ? key : text;
    })();

    async function decide(action: 'approve' | 'reject') {
        setBusy(true);
        setErrorKey(null);
        try {
            const url = `/club-applications/${application.id}/${action}?clubId=${encodeURIComponent(clubId)}`;
            if (action === 'approve') {
                const res = await apiFetch<{ data: ApproveResult }>(url, { method: 'POST', body: approveBody(categoryId) });
                if (!alive.current) return;
                onDecided({ action: 'approved', name: subjectName, child, skipped: res.data?.mapping?.skipped?.length ?? 0 });
            } else {
                await apiFetch(url, { method: 'POST', body: rejectBody(note, message) });
                if (!alive.current) return;
                onDecided({ action: 'rejected', name: subjectName, child, skipped: 0 });
            }
        } catch (err) {
            if (!alive.current) return;
            setErrorKey(reviewErrorKey(err));
            setBusy(false);
            setTimeout(() => errorRef.current?.focus(), 0);
            // Someone else decided (or the applicant withdrew): the list behind this dialog is stale.
            if (isStaleDecision(err)) {
                setStale(true);
                onDecided(null);
            }
        }
    }

    async function loadFile(file: ReviewFile, mode: 'download' | 'preview') {
        if (!file.path || !abort.current) return;
        setFileBusy(file.id);
        setFileErrors((e) => {
            const copy = { ...e };
            delete copy[file.id];
            return copy;
        });
        try {
            const blob = await fetchAuthedBlob(file.path, abort.current.signal);
            if (!alive.current) return;
            if (mode === 'download') {
                saveBlob(blob, safeDownloadName(file.filename, file.mimeType));
            } else if (blob.type.startsWith('image/')) {
                if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
                previewUrl.current = URL.createObjectURL(blob);
                setPreview({ id: file.id, url: previewUrl.current });
            } else {
                saveBlob(blob, safeDownloadName(file.filename, file.mimeType));
            }
        } catch (err) {
            if (!alive.current || (err instanceof DOMException && err.name === 'AbortError')) return;
            setFileErrors((e) => ({ ...e, [file.id]: t(reviewErrorKey(err)) }));
        } finally {
            if (alive.current) setFileBusy(null);
        }
    }

    function closePreview() {
        if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
        previewUrl.current = null;
        setPreview(null);
    }

    const redactedAny = review?.answers.some((a) => a.redacted) || review?.files.some((f) => f.redacted);
    const noteId = `${ids}-note`;
    const messageId = `${ids}-message`;

    const footer =
        review && pending && !stale ? (
            rejecting ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={() => setRejecting(false)} disabled={busy} className={secondaryButtonClass}>
                        {t('forms.review.reject.back')}
                    </button>
                    <button type="button" onClick={() => void decide('reject')} disabled={busy} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {busy ? t('forms.review.working') : t('forms.review.reject.confirm')}
                    </button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={() => setRejecting(true)} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.applications.reject')}
                    </button>
                    <button type="button" onClick={() => void decide('approve')} disabled={busy} className={primaryButtonClass}>
                        {busy ? t('forms.review.working') : t('verein.applications.approve')}
                    </button>
                </div>
            )
        ) : (
            <div className="flex justify-end">
                <button type="button" onClick={onClose} className={secondaryButtonClass}>
                    {t('forms.review.close')}
                </button>
            </div>
        );

    return (
        <Modal open title={t('forms.review.title', { name: subjectName })} size="lg" onClose={busy ? () => {} : onClose} footer={footer}>
            {loadFailed ? (
                <LoadError onRetry={() => setReloadKey((n) => n + 1)} />
            ) : !review ? (
                <LoadingText />
            ) : (
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {child && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                <Baby className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('forms.review.badge.child')}
                            </span>
                        )}
                        {review.application.legacy && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{t('forms.review.badge.legacy')}</span>}
                        {review.application.status !== 'pending' && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{t(`forms.review.status.${review.application.status}`)}</span>}
                    </div>

                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-semibold text-muted-foreground">{child ? t('forms.review.applicant.guardian') : t('forms.review.applicant')}</dt>
                            <dd className="break-words text-foreground">
                                {review.applicant.name || '—'}
                                <span className="block text-xs text-muted-foreground">{review.applicant.email}</span>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold text-muted-foreground">{t('forms.review.submittedAt')}</dt>
                            <dd className="text-foreground">{formatBerlinDateTime(review.application.createdAt, language)}</dd>
                        </div>
                        {child && (
                            <div>
                                <dt className="text-xs font-semibold text-muted-foreground">{t('forms.review.subject.child')}</dt>
                                <dd className="break-words text-foreground">{review.subject.displayName ?? '—'}</dd>
                            </div>
                        )}
                        <div>
                            <dt className="text-xs font-semibold text-muted-foreground">{t('forms.review.subject.age')}</dt>
                            <dd className="text-foreground">
                                {review.subject.birthDate
                                    ? `${formatDate(review.subject.birthDate, language)}${review.subject.ageYears !== null ? ` (${t('forms.review.subject.years', { n: review.subject.ageYears })})` : ''}`
                                    : review.subject.ageBand
                                      ? t(review.subject.ageBand === '<18' ? 'forms.review.subject.under18' : 'forms.review.subject.over18')
                                      : '—'}
                            </dd>
                        </div>
                    </dl>

                    {child && (
                        <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                            {t('forms.review.child.note', { guardian: review.applicant.name || review.applicant.email })}
                        </p>
                    )}

                    {review.application.legacy && <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">{t('forms.review.legacy.note')}</p>}

                    {(review.warnings.length > 0 || review.duplicates.length > 0) && (
                        <div className="mt-4 space-y-2" role="group" aria-label={t('forms.review.hints')}>
                            {review.warnings.map((w) => {
                                const key = reviewWarningKey(w);
                                return key ? (
                                    <p key={w} className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                                        {t(key)}
                                    </p>
                                ) : null;
                            })}
                            {review.duplicates.map((d) => (
                                <p key={d.clubMemberId} className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                                    <span className="min-w-0 break-words">{t('forms.review.duplicate', { name: d.displayName, reason: t(duplicateKindKey(d.matches)) })}</span>
                                </p>
                            ))}
                        </div>
                    )}

                    {redactedAny && (
                        <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
                            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            {t('forms.review.redacted.note')}
                        </p>
                    )}

                    {!review.application.legacy && (
                        <Section title={t('forms.review.answers')}>
                            {!review.answersRetained ? (
                                <p className="text-sm text-muted-foreground">{t('forms.review.answers.erased')}</p>
                            ) : review.answers.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('forms.review.answers.none')}</p>
                            ) : (
                                <AnswerList answers={review.answers} />
                            )}
                        </Section>
                    )}

                    {!review.application.legacy && (
                        <Section title={t('forms.review.files')}>
                            {review.files.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('forms.review.files.none')}</p>
                            ) : (
                                <ul className="space-y-2">
                                    {review.files.map((f) => (
                                        <li key={f.id} className="rounded-lg border border-border px-3 py-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">{f.redacted ? t('forms.review.redacted') : (f.filename ?? '—')}</p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {f.fieldLabel ?? '—'}
                                                            {f.sizeBytes !== null && ` · ${formatBytes(f.sizeBytes, language)}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                {f.path ? (
                                                    <div className="flex gap-2">
                                                        {f.kind === 'image' && (
                                                            <button
                                                                type="button"
                                                                disabled={fileBusy === f.id}
                                                                onClick={() => (preview?.id === f.id ? closePreview() : void loadFile(f, 'preview'))}
                                                                className={secondaryButtonClass}
                                                            >
                                                                {preview?.id === f.id ? t('forms.review.file.hide') : t('forms.review.file.show')}
                                                            </button>
                                                        )}
                                                        <button type="button" disabled={fileBusy === f.id} onClick={() => void loadFile(f, 'download')} className={secondaryButtonClass}>
                                                            {fileBusy === f.id ? t('forms.review.working') : t('forms.review.file.download')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {t('forms.review.file.protected')}
                                                    </span>
                                                )}
                                            </div>
                                            {preview?.id === f.id && (
                                                // eslint-disable-next-line @next/next/no-img-element -- blob URL of an authenticated fetch
                                                <img src={preview.url} alt={f.fieldLabel ?? f.filename ?? ''} className="mt-2 max-h-72 w-auto max-w-full rounded-lg border border-border object-contain" />
                                            )}
                                            {fileErrors[f.id] && (
                                                <p role="alert" className="mt-1 text-xs text-destructive">
                                                    {fileErrors[f.id]}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    )}

                    <Section title={t('forms.review.consent')}>
                        {review.consent ? (
                            <div className="rounded-lg border border-border p-3 text-sm text-foreground">
                                <p className="flex items-center gap-2 font-medium">
                                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                    {review.consent.consentFieldKeys.length > 0 ? t('forms.review.consent.given') : t('forms.review.consent.notGiven')}
                                </p>
                                <ul className="mt-2 space-y-1">
                                    {review.consent.fields.map((f) => (
                                        <li key={f.key} className="flex items-start gap-2">
                                            {f.given ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />}
                                            <span className="min-w-0 break-words">
                                                {f.label}
                                                <span className="sr-only"> – {t(f.given ? 'forms.review.yes' : 'forms.review.no')}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                                    <div>
                                        <dt className="inline font-semibold">{t('forms.review.consent.by')}: </dt>
                                        <dd className="inline">
                                            {review.consent.givenBy.name || '—'} ({t(review.consent.role === 'guardian' ? 'forms.review.consent.role.guardian' : 'forms.review.consent.role.self')})
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="inline font-semibold">{t('forms.review.consent.at')}: </dt>
                                        <dd className="inline">{review.consent.consentedAt ? formatBerlinDateTime(review.consent.consentedAt, language) : '—'}</dd>
                                    </div>
                                    <div>
                                        <dt className="inline font-semibold">{t('forms.review.consent.notice')}: </dt>
                                        <dd className="inline">{t(review.consent.privacyNoticeShown ? 'forms.review.yes' : 'forms.review.no')}</dd>
                                    </div>
                                    <div>
                                        <dt className="inline font-semibold">{t('forms.review.consent.version')}: </dt>
                                        <dd className="inline">
                                            {review.form ? `${review.form.version} · ` : ''}
                                            <span className="font-mono">{shortHash(review.consent.textSha256)}</span>
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">{t('forms.review.consent.none')}</p>
                        )}
                    </Section>

                    {pending && review.mapping.preview && review.mapping.entries.length > 0 && (
                        <Section title={t('forms.review.mapping')}>
                            <p className="mb-2 text-xs text-muted-foreground">{t('forms.review.mapping.hint')}</p>
                            <ul className="space-y-1.5">
                                {review.mapping.entries.map((e) => {
                                    const target = mappingTargetText(e, t);
                                    return (
                                        <li key={e.fieldKey} className="flex items-start gap-2 text-sm">
                                            {e.willApply ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                                            <span className="min-w-0 break-words text-foreground">
                                                {e.fieldLabel} →{' '}
                                                {target ? (e.willApply ? t('forms.review.mapping.as', { target }) : t('forms.review.mapping.not', { target, reason: t(mappingReasonKey(e.reason)) })) : t('forms.review.mapping.reason.unknown_target')}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Section>
                    )}

                    {review.decision && !pending && (
                        <Section title={t('forms.review.decision')}>
                            <dl className="space-y-1 text-sm text-foreground">
                                {review.decision.decidedAt && (
                                    <div>
                                        <dt className="inline font-semibold">{t('forms.review.decision.at')}: </dt>
                                        <dd className="inline">{formatBerlinDateTime(review.decision.decidedAt, language)}</dd>
                                    </div>
                                )}
                                {review.decision.internalNote && (
                                    <div>
                                        <dt className="font-semibold">{t('forms.review.note.label')}</dt>
                                        <dd className="whitespace-pre-line break-words text-muted-foreground">{review.decision.internalNote}</dd>
                                    </div>
                                )}
                                {review.decision.decisionNote && (
                                    <div>
                                        <dt className="font-semibold">{t('forms.review.message.label')}</dt>
                                        <dd className="whitespace-pre-line break-words text-muted-foreground">{review.decision.decisionNote}</dd>
                                    </div>
                                )}
                            </dl>
                        </Section>
                    )}

                    {pending && !rejecting && (
                        <Section title={t('forms.review.category')}>
                            <label htmlFor={`${ids}-category`} className="block text-xs font-semibold text-muted-foreground">
                                {t('forms.review.category.label')}
                            </label>
                            <select id={`${ids}-category`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={busy} className={`mt-1 ${inputClass} sm:w-auto`}>
                                <option value="">{wishedCategory ? t('forms.review.category.keep', { name: wishedCategory }) : t('forms.review.category.keepNone')}</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </Section>
                    )}

                    {pending && rejecting && (
                        <Section title={t('forms.review.reject.title')}>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor={messageId} className="block text-sm font-semibold text-foreground">
                                        {t('forms.review.message.label')}
                                    </label>
                                    <p id={`${messageId}-hint`} className="mt-0.5 text-xs text-muted-foreground">
                                        {t('forms.review.message.hint')}
                                    </p>
                                    <textarea
                                        id={messageId}
                                        aria-describedby={`${messageId}-hint`}
                                        rows={3}
                                        maxLength={NOTE_MAX_LENGTH}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        disabled={busy}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor={noteId} className="block text-sm font-semibold text-foreground">
                                        {t('forms.review.note.label')}
                                    </label>
                                    <p id={`${noteId}-hint`} className="mt-0.5 text-xs text-muted-foreground">
                                        {t('forms.review.note.hint')}
                                    </p>
                                    <textarea
                                        id={noteId}
                                        aria-describedby={`${noteId}-hint`}
                                        rows={2}
                                        maxLength={NOTE_MAX_LENGTH}
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        disabled={busy}
                                        className={`mt-1 ${inputClass}`}
                                    />
                                </div>
                            </div>
                        </Section>
                    )}

                    {errorKey && (
                        <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 text-sm text-destructive focus:outline-none">
                            {t(errorKey)}
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}
