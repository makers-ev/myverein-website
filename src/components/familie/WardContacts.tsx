'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type WardContact } from '@/lib/familie';
import { SectionCard } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

/** Trainers / department leads of the ward: the name always, phone and e-mail only when they opened them for members. */
export default function WardContacts({ clubId, wardId }: { clubId: string; wardId: string }) {
    const { t } = useLanguage();
    const [contacts, setContacts] = useState<WardContact[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: WardContact[] }>(`/guardian/wards/${encodeURIComponent(wardId)}/contacts?clubId=${encodeURIComponent(clubId)}`)
            .then((res) => !cancelled && setContacts(res.data))
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, [clubId, wardId]);

    return (
        <SectionCard title={t('familie.contacts.title')}>
            {failed ? (
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}
                </p>
            ) : !contacts ? (
                <LoadingText />
            ) : contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('familie.contacts.empty')}</p>
            ) : (
                <ul className="space-y-3">
                    {contacts.map((c) => (
                        <li key={`${c.clubMemberId}-${c.department.id}-${c.roleType}`} className="text-sm">
                            <p className="font-semibold text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {t(`verein.role.${c.roleType}`)} · {c.department.name}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                {c.phone && (
                                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 text-primary underline">
                                        <Phone className="h-3.5 w-3.5" aria-hidden />
                                        {c.phone}
                                    </a>
                                )}
                                {c.email && (
                                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-primary underline">
                                        <Mail className="h-3.5 w-3.5" aria-hidden />
                                        {c.email}
                                    </a>
                                )}
                                {!c.phone && !c.email && <span className="text-xs text-muted-foreground">{t('familie.contacts.noDetails')}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}
