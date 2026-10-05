'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Trash2 } from 'lucide-react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    ALLOWED_DOCUMENT_MIME_TYPES,
    CLAIMED_ROLES,
    DOCUMENT_KINDS,
    LEGAL_FORMS,
    LIMITS,
    QUALIFYING_KINDS,
    MAX_DOCUMENTS,
    MAX_DOCUMENT_BYTES,
    inputClass,
    isHttpUrl,
    type ClaimedRole,
    type ClubRegistration,
    type DocumentKind,
    type LegalForm,
    type RegistrationNotice,
    type RegistrationDocument,
} from '@/components/verein/clubRegistration';

type Step = 1 | 2 | 3;

interface QueuedFile {
    id: number;
    file: File;
    kind: DocumentKind;
    status: 'idle' | 'uploading' | 'error';
    error?: string;
}

const primaryButton = 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50';
const secondaryButton = 'rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50';

function formatSize(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Wizard "Verein gruenden": 1 Vereinsdaten -> 2 Nachweise -> 3 Pruefen & absenden.
 * The draft lives on the server: step 1 creates it (POST /club-registrations, or PATCHes an
 * existing draft/needs_info registration), step 2 uploads/deletes documents, step 3 PATCHes the
 * claimed role if changed and submits. The slug is never asked for -- it is generated on approval.
 * `onDone` fires after a successful submit or when the server reports a conflict (409: open registration
 * exists / registration no longer editable) -- with a `notice` in the latter case.
 */
export default function ClubRegistrationWizard({
    initial,
    onCancel,
    onDone,
}: {
    initial: ClubRegistration | null;
    onCancel: () => void;
    onDone: (notice?: RegistrationNotice) => Promise<void> | void;
}) {
    const { t } = useLanguage();
    const [reg, setReg] = useState<ClubRegistration | null>(initial);
    const [step, setStep] = useState<Step>(1);

    const [clubName, setClubName] = useState(initial?.clubName ?? '');
    const [legalForm, setLegalForm] = useState<LegalForm>(initial?.legalForm ?? 'e_v');
    const [registerCourt, setRegisterCourt] = useState(initial?.registerCourt ?? '');
    const [registerNumber, setRegisterNumber] = useState(initial?.registerNumber ?? '');
    const [street, setStreet] = useState(initial?.street ?? '');
    const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
    const [city, setCity] = useState(initial?.city ?? '');
    const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? '');
    const [claimedRole, setClaimedRole] = useState<ClaimedRole>(initial?.claimedRole ?? 'vorsitz');
    const [confirmed, setConfirmed] = useState(false);

    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const nextQueueId = useRef(1);
    const fileInput = useRef<HTMLInputElement>(null);

    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isEv = legalForm === 'e_v';
    const qualifying = QUALIFYING_KINDS[legalForm];
    const qualifyingText = qualifying.map((k) => t(`verein.create.docs.kind.${k}`)).join(', ');

    // Backend messages are English; ApiError text is only shown for cases without a dedicated key.
    function errorMessage(err: unknown): string {
        return err instanceof ApiError && err.message ? err.message : t('verein.create.err.generic');
    }

    // Upload errors (422/413/415) come with raw English backend messages -> map to translated keys.
    function uploadErrorMessage(err: unknown): string {
        if (!(err instanceof ApiError)) return t('verein.create.upload.err.generic');
        const m = err.message;
        if (err.status === 413 || /exceeds maximum size/i.test(m)) return t('verein.create.upload.err.size');
        if (err.status === 415 || /unsupported content type|does not match/i.test(m)) return t('verein.create.upload.err.type');
        if (/at most \d+ documents/i.test(m)) return t('verein.create.upload.err.count', { max: MAX_DOCUMENTS });
        if (/empty/i.test(m)) return t('verein.create.upload.err.empty');
        if (err.status === 429) return t('verein.create.upload.err.rate');
        return t('verein.create.upload.err.generic');
    }
    const documents = reg?.documents ?? [];
    const fileSlotsLeft = MAX_DOCUMENTS - documents.length - queue.length;

    // --- step 1: save draft -------------------------------------------------------------------

    function buildPayload(forPatch: boolean) {
        // On PATCH a cleared optional field has to be sent as null, otherwise the old value would stay.
        const optional = (value: string, previous: string | null | undefined) => {
            const trimmed = value.trim();
            if (trimmed) return trimmed;
            return forPatch && previous ? null : undefined;
        };
        return {
            clubName: clubName.trim(),
            legalForm,
            registerCourt: isEv ? optional(registerCourt, reg?.registerCourt) : optional('', reg?.registerCourt),
            registerNumber: isEv ? optional(registerNumber, reg?.registerNumber) : optional('', reg?.registerNumber),
            street: street.trim(),
            postalCode: postalCode.trim(),
            city: city.trim(),
            websiteUrl: optional(websiteUrl, reg?.websiteUrl),
            claimedRole,
        };
    }

    async function handleSaveStep1(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const missingBase = [clubName, street, postalCode, city].some((v) => !v.trim());
        if (missingBase || (isEv && (!registerCourt.trim() || !registerNumber.trim()))) {
            setError(t(missingBase ? 'verein.create.err.required' : 'verein.create.err.register'));
            return;
        }
        const inRange = (v: string, min: number, max: number) => v.trim().length >= min && v.trim().length <= max;
        if (
            !inRange(clubName, LIMITS.clubName.min, LIMITS.clubName.max) ||
            !inRange(postalCode, LIMITS.postalCode.min, LIMITS.postalCode.max) ||
            !inRange(street, 1, LIMITS.street.max) ||
            !inRange(city, 1, LIMITS.city.max) ||
            registerCourt.trim().length > LIMITS.registerCourt.max ||
            registerNumber.trim().length > LIMITS.registerNumber.max
        ) {
            setError(t('verein.create.err.limits'));
            return;
        }
        if (websiteUrl.trim() && (websiteUrl.trim().length > LIMITS.websiteUrl.max || !isHttpUrl(websiteUrl.trim()))) {
            setError(t('verein.create.err.website'));
            return;
        }
        setBusy(true);
        try {
            if (reg) {
                const { data } = await apiFetch<{ data: { registration: ClubRegistration } }>(`/club-registrations/${reg.id}`, {
                    method: 'PATCH',
                    body: buildPayload(true),
                });
                setReg(data.registration);
            } else {
                const { data } = await apiFetch<{ data: { registration: ClubRegistration } }>('/club-registrations', {
                    method: 'POST',
                    body: buildPayload(false),
                });
                setReg(data.registration);
            }
            setStep(2);
        } catch (err) {
            // 409 on POST = the user already has an open registration; on PATCH = it is no longer editable.
            // Either way hand over to the parent, which reloads /mine and tells the user.
            if (err instanceof ApiError && err.status === 409) {
                await Promise.resolve(onDone(reg ? 'locked' : 'open')).catch(() => {});
                return;
            }
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    }

    // --- step 2: documents --------------------------------------------------------------------

    function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (files.length === 0) return;
        setError(null);

        const problems: string[] = [];
        const accepted: QueuedFile[] = [];
        let slots = fileSlotsLeft;
        for (const file of files) {
            if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
                problems.push(t('verein.create.docs.err.type', { name: file.name }));
            } else if (file.size > MAX_DOCUMENT_BYTES) {
                problems.push(t('verein.create.docs.err.size', { name: file.name }));
            } else if (slots <= 0) {
                problems.push(t('verein.create.docs.err.count', { max: MAX_DOCUMENTS }));
                break;
            } else {
                slots -= 1;
                accepted.push({ id: nextQueueId.current++, file, kind: qualifying[0] ?? 'sonstiges', status: 'idle' });
            }
        }
        if (accepted.length > 0) setQueue((q) => [...q, ...accepted]);
        if (problems.length > 0) setError(problems.join(' '));
    }

    function patchQueueItem(id: number, patch: Partial<QueuedFile>) {
        setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    }

    async function handleUpload() {
        if (!reg) return;
        setError(null);
        setUploading(true);
        const registrationId = reg.id;
        // Sequential on purpose: keeps the per-file status readable and the 5-file cap race-free.
        for (const item of queue.filter((q) => q.status !== 'uploading')) {
            patchQueueItem(item.id, { status: 'uploading', error: undefined });
            try {
                const body = new FormData();
                body.append('file', item.file);
                body.append('kind', item.kind);
                const { data } = await apiFetch<{ data: { document: RegistrationDocument } }>(
                    `/club-registrations/${registrationId}/documents`,
                    { method: 'POST', body },
                );
                setReg((r) => (r ? { ...r, documents: [...r.documents, data.document] } : r));
                setQueue((q) => q.filter((x) => x.id !== item.id));
            } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                    setUploading(false);
                    await Promise.resolve(onDone('locked')).catch(() => {});
                    return;
                }
                patchQueueItem(item.id, { status: 'error', error: uploadErrorMessage(err) });
            }
        }
        setUploading(false);
    }

    async function handleDeleteDocument(docId: string) {
        if (!reg) return;
        setError(null);
        setDeletingId(docId);
        try {
            await apiFetch(`/club-registrations/${reg.id}/documents/${docId}`, { method: 'DELETE' });
            setReg((r) => (r ? { ...r, documents: r.documents.filter((d) => d.id !== docId) } : r));
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                await Promise.resolve(onDone('locked')).catch(() => {});
                return;
            }
            setError(errorMessage(err));
        } finally {
            setDeletingId(null);
        }
    }

    function handleStep2Next() {
        setError(null);
        if (queue.length > 0) {
            setError(t('verein.create.docs.err.queued'));
            return;
        }
        if (!documents.some((d) => qualifying.includes(d.kind))) {
            setError(t(documents.length === 0 ? 'verein.create.docs.err.none' : 'verein.create.docs.err.qualifying', { kinds: qualifyingText }));
            return;
        }
        setStep(3);
    }

    // --- step 3: submit -----------------------------------------------------------------------

    async function handleSubmit() {
        if (!reg) return;
        setError(null);
        if (!confirmed) {
            setError(t('verein.create.err.confirm'));
            return;
        }
        setBusy(true);
        try {
            if (claimedRole !== reg.claimedRole) {
                const { data } = await apiFetch<{ data: { registration: ClubRegistration } }>(`/club-registrations/${reg.id}`, {
                    method: 'PATCH',
                    body: { claimedRole },
                });
                setReg(data.registration);
            }
            await apiFetch<{ data: { registration: ClubRegistration } }>(`/club-registrations/${reg.id}/submit`, { method: 'POST' });
        } catch (err) {
            if (err instanceof ApiError && err.status === 422) {
                // 422 covers every validation failure; only the missing-proof one has a dedicated text.
                setError(/proof document/i.test(err.message) ? t('verein.create.docs.err.qualifying', { kinds: qualifyingText }) : t('verein.create.err.invalid'));
            } else if (err instanceof ApiError && err.status === 409) {
                if (/already exists/i.test(err.message)) {
                    // Duplicate of an approved club.
                    setError(t('verein.create.err.exists'));
                } else {
                    // Already submitted / no longer editable: reload the real state instead of showing a wrong reason.
                    setBusy(false);
                    await Promise.resolve(onDone('locked')).catch(() => {});
                    return;
                }
            } else setError(errorMessage(err));
            setBusy(false);
            return;
        }
        // Submitted. A failed refresh afterwards must not look like a failed submit.
        try {
            await onDone();
        } catch {
            // The parent shows the stale view until the next reload.
        } finally {
            setBusy(false);
        }
    }

    // --- render -------------------------------------------------------------------------------

    const stepLabels: Record<Step, string> = {
        1: t('verein.create.step.1'),
        2: t('verein.create.step.2'),
        3: t('verein.create.step.3'),
    };

    return (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground">{t('verein.create.card.title')}</h2>
                <button type="button" onClick={onCancel} disabled={busy || uploading} className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50">
                    {t('verein.create.cancel')}
                </button>
            </div>

            <ol className="mt-4 flex flex-wrap gap-2" aria-label={t('verein.create.step.progress', { current: step, total: 3 })}>
                {([1, 2, 3] as const).map((n) => (
                    <li
                        key={n}
                        aria-current={step === n ? 'step' : undefined}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            step === n ? 'border-primary bg-primary text-primary-foreground' : n < step ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                        }`}
                    >
                        {n}. {stepLabels[n]}
                    </li>
                ))}
            </ol>

            {initial?.status === 'needs_info' && initial.reviewNote && (
                <div className="mt-4 rounded-lg border border-border bg-muted/50 px-3 py-2">
                    <p className="text-xs font-semibold text-muted-foreground">{t('verein.create.status.note')}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{initial.reviewNote}</p>
                </div>
            )}

            {step === 1 && (
                <form onSubmit={(e) => void handleSaveStep1(e)} className="mt-5 space-y-4">
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.create.field.name')}
                        <input value={clubName} onChange={(e) => setClubName(e.target.value)} required minLength={LIMITS.clubName.min} maxLength={LIMITS.clubName.max} className={inputClass} />
                    </label>

                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">{t('verein.create.field.legalForm')}</p>
                        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={t('verein.create.field.legalForm')}>
                            {LEGAL_FORMS.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    role="radio"
                                    aria-checked={legalForm === f}
                                    onClick={() => setLegalForm(f)}
                                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                        legalForm === f ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'
                                    }`}
                                >
                                    {t(`verein.create.legalForm.${f}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isEv && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="block text-xs font-semibold text-muted-foreground">
                                {t('verein.create.field.registerCourt')}
                                <input
                                    value={registerCourt}
                                    onChange={(e) => setRegisterCourt(e.target.value)}
                                    required
                                    maxLength={LIMITS.registerCourt.max}
                                    placeholder={t('verein.create.field.registerCourt.placeholder')}
                                    className={inputClass}
                                />
                            </label>
                            <label className="block text-xs font-semibold text-muted-foreground">
                                {t('verein.create.field.registerNumber')}
                                <input
                                    value={registerNumber}
                                    onChange={(e) => setRegisterNumber(e.target.value)}
                                    required
                                    maxLength={LIMITS.registerNumber.max}
                                    placeholder="VR 12345"
                                    className={inputClass}
                                />
                            </label>
                        </div>
                    )}

                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.create.field.street')}
                        <input value={street} onChange={(e) => setStreet(e.target.value)} required maxLength={LIMITS.street.max} autoComplete="street-address" className={inputClass} />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="block text-xs font-semibold text-muted-foreground">
                            {t('verein.create.field.postalCode')}
                            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required minLength={LIMITS.postalCode.min} maxLength={LIMITS.postalCode.max} autoComplete="postal-code" className={inputClass} />
                        </label>
                        <label className="block text-xs font-semibold text-muted-foreground sm:col-span-2">
                            {t('verein.create.field.city')}
                            <input value={city} onChange={(e) => setCity(e.target.value)} required maxLength={LIMITS.city.max} autoComplete="address-level2" className={inputClass} />
                        </label>
                    </div>
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.create.field.website')} ({t('verein.join.optional')})
                        <input type="url" maxLength={LIMITS.websiteUrl.max} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" className={inputClass} />
                    </label>

                    <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t('verein.create.slug.hint')}</p>

                    {error && (
                        <p className="text-sm text-destructive" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={busy} className={primaryButton}>
                            {busy ? t('verein.create.saving') : t('verein.create.next')}
                        </button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <div className="mt-5">
                    <h3 className="text-sm font-bold text-foreground">{t('verein.create.docs.title')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.create.docs.hint', { max: MAX_DOCUMENTS })}</p>
                    <p className="mt-1 text-sm text-foreground">{t('verein.create.docs.qualifying', { kinds: qualifyingText })}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('verein.create.docs.private')}</p>

                    {documents.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">{t('verein.create.docs.empty')}</p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {documents.map((d) => (
                                <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-foreground">{d.filename}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t(`verein.create.docs.kind.${d.kind}`)} · {formatSize(d.sizeBytes)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteDocument(d.id)}
                                        disabled={deletingId === d.id || uploading}
                                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                                        aria-label={t('verein.create.docs.delete')}
                                    >
                                        {deletingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {queue.length > 0 && (
                        <ul className="mt-4 space-y-2">
                            {queue.map((q) => (
                                <li key={q.id} className="rounded-lg border border-dashed border-border px-3 py-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm text-foreground">{q.file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatSize(q.file.size)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={q.kind}
                                                onChange={(e) => patchQueueItem(q.id, { kind: e.target.value as DocumentKind })}
                                                disabled={q.status === 'uploading'}
                                                aria-label={t('verein.create.docs.kindLabel')}
                                                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                                            >
                                                {DOCUMENT_KINDS.map((k) => (
                                                    <option key={k} value={k}>
                                                        {t(`verein.create.docs.kind.${k}`)}
                                                    </option>
                                                ))}
                                            </select>
                                            {q.status === 'uploading' ? (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    {t('verein.create.docs.uploading')}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setQueue((list) => list.filter((x) => x.id !== q.id))}
                                                    disabled={uploading}
                                                    className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                                                >
                                                    {t('verein.create.docs.remove')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {q.status === 'error' && q.error && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {t('verein.create.docs.err.upload')}: {q.error}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <input
                        ref={fileInput}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={handleFilesChosen}
                        className="hidden"
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading || fileSlotsLeft <= 0} className={secondaryButton}>
                            {t('verein.create.docs.choose')}
                        </button>
                        {queue.length > 0 && (
                            <button type="button" onClick={() => void handleUpload()} disabled={uploading} className={primaryButton}>
                                {uploading ? t('verein.create.docs.uploading') : t('verein.create.docs.upload')}
                            </button>
                        )}
                        <span className="text-xs text-muted-foreground">
                            {t('verein.create.docs.count', { count: documents.length + queue.length, max: MAX_DOCUMENTS })}
                        </span>
                    </div>

                    {error && (
                        <p className="mt-3 text-sm text-destructive" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setError(null); setStep(1); }} disabled={uploading} className={secondaryButton}>
                            {t('verein.create.back')}
                        </button>
                        <button type="button" onClick={handleStep2Next} disabled={uploading} className={primaryButton}>
                            {t('verein.create.next')}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="mt-5">
                    <h3 className="text-sm font-bold text-foreground">{t('verein.create.summary.title')}</h3>
                    <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                        <dt className="text-muted-foreground">{t('verein.create.field.name')}</dt>
                        <dd className="text-foreground">{clubName.trim()}</dd>
                        <dt className="text-muted-foreground">{t('verein.create.field.legalForm')}</dt>
                        <dd className="text-foreground">{t(`verein.create.legalForm.${legalForm}`)}</dd>
                        {isEv && (
                            <>
                                <dt className="text-muted-foreground">{t('verein.create.field.registerCourt')}</dt>
                                <dd className="text-foreground">{registerCourt.trim()}</dd>
                                <dt className="text-muted-foreground">{t('verein.create.field.registerNumber')}</dt>
                                <dd className="text-foreground">{registerNumber.trim()}</dd>
                            </>
                        )}
                        <dt className="text-muted-foreground">{t('verein.create.summary.address')}</dt>
                        <dd className="text-foreground">
                            {street.trim()}, {postalCode.trim()} {city.trim()}
                        </dd>
                        {websiteUrl.trim() && (
                            <>
                                <dt className="text-muted-foreground">{t('verein.create.field.website')}</dt>
                                <dd className="break-all text-foreground">{websiteUrl.trim()}</dd>
                            </>
                        )}
                        <dt className="text-muted-foreground">{t('verein.create.summary.documents')}</dt>
                        <dd className="text-foreground">
                            <ul className="space-y-0.5">
                                {documents.map((d) => (
                                    <li key={d.id}>
                                        {d.filename} <span className="text-muted-foreground">({t(`verein.create.docs.kind.${d.kind}`)})</span>
                                    </li>
                                ))}
                            </ul>
                        </dd>
                    </dl>

                    <p className="mt-5 text-xs font-semibold text-muted-foreground">{t('verein.create.role.title')}</p>
                    <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={t('verein.create.role.title')}>
                        {CLAIMED_ROLES.map((r) => (
                            <button
                                key={r}
                                type="button"
                                role="radio"
                                aria-checked={claimedRole === r}
                                onClick={() => setClaimedRole(r)}
                                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                    claimedRole === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'
                                }`}
                            >
                                {t(`verein.role.${r}`)}
                            </button>
                        ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t('verein.create.role.hint')}</p>

                    <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t('verein.create.slug.hint')}</p>

                    <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                        <span>{t('verein.create.confirm')}</span>
                    </label>

                    {error && (
                        <p className="mt-3 text-sm text-destructive" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setError(null); setStep(2); }} disabled={busy} className={secondaryButton}>
                            {t('verein.create.back')}
                        </button>
                        <button type="button" onClick={() => void handleSubmit()} disabled={busy || !confirmed} className={primaryButton}>
                            {busy ? t('verein.create.saving') : t('verein.create.submit')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
