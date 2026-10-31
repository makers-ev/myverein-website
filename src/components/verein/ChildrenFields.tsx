'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import MemberCustomFields from '@/components/verein/MemberCustomFields';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { asChildren, type Child, childName } from '@/lib/children';
import { anyDirty, type DirtyMap, setDirtyFlag } from '@/lib/dirtyMap';

/**
 * "Zusatzangaben von <Kind>" in "Mein Profil" for guardians: one `MemberCustomFields` section per child the caller is an active
 * guardian of (`GET /club-members/me/children`). The server decides what a guardian sees and may change (only fields the child
 * could see/edit itself, never sensitive ones); values are saved with the usual `PUT`. For everybody who has no children, and on
 * any error, nothing is rendered -- no loading text, no message -- so the area reveals nothing about guardianship.
 */
/** One child's section; owns a stable dirty callback so the section's effects never re-run because of a new function identity. */
function ChildSection({ clubId, child, onDirty }: { clubId: string; child: Child; onDirty: (id: string, dirty: boolean) => void }) {
    const { t } = useLanguage();
    const id = child.clubMemberId;
    const report = useCallback((dirty: boolean) => onDirty(id, dirty), [onDirty, id]);
    return <MemberCustomFields clubId={clubId} target={id} title={t('forms.cf.child.title', { name: childName(child) ?? t('forms.cf.child.unnamed') })} onDirtyChange={report} disableGuard guardianView />;
}

export default function ChildrenFields({ clubId, onDirtyChange }: { clubId: string; onDirtyChange?: (dirty: boolean) => void }) {
    const [children, setChildren] = useState<Child[]>([]);
    const [dirty, setDirty] = useState<DirtyMap>({});
    const onDirty = useCallback((id: string, d: boolean) => setDirty((prev) => setDirtyFlag(prev, id, d)), []);

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

    const unsaved = anyDirty(dirty);
    const reportRef = useRef(onDirtyChange);
    useEffect(() => {
        reportRef.current = onDirtyChange;
    });
    useEffect(() => {
        reportRef.current?.(unsaved);
    }, [unsaved]);

    if (children.length === 0) return null;
    return (
        <>
            {children.map((child) => (
                <ChildSection key={child.clubMemberId} clubId={clubId} child={child} onDirty={onDirty} />
            ))}
        </>
    );
}
