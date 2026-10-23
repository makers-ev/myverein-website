'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type RetentionPolicies, type RetentionPreviewItem, type RetentionRule, daysLabel, privacyErrorKey, retentionProblem } from '@/lib/privacyAdmin';
import { Chip, SectionCard } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

interface RetentionRun {
    id: string;
    category: string;
    dryRun: boolean;
    notice: boolean;
    scanned: number;
    affected: number;
    errors: number;
    startedAt: string;
}

function Period({ days }: { days: number }) {
    const { t } = useLanguage();
    const l = daysLabel(days);
    return <>{t(l.unit === 'years' ? 'privacy.retention.years' : 'privacy.retention.days', { count: l.count })}</>;
}

function RuleRow({ clubId, rule, preview, canManage, onChanged }: { clubId: string; rule: RetentionRule; preview: number | null; canManage: boolean; onChanged: () => void }) {
    const { t } = useLanguage();
    const [value, setValue] = useState(String(rule.effectiveDays));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const path = `/retention-policies/${encodeURIComponent(rule.category)}?clubId=${encodeURIComponent(clubId)}`;
    const changed = value.trim() !== String(rule.effectiveDays);

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await action();
            onChanged();
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    function save() {
        const problem = retentionProblem(rule, value);
        if (problem) {
            setError(t(problem, { min: rule.minDays, max: rule.maxDays }));
            return;
        }
        void run(() => apiFetch(path, { method: 'PUT', body: { retainDays: Number(value) } }));
    }

    return (
        <tr className="border-t border-border align-top text-foreground">
            <td className="px-3 py-2">
                <p className="font-medium">{rule.label}</p>
                <p className="text-xs text-muted-foreground">{rule.description}</p>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
                <Period days={rule.defaultDays} />
            </td>
            <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                <Period days={rule.minDays} /> – <Period days={rule.maxDays} />
            </td>
            <td className="px-3 py-2">
                {canManage && rule.editable ? (
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                inputMode="numeric"
                                aria-label={t('privacy.retention.override', { name: rule.label })}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className={`${inputClass} w-24`}
                            />
                            <span className="text-xs text-muted-foreground">{t('privacy.retention.daysUnit')}</span>
                            <button type="button" disabled={busy || !changed} onClick={save} className={secondaryButtonClass}>
                                {t('privacy.retention.save')}
                            </button>
                            {rule.overridden && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void run(async () => { await apiFetch(path, { method: 'DELETE' }); })}
                                    className="text-xs font-medium text-primary underline"
                                >
                                    {t('privacy.retention.reset')}
                                </button>
                            )}
                        </div>
                        {error && (
                            <p role="alert" className="text-xs text-destructive">
                                {error}
                            </p>
                        )}
                    </div>
                ) : (
                    <span className="flex flex-wrap items-center gap-2">
                        <Period days={rule.effectiveDays} />
                        {!rule.editable && <Chip tone="muted">{t('privacy.retention.fixed')}</Chip>}
                    </span>
                )}
                {rule.overridden && <Chip tone="primary">{t('privacy.retention.overridden')}</Chip>}
            </td>
            <td className="px-3 py-2 text-muted-foreground">{preview === null ? '—' : t('privacy.retention.due', { count: preview })}</td>
        </tr>
    );
}

/**
 * Retention rules of the club (Wave 10 W5, `privacy:read`; changes `privacy:manage`): the statutory defaults, the room the club
 * has to shorten or lengthen a period (an override inside the bounds only), what the next sweep would concern (counts only)
 * and the sweep log. While the server runs in test mode (`dryRun`), nothing is deleted yet and the page says so.
 */
