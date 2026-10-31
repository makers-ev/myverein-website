'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { memberErrorKey } from '@/lib/clubMembers';
import { type PrefCategory, type PrefChannel, type Preferences, loadPreferences, savePreference, withToggle } from '@/lib/notificationPreferences';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';

const CHANNEL_ORDER: PrefChannel[] = ['in_app', 'email', 'push'];

/**
 * "Mitteilungen deines Vereins" in the account settings (W4): per category (announcements, events, reminders) and channel
 * (notice board, e-mail, push) a switch, saved on the spot. The notice board is always on and security/decision messages
 * cannot be switched off -- both are shown as such instead of hidden. Applies to the club's messages only; the
 * platform's own notices (bell) are not part of this.
 */
export default function NotificationPreferences() {
    const { t } = useLanguage();
    const [prefs, setPrefs] = useState<Preferences | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [pending, setPending] = useState<string | null>(null);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(() => {
        setLoadFailed(false);
        loadPreferences()
            .then(setPrefs)
            .catch(() => setLoadFailed(true));
    }, []);

    useEffect(() => {
        // Fetching on mount is a sync-with-external-system effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function toggle(category: PrefCategory, channel: PrefChannel, enabled: boolean) {
        if (!prefs || pending !== null || channel === 'in_app') return;
        const before = prefs;
        setPrefs(withToggle(prefs, category, channel, enabled));
        setPending(`${category}:${channel}`);
        setStatus(null);
        try {
            setPrefs(await savePreference(category, channel, enabled));
            setStatus({ ok: true, text: t('prefs.saved') });
        } catch (err) {
            setPrefs(before);
            setStatus({ ok: false, text: t(memberErrorKey(err)) });
        } finally {
            setPending(null);
        }
    }

    return (
        <section className="bg-card border border-border rounded-lg p-6 shadow-sm" aria-labelledby="prefs-title">
            <h2 id="prefs-title" className="text-lg font-semibold">
                {t('prefs.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('prefs.intro')}</p>

            <div className="mt-4">
                {loadFailed ? (
                    <LoadError onRetry={load} />
                ) : !prefs ? (
                    <LoadingText />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-muted-foreground">
                                        <th className="py-2 pr-3 font-semibold">{t('prefs.col.category')}</th>
                                        {CHANNEL_ORDER.map((c) => (
                                            <th key={c} className="px-3 py-2 text-center font-semibold">
                                                {t(`prefs.channel.${c}`)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {prefs.categories.map((cat) => (
                                        <tr key={cat.category}>
                                            <th scope="row" className="py-3 pr-3 text-left font-normal">
                                                <span className="block font-medium text-foreground">{t(`prefs.category.${cat.category}`)}</span>
                                                <span className="block text-xs text-muted-foreground">{t(`prefs.category.${cat.category}.hint`)}</span>
                                            </th>
                                            {CHANNEL_ORDER.map((channel) => {
                                                const ch = cat.channels.find((x) => x.channel === channel);
                                                return (
                                                    <td key={channel} className="px-3 py-3 text-center">
                                                        {!ch ? (
                                                            <span className="text-muted-foreground">—</span>
                                                        ) : !ch.switchable ? (
                                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Lock className="h-3 w-3" aria-hidden />
                                                                {t('prefs.always')}
                                                            </span>
                                                        ) : (
                                                            <input
                                                                type="checkbox"
                                                                checked={ch.enabled}
                                                                disabled={pending !== null}
                                                                onChange={(e) => void toggle(cat.category, channel, e.target.checked)}
                                                                aria-label={t('prefs.toggle', { category: t(`prefs.category.${cat.category}`), channel: t(`prefs.channel.${channel}`) })}
                                                                className="h-4 w-4 accent-primary"
                                                            />
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">{t('prefs.push.hint')}</p>
                        {status && (
                            <p role={status.ok ? 'status' : 'alert'} className={`mt-2 text-sm ${status.ok ? 'text-success' : 'text-destructive'}`}>
                                {status.text}
                            </p>
                        )}

                        {prefs.mandatory.length > 0 && (
                            <div className="mt-5 rounded-lg bg-muted/50 p-3">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <Lock className="h-3.5 w-3.5" aria-hidden />
                                    {t('prefs.mandatory.title')}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">{t('prefs.mandatory.hint')}</p>
                                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-foreground">
                                    {prefs.mandatory.map((m) => (
                                        <li key={m.key}>{t(`prefs.mandatory.${m.key}`)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
