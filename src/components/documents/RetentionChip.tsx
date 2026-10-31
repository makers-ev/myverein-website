'use client';

import { Lock } from 'lucide-react';

import { Chip } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/clubMembers';
import type { RetentionState } from '@/lib/documents';

/** Retention status (Wave 13): legal hold or "retained until"; nothing when the document is free. */
export default function RetentionChip({ state }: { state: RetentionState }) {
    const { t, language } = useLanguage();
    if (state.kind === 'none') return null;
    return (
        <Chip tone="warning">
            <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
            {state.kind === 'hold' ? t('docs.retention.hold') : t('docs.retention.until', { date: formatDate(state.date, language) })}
        </Chip>
    );
}
