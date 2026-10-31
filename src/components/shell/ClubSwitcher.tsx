'use client';

import { Building2 } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveClub } from '@/components/shell/ActiveClubProvider';

/** Active club in the header; a native select (keyboard and screen reader friendly) when the account belongs to more than one. */
export default function ClubSwitcher() {
    const { t } = useLanguage();
    const { clubs, activeClub, switchClub } = useActiveClub();
    if (!clubs || clubs.length === 0 || !activeClub) return null;
    const name = (c: { clubName: string | null }) => c.clubName ?? t('shell.club.unnamed');
    return (
        <div className="flex min-w-0 items-center gap-2 text-sm">
            <Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            {clubs.length === 1 ? (
                <span className="truncate font-medium text-foreground" title={t('shell.club.current')}>
                    {name(activeClub)}
                </span>
            ) : (
                <>
                    <label htmlFor="club-switcher" className="sr-only">
                        {t('shell.club.switch')}
                    </label>
                    <select
                        id="club-switcher"
                        value={activeClub.clubId}
                        onChange={(e) => switchClub(e.target.value)}
                        className="min-h-11 max-w-[14rem] truncate rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                        {clubs.map((c) => (
                            <option key={c.clubId} value={c.clubId}>
                                {name(c)}
                            </option>
                        ))}
                    </select>
                </>
            )}
        </div>
    );
}
