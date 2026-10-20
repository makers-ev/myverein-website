'use client';

import { useLanguage } from '@/contexts/LanguageContext';

const GROUPS = ['announcements', 'events', 'reminders', 'leadership', 'decisions', 'accounts', 'handover'] as const;

/** Short in-app list of the automatic notifications (derived from the backend "Notification catalog"). */
export default function NotificationCatalogInfo() {
    const { t } = useLanguage();
    return (
        <div className="mt-3 space-y-3 text-sm text-foreground">
            <p className="text-xs text-muted-foreground">{t('verein.catalog.intro')}</p>
            <ul className="space-y-2">
                {GROUPS.map((g) => (
                    <li key={g}>
                        <p className="font-semibold">{t(`verein.catalog.${g}.title`)}</p>
                        <p className="text-xs text-muted-foreground">{t(`verein.catalog.${g}.body`)}</p>
                    </li>
                ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t('verein.catalog.silent')}</p>
        </div>
    );
}
