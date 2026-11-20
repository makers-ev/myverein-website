'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function RoleBadge({ roleType, onRemove }: { roleType: string; onRemove?: () => void }) {
    const { t } = useLanguage();
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-soft-foreground">
            {t(`verein.role.${roleType}`)}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="rounded-full text-primary-text/70 hover:text-destructive"
                    aria-label={t('verein.roles.remove')}
                >
                    ×
                </button>
            )}
        </span>
    );
}
