'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass } from '@/lib/clubMembers';
import { privacyErrorKey } from '@/lib/privacyAdmin';
import { SectionCard, Toggle } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

interface PrivacySettings {
    consentAgeLimit: number;
    consentBothGuardians: boolean;
    privacyContact: string | null;
    privacyController: string | null;
}

const AGES = [10, 11, 12, 13, 14, 15, 16, 17, 18];

/**
 * Privacy settings of the club (Wave 10 W5): the age from which a person consents alone (below it a guardian or the board with
 * a paper proof decides), whether both guardians are needed, and the contact and the controller (Verantwortlicher) that feed
 * the privacy notice. Read by every member through `GET /club-settings`; saved with `PATCH /club-settings` (`privacy:manage`).
 */
export default function PrivacySettingsPanel({ clubId, canManage }: { clubId: string; canManage: boolean }) {
    const { t } = useLanguage();
    const [saved, setSaved] = useState<PrivacySettings | null>(null);
    const [form, setForm] = useState<PrivacySettings | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const path = `/club-settings?clubId=${encodeURIComponent(clubId)}`;

    const pick = (d: Partial<PrivacySettings>): PrivacySettings => ({
        consentAgeLimit: d.consentAgeLimit ?? 18,
        consentBothGuardians: d.consentBothGuardians ?? false,
        privacyContact: d.privacyContact ?? null,
        privacyController: d.privacyController ?? null,
    });

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = pick((await apiFetch<{ data: Partial<PrivacySettings> }>(path)).data);
            setSaved(res);
            setForm(res);
        } catch {
            setLoadError(true);
        }
    }, [path]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function save() {
        if (!form) return;
        setBusy(true);
        setError(null);
        setNote(null);
        try {
            const res = pick((await apiFetch<{ data: Partial<PrivacySettings> }>(path, { method: 'PATCH', body: { ...form, privacyContact: form.privacyContact?.trim() ?? null, privacyController: form.privacyController?.trim() ?? null } })).data);
            setSaved(res);
            setForm(res);
            setNote(t('privacy.settings.saved'));
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    if (loadError)
        return (
            <SectionCard title={t('privacy.settings.title')}>
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            </SectionCard>
        );
    if (!form || !saved)
        return (
            <SectionCard title={t('privacy.settings.title')}>
                <LoadingText />
            </SectionCard>
        );

    const dirty = JSON.stringify(form) !== JSON.stringify(saved);
    const set = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => setForm({ ...form, [key]: value });

    return (
        <SectionCard title={t('privacy.settings.title')}>
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('privacy.settings.intro')}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.settings.ageLimit')}</span>
                        <select value={form.consentAgeLimit} disabled={!canManage} onChange={(e) => set('consentAgeLimit', Number(e.target.value))} className={inputClass}>
                            {AGES.map((age) => (
                                <option key={age} value={age}>
                                    {t('privacy.settings.ageOption', { age })}
                                </option>
                            ))}
                        </select>
                        <span className="mt-1 block text-xs text-muted-foreground">{t('privacy.settings.ageHint')}</span>
                    </label>
                    <div className="self-end">
                        <Toggle checked={form.consentBothGuardians} onChange={(v) => canManage && set('consentBothGuardians', v)} label={t('privacy.settings.bothGuardians')} />
                    </div>
                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.settings.contact')}</span>
                        <input value={form.privacyContact ?? ''} maxLength={300} disabled={!canManage} onChange={(e) => set('privacyContact', e.target.value)} placeholder={t('privacy.settings.contactPlaceholder')} className={inputClass} />
                    </label>
                    <label className="block sm:col-span-2">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.settings.controller')}</span>
                        <textarea value={form.privacyController ?? ''} maxLength={500} rows={3} disabled={!canManage} onChange={(e) => set('privacyController', e.target.value)} placeholder={t('privacy.settings.controllerPlaceholder')} className={inputClass} />
                    </label>
                </div>
                {canManage ? (
                    <button type="button" disabled={busy || !dirty} onClick={() => void save()} className={primaryButtonClass}>
                        {t('privacy.settings.save')}
                    </button>
                ) : (
                    <p className="text-xs text-muted-foreground">{t('privacy.readOnly')}</p>
                )}
                {note && (
                    <p role="status" className="text-sm text-success">
                        {note}
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </SectionCard>
    );
}
