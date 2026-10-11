'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/** Error state of an initial load with a retry button (instead of a spinner that never ends). */
export default function LoadError({ onRetry, className = '' }: { onRetry: () => void; className?: string }) {
    const { t } = useLanguage();
    return (
        <div role="alert" className={`rounded-xl border border-destructive/30 bg-destructive/5 p-4 ${className}`.trim()}>
            <p className="text-sm text-destructive">{t('common.error')}</p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
                {t('common.retry')}
            </button>
        </div>
    );
}
