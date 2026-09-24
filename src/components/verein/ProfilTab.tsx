'use client';

import { useState } from 'react';
import { CalendarDays, HeartPulse, Phone, UserRound } from 'lucide-react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

export interface OwnMembership {
    id: string;
    name: string | null;
    email: string | null;
    category: string | null;
    joinedAt: string | null;
    memberNumber?: string | null;
    birthDate?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    roles: { id: string; roleType: string }[];
    permissions: string[];
}

const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';

/** Self-service Selbstauskunft: PATCH /club-members/me (birth date + emergency contact). */
export default function ProfilTab({ me, clubId, onSaved }: { me: OwnMembership; clubId: string; onSaved: () => void }) {
    const { t } = useLanguage();
    const [birthDate, setBirthDate] = useState(me.birthDate ?? '');
    const [contactName, setContactName] = useState(me.emergencyContactName ?? '');
    const [contactPhone, setContactPhone] = useState(me.emergencyContactPhone ?? '');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    const dirty =
        birthDate !== (me.birthDate ?? '') ||
        contactName !== (me.emergencyContactName ?? '') ||
        contactPhone !== (me.emergencyContactPhone ?? '');

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            await apiFetch(`/club-members/me?clubId=${clubId}`, {
                method: 'PATCH',
                body: {
                    ...(birthDate ? { birthDate } : {}),
                    emergencyContactName: contactName.trim(),
                    emergencyContactPhone: contactPhone.trim(),
                },
            });
            setStatus({ ok: true, text: t('verein.profil.saved') });
            onSaved();
        } catch (err) {
            setStatus({ ok: false, text: err instanceof ApiError ? err.message : 'Request failed' });
        } finally {
            setSaving(false);
        }
    }

    const initials = (me.name ?? me.email ?? '?')
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{me.name ?? '—'}</p>
                        <p className="truncate text-sm text-muted-foreground">{me.email}</p>
                    </div>
                </div>
                <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{t('verein.members.table.category')}</dt>
                        <dd className="font-medium text-foreground">{me.category ? t(`verein.category.${me.category}`) : '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{t('verein.members.table.joined')}</dt>
                        <dd className="font-medium text-foreground">{me.joinedAt ? new Date(me.joinedAt).toLocaleDateString('de-DE') : '—'}</dd>
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

            <form onSubmit={(e) => void handleSave(e)} className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-bold text-foreground">{t('verein.profil.title')}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t('verein.profil.hint')}</p>

                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    <span className="mb-1 flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" /> {t('verein.profil.birthDate')}
                    </span>
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
                </label>

                <fieldset className="mt-4 rounded-lg border border-border p-3">
                    <legend className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground">
                        <HeartPulse className="h-3.5 w-3.5" /> {t('verein.profil.emergency')}
                    </legend>
                    <label className="block text-xs text-muted-foreground">
                        <span className="mb-1 flex items-center gap-1.5">
                            <UserRound className="h-3.5 w-3.5" /> {t('verein.profil.emergencyName')}
                        </span>
                        <input value={contactName} maxLength={200} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
                    </label>
                    <label className="mt-3 block text-xs text-muted-foreground">
                        <span className="mb-1 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" /> {t('verein.profil.emergencyPhone')}
                        </span>
                        <input type="tel" value={contactPhone} maxLength={50} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
                    </label>
                </fieldset>

                <div className="mt-4 flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving || !dirty}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                        {t('verein.profil.save')}
                    </button>
                    {status && <span className={`text-sm ${status.ok ? 'text-success' : 'text-destructive'}`}>{status.text}</span>}
                </div>
            </form>
        </div>
    );
}
