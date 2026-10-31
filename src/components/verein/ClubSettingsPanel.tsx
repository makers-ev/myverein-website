'use client';

import { useCallback, useEffect, useState } from 'react';

import { errorMessage, SectionCard, Toggle } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass } from '@/lib/clubMembers';
import {
    type ClubSettings,
    FEDERAL_STATES,
    isNoticeMode,
    isValidPrefix,
    normalizePrefix,
    NOTICE_MODES,
    noticeRuleText,
    type NoticeMode,
    parseNoticeDays,
} from '@/lib/memberLifecycle';

/**
 * "Vereinsregeln" in the Einstellungen tab (Wave 7 W5, `members:write`): notice period and mode, member-number prefix
 * and the self-loan switch from `GET`/`PATCH /club-settings`. Only changed fields are sent. `GET` does not deliver the
 * prefix (only the PATCH answer does), so the field starts empty and is sent only once the board typed into it.
 */
export default function ClubSettingsPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [saved, setSaved] = useState<ClubSettings | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [days, setDays] = useState('');
    const [mode, setMode] = useState<NoticeMode | ''>('');
    const [prefix, setPrefix] = useState('');
    const [prefixTouched, setPrefixTouched] = useState(false);
    const [selfLoans, setSelfLoans] = useState(true);
    const [state, setState] = useState('');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    const apply = useCallback((s: ClubSettings) => {
        setSaved(s);
        setDays(s.noticePeriodDays === null ? '' : String(s.noticePeriodDays));
        setMode(s.noticeMode ?? '');
        if (s.memberNumberPrefix !== undefined) {
            setPrefix(s.memberNumberPrefix ?? '');
            setPrefixTouched(false);
        }
        setSelfLoans(s.allowSelfLoans);
        setState(s.state ?? '');
    }, []);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const res = await apiFetch<{ data: ClubSettings }>(`/club-settings?clubId=${encodeURIComponent(clubId)}`);
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
            <SectionCard title={t('verein.settings.title')}>
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
            <SectionCard title={t('verein.settings.title')}>
                <p role="status" className="text-sm text-muted-foreground">
                    {t('verein.settings.loading')}
                </p>
            </SectionCard>
        );
    }

    const parsedDays = parseNoticeDays(days);
    const normalizedPrefix = normalizePrefix(prefix);
    const daysInvalid = parsedDays === undefined;
    const prefixInvalid = prefixTouched && normalizedPrefix !== null && !isValidPrefix(normalizedPrefix);

    const changes: Record<string, unknown> = {};
    if (parsedDays !== undefined && parsedDays !== saved.noticePeriodDays) changes.noticePeriodDays = parsedDays;
    if ((mode || null) !== saved.noticeMode) changes.noticeMode = mode || null;
    if (prefixTouched && !prefixInvalid) changes.memberNumberPrefix = normalizedPrefix;
    if (selfLoans !== saved.allowSelfLoans) changes.allowSelfLoans = selfLoans;
    if ((state || null) !== (saved.state ?? null)) changes.state = state || null;
    const dirty = Object.keys(changes).length > 0;

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!dirty || daysInvalid || prefixInvalid) return;
        setBusy(true);
        setStatus(null);
        try {
            const res = await apiFetch<{ data: ClubSettings }>(`/club-settings?clubId=${encodeURIComponent(clubId)}`, { method: 'PATCH', body: changes });
            apply(res.data);
            setStatus({ ok: true, text: t('verein.settings.saved') });
        } catch (err) {
            setStatus({ ok: false, text: errorMessage(err, t) });
        } finally {
            setBusy(false);
        }
    }

    const rule = noticeRuleText({ noticePeriodDays: parsedDays ?? saved.noticePeriodDays, noticeMode: mode || null });

    return (
        <SectionCard title={t('verein.settings.title')}>
            <form onSubmit={(e) => void save(e)} className="space-y-5">
                <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-foreground">{t('verein.settings.notice.title')}</legend>
                    <p className="text-xs text-muted-foreground">{t('verein.settings.notice.hint')}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-xs font-semibold text-muted-foreground">
                            {t('verein.settings.notice.days')}
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={365}
                                value={days}
                                aria-invalid={daysInvalid}
                                onChange={(e) => setDays(e.target.value)}
                                className={`mt-1 ${inputClass}`}
                            />
                            {daysInvalid && (
                                <span role="alert" className="mt-1 block font-normal text-destructive">
                                    {t('verein.settings.notice.days.invalid')}
                                </span>
                            )}
                        </label>
                        <label className="block text-xs font-semibold text-muted-foreground">
                            {t('verein.settings.notice.mode')}
                            <select
                                value={mode}
                                onChange={(e) => setMode(isNoticeMode(e.target.value) ? e.target.value : '')}
                                className={`mt-1 ${inputClass}`}
                            >
                                <option value="">{t('verein.settings.notice.mode.none')}</option>
                                {NOTICE_MODES.map((m) => (
                                    <option key={m} value={m}>
                                        {t(`verein.settings.notice.mode.${m}`)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <p className="text-xs text-foreground">
                        {t('verein.settings.notice.preview')} {t(rule.key, rule.params)}
                    </p>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">{t('verein.settings.prefix.title')}</legend>
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.settings.prefix.label')}
                        <input
                            value={prefix}
                            maxLength={10}
                            placeholder={t('verein.settings.prefix.placeholder')}
                            aria-invalid={prefixInvalid}
                            onChange={(e) => {
                                setPrefix(e.target.value);
                                setPrefixTouched(true);
                            }}
                            className={`mt-1 sm:max-w-xs ${inputClass}`}
                        />
                    </label>
                    {prefixInvalid ? (
                        <p role="alert" className="text-xs text-destructive">
                            {t('verein.settings.prefix.invalid')}
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">{t('verein.settings.prefix.hint')}</p>
                    )}
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">{t('verein.settings.loans.title')}</legend>
                    <Toggle checked={selfLoans} onChange={setSelfLoans} label={t('verein.settings.loans.label')} />
                    <p className="text-xs text-muted-foreground">{t('verein.settings.loans.hint')}</p>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">{t('verein.settings.state.title')}</legend>
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.settings.state.label')}
                        <select id="club-state" value={state} onChange={(e) => setState(e.target.value)} className={`mt-1 sm:max-w-xs ${inputClass}`}>
                            <option value="">{t('verein.settings.state.none')}</option>
                            {FEDERAL_STATES.map((code) => (
                                <option key={code} value={code}>
                                    {t(`verein.settings.state.${code}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <p className="text-xs text-muted-foreground">{t('verein.settings.state.hint')}</p>
                </fieldset>

                <div className="flex items-center gap-3">
                    <button type="submit" disabled={busy || !dirty || daysInvalid || prefixInvalid} className={primaryButtonClass}>
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
