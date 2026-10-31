'use client';

import type { ReactNode } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import DataExportSection from './DataExportSection';
import FieldVisibility from './FieldVisibility';
import MemberConsents from './MemberConsents';
import OwnErasureRequest from './OwnErasureRequest';

function Block({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold text-foreground">{title}</h3>
            {children}
        </section>
    );
}

/**
 * "Mein Datenschutz" in the profile of the club (Wave 10 W4): the member's own consents (voluntary, with the text and
 * revocation at any time), who may see their contact data, the data export (Art. 15) and the erasure request (Art. 17).
 * Needs the member's own `clubMemberId` (`GET /club-members/me`); every call is the member's own right, no permission needed.
 */
export default function MyPrivacyPanel({ clubId, clubMemberId }: { clubId: string; clubMemberId: string }) {
    const { t } = useLanguage();
    return (
        <section aria-label={t('privacy.own.title')} className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-foreground">{t('privacy.own.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('privacy.own.intro')}</p>
            </div>
            <Block title={t('privacy.own.consents')}>
                <MemberConsents clubId={clubId} clubMemberId={clubMemberId} canDecide showHistory />
            </Block>
            <Block title={t('privacy.own.visibility')}>
                <FieldVisibility clubId={clubId} clubMemberId={clubMemberId} />
            </Block>
            <Block title={t('privacy.own.export')}>
                <DataExportSection clubId={clubId} target={{ kind: 'self' }} />
            </Block>
            <Block title={t('privacy.own.erasure')}>
                <OwnErasureRequest clubId={clubId} />
            </Block>
        </section>
    );
}
