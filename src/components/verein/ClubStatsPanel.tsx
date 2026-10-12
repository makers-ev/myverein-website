'use client';

import { useCallback, useEffect, useState } from 'react';

import { ColumnChart } from '@/components/charts/ColumnChart';
import { HBarList } from '@/components/charts/HBarList';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { dateLocale, memberErrorKey, secondaryButtonClass } from '@/lib/clubMembers';

/** `GET /club-stats` (backend README "Club KPIs"): aggregates only, no personal data. */
interface ClubStats {
    members: { total: number; active: number; withAccount: number; withoutAccount: number };
    byStatus: Record<string, number>;
    byCategory: { key: string; name: string; count: number }[];
    byDepartment: { id: string; name: string; count: number }[];
    ageBuckets: { label: string; count: number }[];
    ageUnknown: number;
    movement: { month: string; joined: number; left: number }[];
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
            {children}
        </section>
    );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint?: string }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

/**
 * Board KPI dashboard (Wave 7 W8). Only mounted with the `club_stats:read` permission from /club-members/me; the
 * backend answers 403 for everybody else. Charts are hand-rolled SVG (src/components/charts), no dependency.
 */
export default function ClubStatsPanel({ clubId }: { clubId: string }) {
    const { t, language } = useLanguage();
    const [stats, setStats] = useState<ClubStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: ClubStats }>(`/club-stats?clubId=${clubId}`);
            setStats(res.data);
            setError(null);
        } catch (err) {
            setError(t(memberErrorKey(err)));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (error) {
        return (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                <p className="text-destructive">{error}</p>
                <button type="button" onClick={() => void load()} className={`${secondaryButtonClass} mt-3`}>
                    {t('verein.create.retry')}
                </button>
            </div>
        );
    }
    if (!stats) {
        return (
            <p className="text-sm text-muted-foreground" role="status">
                {t('verein.members.loading')}
            </p>
        );
    }

    const { members } = stats;
    if (members.total === 0 && stats.movement.every((m) => m.joined === 0 && m.left === 0)) {
        return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('verein.stats.empty')}</p>;
    }

    const share = (n: number) => (members.total > 0 ? t('verein.stats.share', { percent: Math.round((n / members.total) * 100) }) : undefined);
    const monthLabel = (ym: string) => {
        const [y, m] = ym.split('-').map(Number);
        return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString(dateLocale(language), { month: 'short', year: '2-digit' });
    };
    const ageTotal = stats.ageBuckets.reduce((s, b) => s + b.count, 0);
    const joinedSum = stats.movement.reduce((s, m) => s + m.joined, 0);
    const leftSum = stats.movement.reduce((s, m) => s + m.left, 0);

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{t('verein.stats.hint')}</p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi label={t('verein.stats.total')} value={members.total} hint={t('verein.stats.total.hint')} />
                <Kpi label={t('verein.stats.active')} value={members.active} hint={share(members.active)} />
                <Kpi label={t('verein.stats.withAccount')} value={members.withAccount} hint={share(members.withAccount)} />
                <Kpi label={t('verein.stats.withoutAccount')} value={members.withoutAccount} hint={share(members.withoutAccount)} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card title={t('verein.stats.byCategory')}>
                    {stats.byCategory.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('verein.stats.none')}</p>
                    ) : (
                        <HBarList items={stats.byCategory.map((c) => ({ id: c.key, label: c.name, value: c.count }))} />
                    )}
                </Card>

                <Card title={t('verein.stats.byDepartment')}>
                    {stats.byDepartment.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('verein.stats.none')}</p>
                    ) : (
                        <HBarList items={stats.byDepartment.map((d) => ({ id: d.id, label: d.name, value: d.count }))} fillClass="fill-accent" />
                    )}
                </Card>
            </div>

            <Card title={t('verein.stats.age')}>
                {ageTotal === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('verein.stats.age.none')}</p>
                ) : (
                    <ColumnChart
                        ariaLabel={t('verein.stats.age')}
                        data={stats.ageBuckets.map((b) => ({ label: b.label, values: { count: b.count } }))}
                        series={[{ key: 'count', label: t('verein.stats.members'), fillClass: 'fill-primary', textClass: 'text-foreground', bgClass: 'bg-primary' }]}
                    />
                )}
                {stats.ageUnknown > 0 && <p className="mt-2 text-xs text-muted-foreground">{t('verein.stats.age.unknown', { count: stats.ageUnknown })}</p>}
            </Card>

            <Card title={t('verein.stats.movement')}>
                {joinedSum === 0 && leftSum === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('verein.stats.movement.none')}</p>
                ) : (
                    <>
                        <ColumnChart
                            ariaLabel={t('verein.stats.movement')}
                            data={stats.movement.map((m) => ({ label: monthLabel(m.month), values: { joined: m.joined, left: m.left } }))}
                            series={[
                                { key: 'joined', label: t('verein.stats.joined'), fillClass: 'fill-success', textClass: 'text-success', bgClass: 'bg-success' },
                                { key: 'left', label: t('verein.stats.left'), fillClass: 'fill-destructive', textClass: 'text-destructive', bgClass: 'bg-destructive' },
                            ]}
                        />
                        <p className="mt-2 text-xs text-muted-foreground">{t('verein.stats.movement.sum', { joined: joinedSum, left: leftSum })}</p>
                    </>
                )}
            </Card>
        </div>
    );
}
