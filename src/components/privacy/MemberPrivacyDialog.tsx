'use client';

import type { ReactNode } from 'react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { can } from '@/lib/clubPermissions';
import { secondaryButtonClass } from '@/lib/clubMembers';
import DataExportSection from './DataExportSection';
import MemberConsents from './MemberConsents';
import MemberErasureSection from './MemberErasureSection';
import MemberNoticeStamp from './MemberNoticeStamp';
import MemberRequestRecorder from './MemberRequestRecorder';

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold text-foreground">{title}</h3>
            {children}
        </section>
    );
}

/**
 * "Datenschutz" of one member in the member file (Wave 10 W2), also for members without an account: consents with history and
 * paper proof, the Art. 14 privacy notice stamp, recording of a request with its deadline, the data export and the erasure with
 * plan preview. Every block is gated by `permissions` (`privacy:read` to look, `privacy:manage` to act, `members:write` also
 * for the notice stamp); the backend decides again.
 */
export default function MemberPrivacyDialog({ clubId, clubMemberId, name, permissions, onClose, onErased }: { clubId: string; clubMemberId: string; name: string; permissions: readonly string[]; onClose: () => void; onErased?: () => void }) {
    const { t } = useLanguage();
    const canManage = can(permissions, 'privacy:manage');
    const canStamp = canManage || can(permissions, 'members:write');
    return (
        <Modal
            open
            size="lg"
            onClose={onClose}
            title={t('privacy.file.title', { name })}
            footer={
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className={secondaryButtonClass}>
                        {t('common.close')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <Section title={t('privacy.file.consents')}>
                    <MemberConsents clubId={clubId} clubMemberId={clubMemberId} canDecide={false} board={canManage} showHistory />
                </Section>
                <Section title={t('privacy.file.notice')}>
                    <MemberNoticeStamp clubId={clubId} clubMemberId={clubMemberId} canStamp={canStamp} />
                </Section>
                {canManage && (
                    <>
                        <Section title={t('privacy.file.requests')}>
                            <MemberRequestRecorder clubId={clubId} clubMemberId={clubMemberId} />
                        </Section>
                        <Section title={t('privacy.file.export')}>
                            <DataExportSection clubId={clubId} target={{ kind: 'board', clubMemberId }} />
                        </Section>
                        <Section title={t('privacy.file.erasure')}>
                            <MemberErasureSection clubId={clubId} clubMemberId={clubMemberId} displayName={name} onErased={() => onErased?.()} />
                        </Section>
                    </>
                )}
            </div>
        </Modal>
    );
}
