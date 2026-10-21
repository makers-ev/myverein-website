'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { can } from '@/lib/clubPermissions';
import AuditLogPanel, { type AuditMemberFocus } from './AuditLogPanel';
import ConsentOverviewPanel from './ConsentOverviewPanel';
import ConsentPurposesPanel from './ConsentPurposesPanel';
import DataRequestsPanel from './DataRequestsPanel';
import DpaPanel from './DpaPanel';
import PrivacyNoticePanel from './PrivacyNoticePanel';
import PrivacySettingsPanel from './PrivacySettingsPanel';
import RetentionPanel from './RetentionPanel';

export type PrivacyView = 'consents' | 'notice' | 'requests' | 'retention' | 'settings' | 'dpa' | 'audit';

/**
 * Tab "Datenschutz" of the club area (Wave 10): Einwilligungen (purposes, text versions, overview), Datenschutzhinweis,
 * Anfragen (with deadlines), Aufbewahrung, Einstellungen, AV-Vertrag and the Zugriffsprotokoll -- all for `privacy:read`
 * (looking) or `privacy:manage` (changing). Every control is gated by `permissions`; the backend checks again.
 * `startView` opens a specific view (the AV-Vertrag banner); `onDpaAccepted` lets the page refresh its banner.
 */
export default function PrivacyPanel({ clubId, permissions, startView, onDpaAccepted }: { clubId: string; permissions: readonly string[]; startView?: PrivacyView; onDpaAccepted?: () => void }) {
    const { t } = useLanguage();
    const canManage = can(permissions, 'privacy:manage');
    const canRead = can(permissions, 'privacy:read') || canManage;
    const canAudit = can(permissions, 'privacy:read');
    const views: PrivacyView[] = [...(canRead ? (['consents', 'notice', 'requests', 'retention', 'settings', 'dpa'] as const) : []), ...(canAudit ? (['audit'] as const) : [])];
    const [view, setView] = useState<PrivacyView>(startView ?? 'consents');
    const [focus, setFocus] = useState<AuditMemberFocus | null>(null);
    // Bumped when purposes change so the overview columns follow.
    const [purposesVersion, setPurposesVersion] = useState(0);
    const current: PrivacyView = views.includes(view) ? view : (views[0] ?? 'consents');

    if (views.length === 0) return null;

    return (
        <div className="space-y-4">
            {views.length > 1 && (
                <div role="group" aria-label={t('privacy.title')} className="inline-flex flex-wrap rounded-lg border border-border p-0.5">
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
                        onOpenAudit={
                            canAudit
                                ? (id, name) => {
                                      setFocus({ id, name });
                                      setView('audit');
                                  }
                                : undefined
                        }
                    />
                </div>
            )}
            {current === 'notice' && <PrivacyNoticePanel clubId={clubId} canManage={canManage} />}
            {current === 'requests' && <DataRequestsPanel clubId={clubId} permissions={permissions} />}
            {current === 'retention' && <RetentionPanel clubId={clubId} canManage={canManage} />}
            {current === 'settings' && <PrivacySettingsPanel clubId={clubId} canManage={canManage} />}
            {current === 'dpa' && <DpaPanel clubId={clubId} onAccepted={onDpaAccepted} />}
            {current === 'audit' && <AuditLogPanel clubId={clubId} focus={focus} onFocusChange={setFocus} />}
        </div>
    );
}
