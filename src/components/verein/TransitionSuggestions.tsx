'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cake } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { memberErrorKey, type CategoryRef } from '@/lib/clubMembers';

interface Suggestion {
    id: string;
    name: string;
    category: CategoryRef;
    suggestedCategory: CategoryRef;
}

interface ApplyResult {
    applied: { id: string }[];
    skipped: { id: string; reason: string }[];
}

/**
 * Age-transition proposals (e.g. Jugend -> Aktiv), derived by the backend at read time:
 * GET /club-members/transition-suggestions, applied with POST .../apply. Both need `members:write`, the parent only
 * mounts this for writers. Nothing changes until the board confirms.
 */
export default function TransitionSuggestions({
    clubId,
    reloadToken,
    onApplied,
}: {
    clubId: string;
    /** Bump to reload the proposals (e.g. after the member list changed). */
    reloadToken: number;
    onApplied: () => void;
}) {
    const { t } = useLanguage();
    const [items, setItems] = useState<Suggestion[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ApplyResult | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: Suggestion[] }>(`/club-members/transition-suggestions?clubId=${clubId}`);
            setItems(res.data);
            setSelected(new Set(res.data.map((s) => s.id)));
            setLoadError(false);
        } catch {
            setLoadError(true);
        }
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load, reloadToken]);

    async function apply() {
        const memberIds = [...selected].slice(0, 500);
        if (memberIds.length === 0) return;
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: ApplyResult }>(`/club-members/transition-suggestions/apply?clubId=${clubId}`, {
                method: 'POST',
                body: { memberIds },
            });
            setResult(res.data);
            setOpen(false);
            await load();
            onApplied();
        } catch (err) {
            setError(t(memberErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    function toggle(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    if (loadError) {
        return (
            <p className="mb-4 text-xs text-muted-foreground">
                {t('verein.suggestions.loadError')}{' '}
                <button type="button" onClick={() => void load()} className="font-medium text-primary hover:underline">
                    {t('verein.create.retry')}
                </button>
            </p>
        );
    }

    const hasItems = !!items && items.length > 0;
    if (!hasItems && !result) return null;

    return (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-4">
            {result && (
                <p role="status" className="mb-2 text-sm font-medium text-foreground">
                    {t('verein.suggestions.result', { applied: result.applied.length })}
                    {result.skipped.length > 0 && ` ${t('verein.suggestions.result.skipped', { skipped: result.skipped.length })}`}
                </p>
            )}
            {hasItems && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Cake className="h-4 w-4 text-warning" aria-hidden="true" />
                            {t('verein.suggestions.title', { count: items.length })}
                        </p>
                        <button
                            type="button"
                            onClick={() => setOpen((o) => !o)}
                            aria-expanded={open}
                            className="rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                            {open ? t('verein.suggestions.hide') : t('verein.suggestions.review')}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t('verein.suggestions.hint')}</p>
                    {open && (
                        <div className="mt-3">
                            <ul className="max-h-64 space-y-1 overflow-y-auto">
                                {items.map((s) => (
                                    <li key={s.id}>
                                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-background/60">
                                            <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 accent-primary" />
                                            <span className="text-foreground">{s.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {s.category.name} → {s.suggestedCategory.name}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                            {items.length > 500 && <p className="mt-1 text-xs text-muted-foreground">{t('verein.suggestions.limit')}</p>}
                            <div className="mt-3 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => void apply()}
                                    disabled={busy || selected.size === 0}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                                >
                                    {t('verein.suggestions.apply', { count: selected.size })}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map((s) => s.id)))}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    {selected.size === items.length ? t('verein.suggestions.none') : t('verein.suggestions.all')}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
            {error && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
