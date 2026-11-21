'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import ClubFinder from '@/components/publicClub/ClubFinder';
import JoinClubCard from '@/components/verein/JoinClubCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { consumeJoinIntent } from '@/lib/joinIntent';

/**
 * "Einem weiteren Verein beitreten" on the club page of a person who already is in a club (the join card of the no-club state does
 * not show then). Closed by default; opened by a "Beitreten" click on the public club page or the club finder (`joinIntent`).
 */
export default function MoreClubsSection({ onRefreshClubs }: { onRefreshClubs: () => void }) {
    const { t } = useLanguage();
    // Lazy: the section only mounts after the club list was loaded in the browser, so reading storage here is safe.
    const [open, setOpen] = useState(() => consumeJoinIntent());
    const [picked, setPicked] = useState<string | undefined>(undefined);
    return (
        <section className="mt-8 rounded-xl border border-hairline">
            <h2 className="text-base font-semibold text-foreground">
                <button type="button" aria-expanded={open} aria-controls="more-clubs-body" onClick={() => setOpen((v) => !v)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-4 text-left">
                    {t('verein.more.title')}
                    <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
            </h2>
            {open && (
                <div id="more-clubs-body" className="space-y-4 px-4 pb-4">
                    <p className="text-sm text-muted-foreground">{t('verein.more.body')}</p>
                    <ClubFinder onPick={setPicked} heading="h3" />
                    {picked && (
                        <p role="status" className="rounded-lg border border-control bg-muted/50 px-3 py-2 text-sm text-foreground">
                            {t('finder.picked', { slug: picked })}
                        </p>
                    )}
                    <JoinClubCard onRefresh={onRefreshClubs} className="mt-0" suggestedSlug={picked} />
                </div>
            )}
        </section>
    );
}
