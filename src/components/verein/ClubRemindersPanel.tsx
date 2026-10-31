'use client';

import { useCallback, useEffect, useState } from 'react';

import { errorMessage, SectionCard, Toggle } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import NotificationCatalogInfo from '@/components/verein/NotificationCatalogInfo';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass } from '@/lib/clubMembers';
import { NOTIFY_SWITCHES, REMINDER_KEYS, REMINDER_RULES, type ReminderSettings, parseLead } from '@/lib/clubCommSettings';

/**
 * "Erinnerungen und Automatik" in the Einstellungen tab (Wave 9 W6, `members:write`): which automatic reminders the club
 * sends (events, loans, maintenance, RSVP deadlines) with their lead times, and the switch for the automatic age
 * transition. Only changed fields are sent.
 */
export default function ClubRemindersPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [saved, setSaved] = useState<ReminderSettings | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [enabled, setEnabled] = useState<Record<string, boolean>>({});
    const [lead, setLead] = useState<Record<string, string>>({});
    const [ageAuto, setAgeAuto] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [notify, setNotify] = useState<Record<string, boolean>>({});
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    const apply = useCallback((s: ReminderSettings) => {
        setSaved(s);
        setEnabled(Object.fromEntries(REMINDER_KEYS.map((k) => [k, s[REMINDER_RULES[k].enabled] as boolean])));
        setLead(Object.fromEntries(REMINDER_KEYS.map((k) => [k, String(s[REMINDER_RULES[k].lead])])));
        setAgeAuto(s.ageTransitionAuto);
        setNotify(Object.fromEntries(NOTIFY_SWITCHES.map((k) => [k, s[k]])));
    }, []);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const res = await apiFetch<{ data: ReminderSettings }>(`/club-settings?clubId=${encodeURIComponent(clubId)}`);
            apply(res.data);
        } catch (err) {
            setLoadError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, apply]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (loadError) {
        return (
            <SectionCard title={t('verein.reminders.title')}>
                <p role="alert" className="text-sm text-destructive">
                    {loadError}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('verein.common.retry')}
                    </button>
                </p>
            </SectionCard>
        );
    }
    if (!saved) {
        return (
            <SectionCard title={t('verein.reminders.title')}>
                <p role="status" className="text-sm text-muted-foreground">
                    {t('verein.settings.loading')}
                </p>
            </SectionCard>
        );
    }

    const changes: Record<string, unknown> = {};
    const invalid: Record<string, boolean> = {};
    for (const k of REMINDER_KEYS) {
        const rule = REMINDER_RULES[k];
        if (enabled[k] !== saved[rule.enabled]) changes[rule.enabled] = enabled[k];
        const parsed = parseLead(lead[k] ?? '', rule.min, rule.max);
        if (parsed === undefined) invalid[k] = true;
        else if (parsed !== saved[rule.lead]) changes[rule.lead] = parsed;
    }
    if (ageAuto !== saved.ageTransitionAuto) changes.ageTransitionAuto = ageAuto;
    for (const k of NOTIFY_SWITCHES) if (notify[k] !== saved[k]) changes[k] = notify[k];
    const dirty = Object.keys(changes).length > 0;
    const hasInvalid = Object.values(invalid).some(Boolean);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!dirty || hasInvalid) return;
        setBusy(true);
        setStatus(null);
        try {
            const res = await apiFetch<{ data: ReminderSettings }>(`/club-settings?clubId=${encodeURIComponent(clubId)}`, { method: 'PATCH', body: changes });
            apply(res.data);
            setStatus({ ok: true, text: t('verein.settings.saved') });
        } catch (err) {
            setStatus({ ok: false, text: errorMessage(err, t) });
        } finally {
            setBusy(false);
        }
    }

    return (
        <SectionCard title={t('verein.reminders.title')}>
            <form onSubmit={(e) => void save(e)} className="space-y-5">
                <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-foreground">{t('verein.reminders.legend')}</legend>
                    <p className="text-xs text-muted-foreground">{t('verein.reminders.hint')}</p>
                    <ul className="space-y-3">
                        {REMINDER_KEYS.map((k) => {
                            const rule = REMINDER_RULES[k];
                            return (
                                <li key={k} className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
                                    <div className="space-y-1">
                                        <Toggle checked={!!enabled[k]} onChange={(v) => setEnabled((prev) => ({ ...prev, [k]: v }))} label={t(`verein.reminders.${k}`)} />
                                        <p className="text-xs text-muted-foreground">{t(`verein.reminders.${k}.hint`)}</p>
                                    </div>
                                    <label className="block text-xs font-semibold text-muted-foreground">
                                        {t(`verein.reminders.lead.${rule.unit}`)}
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={rule.min}
                                            max={rule.max}
                                            value={lead[k] ?? ''}
                                            disabled={!enabled[k]}
                                            aria-invalid={!!invalid[k]}
                                            onChange={(e) => setLead((prev) => ({ ...prev, [k]: e.target.value }))}
                                            className={`mt-1 ${inputClass}`}
                                        />
                                        {invalid[k] && (
                                            <span role="alert" className="mt-1 block font-normal text-destructive">
                                                {t('verein.reminders.lead.invalid', { min: rule.min, max: rule.max })}
                                            </span>
                                        )}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">{t('verein.reminders.age.title')}</legend>
                    <Toggle checked={ageAuto} onChange={setAgeAuto} label={t('verein.reminders.age.label')} />
                    <p className="text-xs text-muted-foreground">{t('verein.reminders.age.hint')}</p>
                    {ageAuto && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-foreground">{t('verein.reminders.age.warning')}</p>}
                </fieldset>

                <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-foreground">{t('verein.notify.title')}</legend>
                    <p className="text-xs text-muted-foreground">{t('verein.notify.hint')}</p>
                    <ul className="space-y-3">
                        {NOTIFY_SWITCHES.map((k) => (
                            <li key={k} className="space-y-1">
                                <Toggle checked={!!notify[k]} onChange={(v) => setNotify((prev) => ({ ...prev, [k]: v }))} label={t(`verein.notify.${k}`)} />
                                <p className="text-xs text-muted-foreground">{t(`verein.notify.${k}.hint`)}</p>
                            </li>
                        ))}
                    </ul>
                </fieldset>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <button type="button" onClick={() => setCatalogOpen((o) => !o)} aria-expanded={catalogOpen} className="text-sm font-semibold text-primary underline">
                        {t('verein.catalog.link')}
                    </button>
                    {catalogOpen && <NotificationCatalogInfo />}
                </div>

                <div className="flex items-center gap-3">
                    <button type="submit" disabled={busy || !dirty || hasInvalid} className={primaryButtonClass}>
                        {t('verein.profil.save')}
                    </button>
                    {status && (
                        <span role={status.ok ? 'status' : 'alert'} className={`text-sm ${status.ok ? 'text-success' : 'text-destructive'}`}>
                            {status.text}
                        </span>
                    )}
                </div>
            </form>
        </SectionCard>
    );
}
