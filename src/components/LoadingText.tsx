'use client';

import { useLanguage } from '@/contexts/LanguageContext';

/** Loading placeholder announced to screen readers (`role="status"`); the visible text stays a quiet ellipsis. */
export default function LoadingText({ className = '' }: { className?: string }) {
    const { t } = useLanguage();
    return (
        <p role="status" className={`text-sm text-muted-foreground ${className}`.trim()}>
            <span aria-hidden="true">…</span>
            <span className="sr-only">{t('common.loading')}</span>
        </p>
    );
}
