'use client';

import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { mapApiError } from '@/lib/mapApiError';

/**
 * Shared state components (design-system catalog, see README "Components"). Same names as in myverein-mobile.
 */

/** Empty list/page with the next action. Pass `action` as a button or link. */
export function EmptyState({ title, hint, action, className = '' }: { title: string; hint?: string; action?: ReactNode; className?: string }) {
    return (
        <div className={`rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center ${className}`.trim()}>
            <p className="text-base font-medium text-foreground">{title}</p>
            {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{hint}</p>}
            {action && <div className="mt-5 flex justify-center">{action}</div>}
        </div>
    );
}

/** Loading placeholder: `lines` grey bars, announced once to screen readers. */
export function Skeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
    const { t } = useLanguage();
    return (
        <div role="status" aria-busy="true" className={`space-y-2 ${className}`.trim()}>
            <span className="sr-only">{t('common.loading')}</span>
            {Array.from({ length: lines }, (_, i) => (
                <div key={i} aria-hidden="true" className={`h-4 animate-skeleton rounded-md bg-muted ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
            ))}
        </div>
    );
}

/** Error with a plain-language text from `mapApiError` and a retry button. */
export function ErrorState({ error, onRetry, className = '' }: { error?: unknown; onRetry?: () => void; className?: string }) {
    const { t } = useLanguage();
    return (
        <div role="alert" className={`flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 ${className}`.trim()}>
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={1.5} />
            <div className="min-w-0">
            <p className="text-sm text-destructive">{error === undefined ? t('common.error') : mapApiError(error, t)}</p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 min-h-11 rounded-lg border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                    {t('common.retry')}
                </button>
            )}
            </div>
        </div>
    );
}

/** Small status tag. `tone` picks the color; always pair with text, never color alone. */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'danger' }) {
    const cls = tone === 'primary' ? 'bg-primary text-primary-foreground' : tone === 'danger' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-foreground';
    return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}