export default function RetentionPanel({ clubId, canManage }: { clubId: string; canManage: boolean }) {
    const { t, language } = useLanguage();
    const [policies, setPolicies] = useState<RetentionPolicies | null>(null);
    const [preview, setPreview] = useState<RetentionPreviewItem[]>([]);
    const [runs, setRuns] = useState<RetentionRun[]>([]);
    const [loadError, setLoadError] = useState(false);
    const query = `clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const [p, pv, r] = await Promise.all([
                apiFetch<{ data: RetentionPolicies }>(`/retention-policies?${query}`),
                apiFetch<{ data: RetentionPreviewItem[] }>(`/retention-policies/preview?${query}`),
                apiFetch<{ data: RetentionRun[] }>(`/retention-policies/runs?${query}&pageSize=10`),
            ]);
            setPolicies(p.data);
            setPreview(pv.data);
            setRuns(r.data);
        } catch {
            setLoadError(true);
        }
    }, [query]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (loadError)
        return (
            <SectionCard title={t('privacy.retention.title')}>
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            </SectionCard>
        );
    if (!policies)
        return (
            <SectionCard title={t('privacy.retention.title')}>
                <LoadingText />
            </SectionCard>
        );

    const clubRules = policies.rules.filter((r) => r.scope === 'club');
    const platformRules = policies.rules.filter((r) => r.scope === 'platform');
    const dueOf = (category: string) => preview.find((p) => p.category === category)?.due ?? null;
    const categoryLabel = (category: string) => policies.rules.find((r) => r.category === category)?.label ?? category;

    return (
        <div className="space-y-6">
            <SectionCard title={t('privacy.retention.title')}>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t('privacy.retention.intro')}</p>
                    {policies.dryRun && (
                        <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                            {t('privacy.retention.dryRun')}
                        </p>
                    )}
                    {clubRules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('privacy.retention.empty')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">{t('privacy.retention.col.rule')}</th>
                                        <th className="px-3 py-2">{t('privacy.retention.col.default')}</th>
                                        <th className="px-3 py-2">{t('privacy.retention.col.bounds')}</th>
                                        <th className="px-3 py-2">{t('privacy.retention.col.effective')}</th>
                                        <th className="px-3 py-2">{t('privacy.retention.col.preview')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clubRules.map((rule) => (
                                        <RuleRow key={rule.category} clubId={clubId} rule={rule} preview={dueOf(rule.category)} canManage={canManage} onChanged={() => void load()} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">{t('privacy.retention.noticeHint', { days: policies.noticeDays })}</p>
                    {platformRules.length > 0 && (
                        <details className="text-sm">
                            <summary className="cursor-pointer font-medium text-primary">{t('privacy.retention.platform')}</summary>
                            <ul className="mt-2 space-y-1.5">
                                {platformRules.map((r) => (
                                    <li key={r.category} className="text-foreground">
                                        <span className="font-medium">{r.label}</span>: <Period days={r.effectiveDays} />
                                        <span className="block text-xs text-muted-foreground">{r.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>
            </SectionCard>

            <SectionCard title={t('privacy.retention.runs.title')}>
                {runs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('privacy.retention.runs.empty')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">{t('privacy.retention.runs.date')}</th>
                                    <th className="px-3 py-2">{t('privacy.retention.col.rule')}</th>
                                    <th className="px-3 py-2">{t('privacy.retention.runs.mode')}</th>
                                    <th className="px-3 py-2">{t('privacy.retention.runs.scanned')}</th>
                                    <th className="px-3 py-2">{t('privacy.retention.runs.affected')}</th>
                                    <th className="px-3 py-2">{t('privacy.retention.runs.errors')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.map((r) => (
                                    <tr key={r.id} className="border-t border-border text-foreground">
                                        <td className="px-3 py-2">{formatDate(r.startedAt, language)}</td>
                                        <td className="px-3 py-2">{categoryLabel(r.category)}</td>
                                        <td className="px-3 py-2">{t(r.notice ? 'privacy.retention.runs.notice' : r.dryRun ? 'privacy.retention.runs.dry' : 'privacy.retention.runs.real')}</td>
                                        <td className="px-3 py-2">{r.scanned}</td>
                                        <td className="px-3 py-2">{r.affected}</td>
                                        <td className="px-3 py-2">{r.errors}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
