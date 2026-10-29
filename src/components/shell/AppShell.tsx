'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { breadcrumbsFor, buildNavGroups } from '@/lib/navigation';
import { ActiveClubProvider, useActiveClub } from '@/components/shell/ActiveClubProvider';
import ClubSwitcher from '@/components/shell/ClubSwitcher';
import Sidebar from '@/components/shell/Sidebar';
import { Skeleton } from '@/components/ui';

const COLLAPSED_KEY = 'myverein.sidebarCollapsed';

function Breadcrumbs() {
    const { t } = useLanguage();
    const pathname = usePathname();
    const tab = useSearchParams().get('tab');
    const crumbs = breadcrumbsFor(pathname, tab);
    return (
        <nav aria-label={t('shell.breadcrumb')} className="min-w-0">
            <ol className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                {crumbs.map((c, i) => (
                    <li key={c.labelKey} className="flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden="true">/</span>}
                        {c.href ? (
                            <Link href={c.href} className="hover:text-foreground hover:underline">
                                {t(c.labelKey)}
                            </Link>
                        ) : (
                            <span aria-current="page" className="font-medium text-foreground">
                                {t(c.labelKey)}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

function ShellBody({ switchKey, children }: { switchKey: number; children: ReactNode }) {
    const { t } = useLanguage();
    const { clubs, hasWards, permissions, roles } = useActiveClub();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // localStorage is browser-only; read after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1');
    }, []);

    useEffect(() => {
        // Close the mobile drawer on navigation (prop-change reset).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDrawer(false);
    }, [pathname]);

    useEffect(() => {
        if (!drawer) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDrawer(false);
                menuButton.current?.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
        return () => document.removeEventListener('keydown', onKey);
    }, [drawer]);

    const toggleCollapsed = () => {
        setCollapsed((c) => {
            window.localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
            return !c;
        });
    };

    const groups = buildNavGroups({ hasClub: (clubs?.length ?? 0) > 0, hasWards, permissions, roles });
    // While the clubs are unknown the sidebar would flash the wrong structure.
    const ready = clubs !== null;

    return (
        <div className="flex min-h-[calc(100vh-4rem)]">
            {ready && (
                <aside className={`sticky top-16 hidden h-[calc(100vh-4rem)] shrink-0 border-r border-border bg-card md:block ${collapsed ? 'w-16' : 'w-60'}`}>
                    <Sidebar groups={groups} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
                </aside>
            )}
            <div className="min-w-0 flex-1">
                <div className="sticky top-16 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background/90 px-4 py-2 backdrop-blur sm:px-6">
                    {ready && (
                        <button
                            ref={menuButton}
                            type="button"
                            onClick={() => setDrawer((d) => !d)}
                            aria-expanded={drawer}
                            aria-controls="mobile-sidebar"
                            aria-label={t(drawer ? 'shell.menu.close' : 'shell.menu.open')}
                            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:hidden"
                        >
                            {drawer ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
                        </button>
                    )}
                    <ClubSwitcher />
                    <div className="hidden min-w-0 flex-1 lg:block">
                        <Suspense fallback={null}>
                            <Breadcrumbs />
                        </Suspense>
                    </div>
                </div>
                {ready && drawer && (
                    <div className="fixed inset-0 top-16 z-40 md:hidden" role="presentation">
                        <button type="button" aria-label={t('shell.menu.close')} tabIndex={-1} className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
                        <div id="mobile-sidebar" ref={drawerRef} className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-card shadow-xl">
                            <Sidebar groups={groups} collapsed={false} onNavigate={() => setDrawer(false)} />
                        </div>
                    </div>
                )}
                <div key={switchKey} className="bg-background">
                    {children}
                </div>
            </div>
        </div>
    );
}

/** Signed-in app frame (Wave 14 S1): club switcher + search + breadcrumbs header, collapsible grouped sidebar (drawer on small screens). */
export default function AppShell({ children }: { children: ReactNode }) {
    return (
        <ActiveClubProvider>
            {(switchKey) => (
                <Suspense fallback={<Skeleton className="mx-auto max-w-6xl px-4 py-10" />}>
                    <ShellBody switchKey={switchKey}>{children}</ShellBody>
                </Suspense>
            )}
        </ActiveClubProvider>
    );
}
