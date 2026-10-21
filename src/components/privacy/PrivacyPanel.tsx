'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { can } from '@/lib/clubPermissions';
import ConsentOverviewPanel from './ConsentOverviewPanel';
import ConsentPurposesPanel from './ConsentPurposesPanel';

type View = 'consents';

/**
 * Tab "Datenschutz" of the club area (Wave 10): Einwilligungen (purposes, text versions, overview) for `privacy:read` or
 * `privacy:manage`. Every control is gated by `permissions`; the backend checks again.
 */
export default function PrivacyPanel({ clubId, permissions }: { clubId: string; permissions: readonly string[] }) {
    const { t } = useLanguage();
    const canManage = can(permissions, 'privacy:manage');
    const canRead = can(permissions, 'privacy:read') || canManage;
    const views: View[] = canRead ? ['consents'] : [];
    const [view, setView] = useState<View>('consents');
    // Bumped when purposes change so the overview columns follow.
    const [purposesVersion, setPurposesVersion] = useState(0);
    const current: View = views.includes(view) ? view : (views[0] ?? 'consents');

    if (views.length === 0) return null;

    return (
        <div className="space-y-4">
            {views.length > 1 && (
                <div role="group" aria-label={t('privacy.title')} className="inline-flex rounded-lg border border-border p-0.5">
                    {views.map((value) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={current === value}
                            onClick={() => setView(value)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium ${current === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t(`privacy.tab.${value}`)}
                        </button>
                    ))}
                </div>
            )}
            {current === 'consents' && (
                <div className="space-y-6">
                    <ConsentPurposesPanel clubId={clubId} canManage={canManage} onChanged={() => setPurposesVersion((n) => n + 1)} />
                    <ConsentOverviewPanel
                        key={purposesVersion}
                        clubId={clubId}
                        permissions={permissions}
                    />
                </div>
            )}
        </div>
    );
}
