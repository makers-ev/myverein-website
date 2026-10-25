'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { type ParticipationMode, allowedParticipationModes, assemblyErrorKey, inCheckInWindow, type AssemblyRules } from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard } from '@/components/standorte/ui';
import { ErrorText, Notice } from '@/components/assembly/shared';

/**
 * Participation mode of the assembly (Wave 11 W9, optional): presence, hybrid or online. Only what the club's statute parameters allow
 * (`onlineAllowed`, off by default) can be chosen; the join link is shown to invited people only.
 */
export function ParticipationCard({ clubId, meetingId, mode, onlineUrl, onSaved }: { clubId: string; meetingId: string; mode: ParticipationMode; onlineUrl: string | null; onSaved: () => void }) {
    const { t } = useLanguage();
    const [allowed, setAllowed] = useState<ParticipationMode[] | null>(null);
    const [draftMode, setDraftMode] = useState<ParticipationMode>(mode);
    const [draftUrl, setDraftUrl] = useState(onlineUrl ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        apiFetch<{ data: { rules: AssemblyRules } }>(`/club-settings/assembly?clubId=${clubId}`)
            .then((res) => setAllowed(allowedParticipationModes(res.data.rules.onlineAllowed)))
            .catch(() => setAllowed(['praesenz']));
    }, [clubId]);

    if (!allowed) return null;
    // Nothing to choose while the statute parameters do not allow online participation and the meeting is in presence.
    if (allowed.length === 1 && mode === 'praesenz') {
        return (
            <SectionCard title={t('assembly.online.title')}>
                <p className="text-sm text-muted-foreground">{t('assembly.online.off')}</p>
            </SectionCard>
        );
    }

    const url = draftUrl.trim();
    const urlInvalid = draftMode !== 'praesenz' && url !== '' && !/^https:\/\/\S+$/.test(url);
    const dirty = draftMode !== mode || (draftMode === 'praesenz' ? false : url !== (onlineUrl ?? ''));

    async function save() {
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
            await apiFetch(`/meetings/${meetingId}?clubId=${clubId}`, {
                method: 'PATCH',
                body: { participationMode: draftMode, onlineUrl: draftMode === 'praesenz' ? null : url === '' ? null : url, notify: false },
            });
            setSaved(true);
            onSaved();
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <SectionCard title={t('assembly.online.title')}>
            <div className="space-y-3">
                <Notice tone="warning">{t('assembly.online.warning')}</Notice>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label htmlFor="pm-mode" className={labelClass}>
                            {t('assembly.online.mode')}
                        </label>
                        <select id="pm-mode" value={draftMode} onChange={(e) => setDraftMode(e.target.value as ParticipationMode)} className={inputClass}>
                            {allowed.map((m) => (
                                <option key={m} value={m}>
                                    {t(`assembly.participation.${m}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                    {draftMode !== 'praesenz' && (
                        <div>
                            <label htmlFor="pm-url" className={labelClass}>
                                {t('assembly.online.url')}
                            </label>
                            <input id="pm-url" type="url" value={draftUrl} onChange={(e) => setDraftUrl(e.target.value)} aria-invalid={urlInvalid} aria-describedby="pm-url-hint" placeholder="https://" className={inputClass} />
                            <p id="pm-url-hint" className="mt-1 text-xs text-muted-foreground">
                                {urlInvalid ? t('assembly.online.url.invalid') : t('assembly.online.url.hint')}
                            </p>
                        </div>
                    )}
                </div>
                {error && <ErrorText>{error}</ErrorText>}
                {saved && !dirty && (
                    <p role="status" className="text-sm text-success">
                        {t('assembly.online.saved')}
                    </p>
                )}
                <button type="button" disabled={busy || !dirty || urlInvalid} onClick={() => void save()} className={primaryBtn}>
                    {t('assembly.online.save')}
                </button>
            </div>
        </SectionCard>
    );
}

/** Join link and self check-in for an invited account; the members in the room are checked in by the secretary. */
export function OnlineJoin({ clubId, meetingId, mode, onlineUrl, scheduledAt }: { clubId: string; meetingId: string; mode: ParticipationMode; onlineUrl: string | null; scheduledAt: string | null }) {
    const { t } = useLanguage();
    const [now, setNow] = useState(() => Date.now());
    const [joined, setJoined] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const call = useCallback(
        async (action: 'join' | 'leave') => {
            setBusy(true);
            setError(null);
            try {
                await apiFetch(`/meetings/${meetingId}/online/${action}?clubId=${clubId}`, { method: 'POST', body: {} });
                setJoined(action === 'join');
            } catch (err) {
                setError(t(assemblyErrorKey(err)));
            } finally {
                setBusy(false);
            }
        },
        [clubId, meetingId, t],
    );

    if (mode === 'praesenz') return null;
    const open = inCheckInWindow(scheduledAt, now);

    return (
        <SectionCard title={t('assembly.online.member.title')}>
            <div className="space-y-3">
                <p className="text-sm text-foreground">{t(`assembly.online.member.${mode}`)}</p>
                {onlineUrl ? (
                    <a href={onlineUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline">
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        {t('assembly.online.member.link')}
                    </a>
                ) : (
                    <p className="text-xs text-muted-foreground">{t('assembly.online.member.noLink')}</p>
                )}
                {!open && <p className="text-xs text-muted-foreground">{t('assembly.online.member.window')}</p>}
                {joined === true && (
                    <p role="status" className="text-sm font-medium text-success">
                        {t('assembly.online.member.joined')}
                    </p>
                )}
                {error && <ErrorText>{error}</ErrorText>}
                <div className="flex gap-2">
                    <button type="button" disabled={busy || !open || joined === true} onClick={() => void call('join')} className={primaryBtn}>
                        {t('assembly.online.member.join')}
                    </button>
                    {joined === true && (
                        <button type="button" disabled={busy} onClick={() => void call('leave')} className={secondaryBtn}>
                            {t('assembly.online.member.leave')}
                        </button>
                    )}
                </div>
            </div>
        </SectionCard>
    );
}
