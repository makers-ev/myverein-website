'use client';

import { useEffect, useState } from 'react';

import MemberCustomFields from '@/components/verein/MemberCustomFields';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { asChildren, type Child, childName } from '@/lib/children';

/**
 * "Zusatzangaben von <Kind>" in "Mein Profil" for guardians: one `MemberCustomFields` section per child the caller is an active
 * guardian of (`GET /club-members/me/children`). The server decides what a guardian sees and may change (only fields the child
 * could see/edit itself, never sensitive ones); values are saved with the usual `PUT`. For everybody who has no children, and on
 * any error, nothing is rendered -- no loading text, no message -- so the area reveals nothing about guardianship.
 */
export default function ChildrenFields({ clubId, onDirtyChange }: { clubId: string; onDirtyChange?: (dirty: boolean) => void }) {
    const { t } = useLanguage();
    const [children, setChildren] = useState<Child[]>([]);
    const [dirty, setDirty] = useState<Record<string, boolean>>({});

    useEffect(() => {
        let cancelled = false;
        apiFetch<unknown>(`/club-members/me/children?clubId=${clubId}`)
            .then((res) => {
                if (!cancelled) setChildren(asChildren(res));
            })
            .catch(() => {
                if (!cancelled) setChildren([]);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId]);

    const anyDirty = Object.values(dirty).some(Boolean);
    useEffect(() => {
        onDirtyChange?.(anyDirty);
    }, [anyDirty, onDirtyChange]);

    if (children.length === 0) return null;
    return (
        <>
            {children.map((child) => {
                const name = childName(child) ?? t('forms.cf.child.unnamed');
                return (
                    <MemberCustomFields
                        key={child.clubMemberId}
                        clubId={clubId}
                        target={child.clubMemberId}
                        title={t('forms.cf.child.title', { name })}
                        onDirtyChange={(d) => setDirty((prev) => (prev[child.clubMemberId] === d ? prev : { ...prev, [child.clubMemberId]: d }))}
                    />
                );
            })}
        </>
    );
}
