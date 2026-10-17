'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { formatDate, inputClass, memberErrorKey, secondaryButtonClass, todayIso } from '@/lib/clubMembers';
import { apiFetch } from '@/lib/api-client';
import { isMinorBirthDate } from '@/lib/memberPhoto';
import {
    buildPatch,
    changedKeys,
    draftFromMember,
    expectedDisplayName,
    firstErrorKey,
    knownKeys,
    mergeServerUpdate,
    serverFieldErrors,
    validateDraft,
    type ProfileDraft,
    type ProfileErrors,
    type ProfileKey,
} from '@/lib/profileForm';
import { useUnsavedGuard } from '@/lib/useUnsavedGuard';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import MemberPhotoSection from '@/components/verein/MemberPhotoSection';
import ExitSection from '@/components/verein/ExitSection';
import ChildrenFields from '@/components/verein/ChildrenFields';
import MemberCustomFields from '@/components/verein/MemberCustomFields';

export interface OwnMembership {
    id: string;
    /** `club_members.id` of the caller's own row. */
    clubMemberId?: string;
    /** Display name (what the club sees). */
    name: string | null;
    email: string | null;
    category: string | null;
    joinedAt: string | null;
    /** Better Auth `member.id` of the account (what exit requests record as requester). */
    memberId?: string | null;
    /** Organization role(s) of the account (`owner` cannot cancel through the exit workflow). */
    orgRole?: string | null;
    effectiveStatus?: string;
    memberNumber?: string | null;
    /** Absent on backends that do not know the separate name fields yet: read as empty. */
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    /** Short-lived signed URL of the own photo (never stored); `null`/absent = initials. */
    photoUrl?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    roles: { id: string; roleType: string }[];
    permissions: string[];
}

interface FieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    hint?: string;
    type?: 'text' | 'email' | 'tel' | 'date';
    inputMode?: 'email' | 'tel';
    autoComplete?: string;
    maxLength?: number;
    max?: string;
    required?: boolean;
}

