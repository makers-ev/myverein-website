'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { VISIBILITY_FIELDS, VISIBILITY_LEVELS, type Visibility, type VisibilityField, type VisibilityLevel, normalizeVisibility, privacyErrorKey } from '@/lib/privacyAdmin';
import LoadingText from '@/components/LoadingText';

/**
 * Who besides the board may see phone, e-mail, address and photo (`GET/PUT /club-members/:id/visibility`). The default is
 * "only the board"; every change is saved at once and applies to the member list and the member's profile. Used for the
 * member themself; a guardian with custody uses the same API for a ward.
 */
export default function FieldVisibility({ clubId, clubMemberId }: { clubId: string; clubMemberId: string }) {
    const { t } = useLanguage();
    const [levels, setLevels] = useState<Visibility | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState<VisibilityField | null>(null);
    const [error, setError] = useState<string | null>(null);
    const path = `/club-members/${encodeURIComponent(clubMemberId)}/visibility?clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await apiFetch<{ data: { levels?: unknown } }>(path);
            setLevels(normalizeVisibility(res.data.levels));
        } catch {
            setLoadError(true);
        }
    }, [path]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function change(field: VisibilityField, level: VisibilityLevel) {
        setSaving(field);
        setError(null);
        try {
            const res = await apiFetch<{ data: { levels?: unknown } }>(path, { method: 'PUT', body: { [field]: level } });
            setLevels(normalizeVisibility(res.data.levels));
        } catch (err) {
            setError(t(privacyErrorKey(err)));
            await load();
        } finally {
            setSaving(null);
        }
    }

    if (loadError)
        return (
            <p role="alert" className="text-sm text-destructive">
                {t('common.error')}{' '}
                <button type="button" onClick={() => void load()} className="font-semibold underline">
                    {t('common.retry')}
                </button>
            </p>
        );
    if (!levels) return <LoadingText />;

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('privacy.visibility.intro')}</p>
            <ul className="space-y-2">
                {VISIBILITY_FIELDS.map((field) => (
                    <li key={field} className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor={`vis-${field}`} className="text-sm font-medium text-foreground">
                            {t(`privacy.visibility.field.${field}`)}
                        </label>
                        <select
                            id={`vis-${field}`}
                            value={levels[field]}
                            disabled={saving === field}
                            onChange={(e) => void change(field, e.target.value as VisibilityLevel)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                            {VISIBILITY_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                    {t(`privacy.visibility.level.${level}`)}
                                </option>
                            ))}
                        </select>
                    </li>
                ))}
            </ul>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
