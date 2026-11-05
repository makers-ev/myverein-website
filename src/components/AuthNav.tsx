'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, FileText, Vote, ChevronDown, Clock, HeartHandshake, LogOut, MapPin, Megaphone, Settings as SettingsIcon, Users } from 'lucide-react';

import { authClient } from '@/lib/auth-client';
import { clearReminder } from '@/lib/consents';
import { clearAllStoredInviteTokens } from '@/lib/memberLifecycle';
import { type AccountScope, loadAccountScope, visibleAppLinks } from '@/lib/familie';
import { useLanguage } from '@/contexts/LanguageContext';
import { NotificationBell } from '@/components/NotificationBell';
import { InboxLink } from '@/components/InboxLink';

export interface AuthNavAppLink {
    name: string;
    href: string;
}

// Icon per member-only function link, keyed by translation key -- mirrors
// this repo's own convention (see Homepage.tsx's NEXT_CARDS) of an explicit
// slug/name -> icon map rather than guessing an icon from the href.
const APP_LINK_ICONS: Record<string, typeof Users> = {
    'nav.verein': Users,
    'nav.mitteilungen': Megaphone,
    'nav.kalender': CalendarDays,
    'nav.abstimmungen': Vote,
    'nav.standorte': MapPin,
    'nav.verfuegbarkeit': Clock,
    'nav.familie': HeartHandshake,
    'nav.dokumente': FileText,
};

// Guardian area (Wave 10 W3): offered to accounts with wards; a guardian-only account sees nothing else of the club.
const FAMILY_LINK: AuthNavAppLink = { name: 'nav.familie', href: '/familie' };
// Document archive (Wave 13 W2): one page for every club member: archive (folder rights), confirmations, membership card.
const DOCUMENTS_LINK: AuthNavAppLink = { name: 'nav.dokumente', href: '/dokumente' };

/**
 * Client-side, optimistic auth slot for the Navbar's `guestNav`/`mobileGuestNav`
 * props. Deliberately not the source of truth for access control -- that's
 * `(protected)/layout.tsx`'s server-side session recheck. This only decides
 * what to *show* in the nav, same "optimistic only" principle src/proxy.ts's
 * own comment describes for middleware-level checks.
 */
export function AuthNav({ appLinks = [] }: { appLinks?: AuthNavAppLink[] }) {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    // Club / wards of the signed-in account (null = unknown yet: no app links; `scopeFailed` falls back to the full menu, the pages enforce access anyway).
    const [scope, setScope] = useState<AccountScope | null>(null);
    const [scopeFailed, setScopeFailed] = useState(false);
    const signedIn = !!session;
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        if (!signedIn) return;
        let cancelled = false;
        loadAccountScope()
            .then((s) => !cancelled && setScope(s))
            .catch(() => !cancelled && setScopeFailed(true));
        return () => {
            cancelled = true;
        };
    }, [signedIn]);

    if (isPending) {
        return <div className="h-9 w-20" aria-hidden="true" />;
    }

    if (!session) {
        return (
            <Link
                href="/login-signup"
                className="inline-flex min-h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
            >
                {t('auth.nav.signin')}
            </Link>
        );
    }

    const displayName = session.user.name ?? session.user.email;
    const links = visibleAppLinks(appLinks, scope, FAMILY_LINK, scopeFailed, DOCUMENTS_LINK);

    return (
        <div className="flex items-center gap-1">
            <InboxLink />
            <NotificationBell />
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setIsOpen((v) => !v)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">
                        {displayName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline">{displayName}</span>
                    <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="animate-menu absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-border bg-card p-1.5 shadow-lg">
                        {links.length > 0 && (
                            <>
                                {links.map((link) => {
                                    const Icon = APP_LINK_ICONS[link.name];
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsOpen(false)}
                                            className="flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                                        >
                                            {Icon && <Icon size={16} strokeWidth={1.5} className="text-muted-foreground" />}
                                            {t(link.name)}
                                        </Link>
                                    );
                                })}
                                <div className="my-1 border-t border-border" />
                            </>
                        )}
                        <Link
                            href="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            <SettingsIcon size={16} strokeWidth={1.5} className="text-muted-foreground" />
                            {t('auth.nav.settings')}
                        </Link>
                        <button
                            onClick={async () => {
                                setIsOpen(false);
                                clearAllStoredInviteTokens();
                                clearReminder();
                                await authClient.signOut();
                                router.push('/');
                                router.refresh();
                            }}
                            className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            <LogOut size={16} strokeWidth={1.5} className="text-muted-foreground" />
                            {t('auth.nav.signout')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