/** Labelled input with a hint and a per-field error (announced via `aria-describedby`/`aria-invalid`). */
function TextField({ id, label, value, onChange, error, hint, type = 'text', inputMode, autoComplete, maxLength, max, required }: FieldProps) {
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
                {label}
            </label>
            <input
                id={id}
                name={id}
                type={type}
                value={value}
                inputMode={inputMode}
                autoComplete={autoComplete}
                maxLength={maxLength}
                max={max}
                required={required}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                spellCheck={type === 'text' ? undefined : false}
                autoCapitalize={type === 'email' ? 'none' : undefined}
                onChange={(e) => onChange(e.target.value)}
                className={`${inputClass} ${error ? 'border-destructive' : ''}`.trim()}
            />
            {hint && !error ? (
                <p id={hintId} className="mt-1 text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
            {error ? (
                <p id={errorId} className="mt-1 text-xs text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h3 id={id} className="text-sm font-bold text-foreground">
            {children}
        </h3>
    );
}

/**
 * Self-service profile (Selbstauskunft): `PATCH /club-members/me` with name, display name, contact, address, birth date and
 * emergency contact. Only changed fields are sent (cleared optional fields as `null`), sensitive fields only appear when the
 * backend delivered them, `422 details.fields` are shown per field and unsaved edits are guarded (reload/back via
 * `useUnsavedGuard`, tab switch and the link to the settings here, tab switch confirmation in the page).
 */
/**
 * "Meine Zusatzangaben" without any field: only people with `forms:write` get a pointer to the module catalog (everybody else sees
 * nothing, so members are not confused by something they cannot change).
 */
export function NoModulesHint({ onOpen }: { onOpen: () => void }) {
    const { t } = useLanguage();
    return (
        <div className="mt-2">
            <p className="text-sm text-muted-foreground">{t('forms.cf.values.noModules')}</p>
            <button type="button" onClick={onOpen} className={`${secondaryButtonClass} mt-2`}>
                {t('forms.cf.values.noModules.open')}
            </button>
        </div>
    );
}

export default function ProfilTab({ me, clubId, onSaved, onPhotoExpired, onDirtyChange, onOpenCustomFields }: { me: OwnMembership; clubId: string; onSaved: () => void; onPhotoExpired?: () => void; onDirtyChange?: (dirty: boolean) => void; onOpenCustomFields?: () => void }) {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { confirm, dialog } = useConfirm();
    const formId = useId();

    const keys = useMemo(() => knownKeys(me), [me]);
    const visible = (key: ProfileKey) => keys.has(key);

    const [base, setBase] = useState<ProfileDraft>(() => draftFromMember(me));
    const [draft, setDraft] = useState<ProfileDraft>(base);
    const [syncedMe, setSyncedMe] = useState(me);
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
    const [ownCustomDirty, setCustomDirty] = useState(false);
    const [childrenDirty, setChildrenDirty] = useState(false);
    const customDirty = ownCustomDirty || childrenDirty;

    // Fresh server values (after the page re-fetched) flow into untouched fields; anything typed meanwhile is kept.
    if (me !== syncedMe) {
        const next = draftFromMember(me);
        setDraft(mergeServerUpdate(draft, base, next));
        setBase(next);
        setSyncedMe(me);
    }

    const dirty = changedKeys(draft, base, keys).length > 0;
    useEffect(() => {
        onDirtyChange?.(dirty || customDirty);
    }, [dirty, customDirty, onDirtyChange]);
    useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

    const leaveBody = t('verein.profil.leaveConfirm');
    const askLeave = () => confirm({ title: t('forms.editor.leave.title'), body: leaveBody, confirmLabel: t('forms.editor.leave.confirm'), danger: true });
    // Reload / close / Back; the custom fields below bring their own guard, only one may be active at a time.
    useUnsavedGuard(dirty && !customDirty, askLeave);

    function update(key: ProfileKey, value: string) {
        setDraft((prev) => ({ ...prev, [key]: value }));
        setStatus(null);
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    }

    function err(key: ProfileKey): string | undefined {
        const e = errors[key];
        return e ? t(e.key, e.params) : undefined;
    }

    function focusField(key: ProfileKey) {
        document.getElementById(`${formId}-${key}`)?.focus();
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        const local = validateDraft(draft, keys);
        setErrors(local);
        const firstLocal = firstErrorKey(local);
        if (firstLocal) {
            setStatus({ ok: false, text: t('verein.err.invalid') });
            focusField(firstLocal);
            return;
        }
        const patch = buildPatch(draft, base, keys);
        if (Object.keys(patch).length === 0) return;
        setSaving(true);
        setStatus(null);
        try {
            const res = await apiFetch<{ data?: Partial<OwnMembership> }>(`/club-members/me?clubId=${encodeURIComponent(clubId)}`, { method: 'PATCH', body: patch });
            if (!res.data) throw new Error('Request failed');
            const next = draftFromMember({ ...me, ...res.data });
            setDraft((cur) => mergeServerUpdate(cur, base, next));
            setBase(next);
            setStatus({ ok: true, text: t('verein.profil.saved') });
            onSaved();
        } catch (error) {
            const fieldErrors = serverFieldErrors(error);
            if (fieldErrors) {
                setErrors(fieldErrors);
                const first = firstErrorKey(fieldErrors);
                if (first) focusField(first);
            }
            setStatus({ ok: false, text: t(memberErrorKey(error)) });
        } finally {
            setSaving(false);
        }
    }

    function handleDiscard() {
        setDraft(base);
        setErrors({});
        setStatus(null);
    }

    async function openSettings(e: React.MouseEvent<HTMLAnchorElement>) {
        if (!(dirty || customDirty)) return;
        e.preventDefault();
        if (await askLeave()) router.push('/settings');
    }

    const patchPreview = buildPatch(draft, base, keys);
    const derived = expectedDisplayName(draft, base, patchPreview);
    const minor = isMinorBirthDate(base.birthDate || null);
    const showContact = visible('contactEmail') || visible('phone');
    const showAddress = visible('street') || visible('postalCode') || visible('city');
    const showEmergency = visible('emergencyContactName') || visible('emergencyContactPhone');
    const fid = (key: ProfileKey) => `${formId}-${key}`;

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{me.name ?? '—'}</p>
                        <p className="truncate text-sm text-muted-foreground">{me.email}</p>
                    </div>
                    <div className="mt-4">
                        <MemberPhotoSection
                            clubId={clubId}
                            target="me"
                            name={me.name ?? me.email}
                            photoUrl={me.photoUrl}
                            birthDate={me.birthDate}
                            onChanged={() => onSaved()}
                            onExpired={onPhotoExpired}
                        />
                    </div>
                    <dl className="mt-5 space-y-3 text-sm">
                        <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">{t('verein.members.table.category')}</dt>
                            <dd className="font-medium text-foreground">{me.category ? t(`verein.category.${me.category}`) : '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">{t('verein.members.table.joined')}</dt>
                            <dd className="font-medium text-foreground">{formatDate(me.joinedAt, language)}</dd>
                        </div>
                        {me.memberNumber ? (
                            <div className="flex justify-between gap-2">
                                <dt className="text-muted-foreground">{t('verein.profil.memberNumber')}</dt>
                                <dd className="font-medium text-foreground">{me.memberNumber}</dd>
                            </div>
                        ) : null}
                    </dl>
                    {me.roles.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {me.roles.map((r) => (
                                <span key={r.id} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                    {t(`verein.role.${r.roleType}`)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <form onSubmit={(e) => void handleSave(e)} noValidate className="min-w-0 rounded-xl border border-border bg-card p-5">
                    <h2 className="text-sm font-bold text-foreground">{t('verein.profil.title')}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{t('verein.profil.hint')}</p>
                    {minor ? (
                        <p role="note" className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                            {t('verein.profil.minorHint')}
                        </p>
                    ) : null}

                    <section aria-labelledby={`${formId}-name`} className="mt-5 space-y-3">
                        <SectionTitle id={`${formId}-name`}>{t('verein.profil.section.name')}</SectionTitle>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <TextField id={fid('firstName')} label={t('verein.profil.firstName')} value={draft.firstName} onChange={(v) => update('firstName', v)} error={err('firstName')} autoComplete="given-name" maxLength={100} />
                            <TextField id={fid('lastName')} label={t('verein.profil.lastName')} value={draft.lastName} onChange={(v) => update('lastName', v)} error={err('lastName')} autoComplete="family-name" maxLength={100} />
                        </div>
                        <TextField
                            id={fid('displayName')}
                            label={t('verein.profil.displayName')}
                            value={draft.displayName}
                            onChange={(v) => update('displayName', v)}
                            error={err('displayName')}
                            hint={t('verein.profil.displayName.hint')}
                            autoComplete="nickname"
                            maxLength={200}
                            required
                        />
                        {derived ? (
                            <p className="text-xs text-muted-foreground" aria-live="polite">
                                {t('verein.profil.displayName.derived', { name: derived })}
                            </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                            {t('verein.profil.accountHint')}{' '}
                            <Link href="/settings" onClick={(e) => void openSettings(e)} className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                                {t('verein.profil.accountLink')}
                            </Link>
                        </p>
                    </section>

                    {showContact ? (
                        <section aria-labelledby={`${formId}-contact`} className="mt-6 space-y-3">
                            <SectionTitle id={`${formId}-contact`}>{t('verein.profil.section.contact')}</SectionTitle>
                            <p className="text-xs text-muted-foreground">{t('verein.profil.contact.hint')}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {visible('contactEmail') ? (
                                    <TextField id={fid('contactEmail')} label={t('verein.profil.contactEmail')} type="email" inputMode="email" autoComplete="email" value={draft.contactEmail} onChange={(v) => update('contactEmail', v)} error={err('contactEmail')} maxLength={320} />
                                ) : null}
                                {visible('phone') ? (
                                    <TextField id={fid('phone')} label={t('verein.profil.phone')} type="tel" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(v) => update('phone', v)} error={err('phone')} maxLength={50} />
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {showAddress ? (
                        <section aria-labelledby={`${formId}-address`} className="mt-6 space-y-3">
                            <SectionTitle id={`${formId}-address`}>{t('verein.profil.section.address')}</SectionTitle>
                            {visible('street') ? (
                                <TextField id={fid('street')} label={t('verein.profil.street')} autoComplete="street-address" value={draft.street} onChange={(v) => update('street', v)} error={err('street')} maxLength={200} />
                            ) : null}
                            <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
                                {visible('postalCode') ? (
                                    <TextField id={fid('postalCode')} label={t('verein.profil.postalCode')} autoComplete="postal-code" value={draft.postalCode} onChange={(v) => update('postalCode', v)} error={err('postalCode')} maxLength={12} />
                                ) : null}
                                {visible('city') ? (
                                    <TextField id={fid('city')} label={t('verein.profil.city')} autoComplete="address-level2" value={draft.city} onChange={(v) => update('city', v)} error={err('city')} maxLength={120} />
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {visible('birthDate') ? (
                        <section aria-labelledby={`${formId}-birth`} className="mt-6 space-y-3">
                            <SectionTitle id={`${formId}-birth`}>{t('verein.profil.birthDate')}</SectionTitle>
                            <TextField id={fid('birthDate')} label={t('verein.profil.birthDate')} type="date" autoComplete="bday" value={draft.birthDate} onChange={(v) => update('birthDate', v)} error={err('birthDate')} max={todayIso()} />
                        </section>
                    ) : null}

                    {showEmergency ? (
                        <fieldset className="mt-6 min-w-0 space-y-3 rounded-lg border border-border p-3">
                            <legend className="px-1 text-sm font-bold text-foreground">{t('verein.profil.emergency')}</legend>
                            {visible('emergencyContactName') ? (
                                <TextField id={fid('emergencyContactName')} label={t('verein.profil.emergencyName')} value={draft.emergencyContactName} onChange={(v) => update('emergencyContactName', v)} error={err('emergencyContactName')} maxLength={200} />
                            ) : null}
                            {visible('emergencyContactPhone') ? (
                                <TextField id={fid('emergencyContactPhone')} label={t('verein.profil.emergencyPhone')} type="tel" inputMode="tel" autoComplete="off" value={draft.emergencyContactPhone} onChange={(v) => update('emergencyContactPhone', v)} error={err('emergencyContactPhone')} maxLength={50} />
                            ) : null}
                        </fieldset>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={saving || !dirty}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {saving ? t('verein.profil.saving') : t('verein.profil.save')}
                        </button>
                        {dirty && !saving ? (
                            <button type="button" onClick={handleDiscard} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
                                {t('verein.profil.discard')}
                            </button>
                        ) : null}
                        <span role={status && !status.ok ? 'alert' : 'status'} className={`text-sm ${status?.ok ? 'text-success' : 'text-destructive'}`}>
                            {status?.text}
                        </span>
                    </div>
                    {dirty && !status ? <p className="mt-2 text-xs text-muted-foreground">{t('verein.profil.unsaved')}</p> : null}
                </form>
            </div>
            <MemberCustomFields clubId={clubId} target="me" title={t('forms.cf.values.titleOwn')} onDirtyChange={setCustomDirty} emptyHint={onOpenCustomFields && me.permissions.includes('forms:write') ? <NoModulesHint onOpen={onOpenCustomFields} /> : undefined} />
            <ChildrenFields clubId={clubId} onDirtyChange={setChildrenDirty} />
            <ExitSection clubId={clubId} orgRole={me.orgRole} effectiveStatus={me.effectiveStatus} onChanged={onSaved} />
            {dialog}
        </div>
    );
}
