'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { roleLabel } from '@/lib/roleLabel';

export default function RoleBadge({ roleType, onRemove }: { roleType: string; onRemove?: () => void }) {
    const { t } = useLanguage();
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {roleLabel(t, roleType)}
            {onRemove && (
                <button
                    onClick={onRemove}
                    className="rounded-full text-primary/70 hover:text-destructive"
                    aria-label={t('verein.roles.remove')}
                >
                    ×
                </button>
            )}
        </span>
    );
}
