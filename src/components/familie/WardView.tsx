'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type WardEntry, type WardOverview } from '@/lib/familie';
import { SectionCard } from '@/components/standorte/ui';
import MemberConsents from '@/components/privacy/MemberConsents';
import LoadingText from '@/components/LoadingText';
import WardAbsences from './WardAbsences';
import WardContacts from './WardContacts';
import WardEvents from './WardEvents';

/** Everything about one ward: events with answers, sick report, trainer contact and the consents (voluntary). */
export default function WardView({ ward, onConsentsChanged }: { ward: WardEntry; onConsentsChanged: () => void }) {
    const { t } = useLanguage();
    const [overview, setOverview] = useState<WardOverview | null>(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const res = await apiFetch<{ data: WardOverview }>(`/guardian/wards/${encodeURIComponent(ward.wardId)}/overview?clubId=${encodeURIComponent(ward.clubId)}`);
            setOverview(res.data);
        } catch {
            setFailed(true);
        }
    }, [ward.wardId, ward.clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (failed)
        return (
            <p role="alert" className="text-sm text-destructive">
                {t('common.error')}{' '}
                <button type="button" onClick={() => void load()} className="font-semibold underline">
                    {t('common.retry')}
                </button>
            </p>
        );
    if (!overview) return <LoadingText />;

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                {overview.ward.category?.name ?? ''}
                {overview.ward.departments.length > 0 && ` · ${overview.ward.departments.map((d) => d.name).join(', ')}`}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                    <WardEvents clubId={ward.clubId} wardId={ward.wardId} />
                    <WardAbsences clubId={ward.clubId} wardId={ward.wardId} canReport={overview.link.canReportAbsence} onChanged={() => void load()} />
                </div>
                <div className="space-y-4">
                    <WardContacts clubId={ward.clubId} wardId={ward.wardId} />
                    <SectionCard title={t('familie.consents.title')}>
                        {!overview.link.canConsent && <p className="mb-3 text-sm text-muted-foreground">{t('familie.consents.noRight')}</p>}
                        <MemberConsents
                            clubId={ward.clubId}
                            clubMemberId={ward.wardId}
                            canDecide={overview.link.canConsent}
                            onChanged={() => {
                                void load();
                                onConsentsChanged();
                            }}
                        />
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
