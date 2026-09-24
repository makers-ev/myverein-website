'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = ['aktiv', 'passiv', 'foerdernd', 'jugend'] as const;

/** Digitaler Aufnahmeantrag: POST /club-members/apply by club slug, membership is granted immediately. */
export default function JoinClubCard({ onJoined }: { onJoined: () => void }) {
    const { t } = useLanguage();
    const [slug, setSlug] = useState('');
    const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('aktiv');
    const [birthDate, setBirthDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!slug.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch('/club-members/apply', {
                method: 'POST',
                body: { clubSlug: slug.trim().toLowerCase(), category, ...(birthDate ? { birthDate } : {}) },
            });
            onJoined();
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) setError(t('verein.join.notFound'));
            else if (err instanceof ApiError && err.status === 409) setError(t('verein.join.already'));
            else setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.join.body')}</p>
                </div>
            </div>

            <label className="mt-5 block text-xs font-semibold text-muted-foreground">
                {t('verein.join.slug')}
                <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="z. B. demo-sportverein"
                    autoCapitalize="none"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
            </label>

            <p className="mt-4 text-xs font-semibold text-muted-foreground">{t('verein.members.table.category')}</p>
            <div className="mt-1 flex flex-wrap gap-2" role="radiogroup">
                {CATEGORIES.map((c) => (
                    <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={category === c}
                        onClick={() => setCategory(c)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                            category === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'
                        }`}
                    >
                        {t(`verein.category.${c}`)}
                    </button>
                ))}
            </div>

            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                {t('verein.profil.birthDate')} ({t('verein.join.optional')})
                <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none sm:w-auto"
                />
            </label>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <button
                type="submit"
                disabled={submitting || !slug.trim()}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
                {t('verein.join.submit')}
            </button>
        </form>
    );
}
