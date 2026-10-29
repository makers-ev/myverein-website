'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Building2, CalendarDays, ClipboardList, Clock, FileText, Home, HeartHandshake, LayoutGrid, LogOut, Megaphone, MapPin, PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon, ShieldCheck, UserCircle, Users, Vote, BarChart3, FormInput, CalendarOff, type LucideIcon } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { isEntryActive, type NavGroup, type NavIcon } from '@/lib/navigation';

const ICONS: Record<NavIcon, LucideIcon> = {
    today: Home,
    club: Building2,
    members: Users,
    departments: LayoutGrid,
    profile: UserCircle,
    announcements: Megaphone,
    votes: Vote,
    family: HeartHandshake,
    calendar: CalendarDays,
    availability: Clock,
    locations: MapPin,
    documents: FileText,
    applications: ClipboardList,
    exits: LogOut,
    stats: BarChart3,
    forms: FormInput,
    absences: CalendarOff,
    privacy: ShieldCheck,
    settings: SettingsIcon,
};

/** Grouped, collapsible side navigation. `collapsed` shows icons only (desktop); the mobile drawer always renders it expanded. */
export default function Sidebar({ groups, collapsed, onToggleCollapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onToggleCollapsed?: () => void; onNavigate?: () => void }) {
    const { t } = useLanguage();
    const pathname = usePathname();
    const tab = useSearchParams().get('tab');
    return (
        <nav aria-label={t('shell.sidebar.label')} className="flex h-full flex-col gap-4 overflow-y-auto p-3">
            {groups.map((g) => (
                <div key={g.id}>
                    <h2 className={`px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${collapsed ? 'sr-only' : ''}`}>{t(g.labelKey)}</h2>
                    <ul className="space-y-0.5">
                        {g.entries.map((e) => {
                            const Icon = ICONS[e.icon];
                            const active = isEntryActive(e, pathname, tab);
                            return (
                                <li key={e.id}>
                                    <Link
                                        href={e.href}
                                        onClick={onNavigate}
                                        aria-current={active ? 'page' : undefined}
                                        title={collapsed ? t(e.labelKey) : undefined}
                                        className={`flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                                    >
                                        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                                        <span className={collapsed ? 'sr-only' : 'truncate'}>{t(e.labelKey)}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
            {onToggleCollapsed && (
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    aria-expanded={!collapsed}
                    className="mt-auto flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                    {collapsed ? <PanelLeftOpen aria-hidden="true" className="h-5 w-5" /> : <PanelLeftClose aria-hidden="true" className="h-5 w-5" />}
                    <span className={collapsed ? 'sr-only' : ''}>{t(collapsed ? 'shell.sidebar.expand' : 'shell.sidebar.collapse')}</span>
                </button>
            )}
        </nav>
    );
}
