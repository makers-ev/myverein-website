'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserX } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ClubAbsence, periodLabel } from '@/lib/absences';
import { addDaysIso, formatDate, inputClass, todayIso } from '@/lib/clubMembers';
import { Chip, EmptyState, SectionCard, errorMessage } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

const RANGES = [0, 7, 14, 30] as const;

/**
 * "Wer fehlt" (Wave 10 W5, `absences:read`): reports overlapping the chosen period, grouped by person, with kind and the
 * short note the member wrote. A trainer only gets members of the own departments from the backend; the department filter
 * narrows that further. Read only: reports are withdrawn by the person (or guardian) who made them.
 */
export default function AbsencesBoardPanel({ clubId, departments }: { clubId: string; departments: { id: string; name: string }[] }) {
    const { t, language } = useLanguage();
    const [days, setDays] = useState<(typeof RANGES)[number]>(14);
    const [departmentId, setDepartmentId] = useState('');
    const [rows, setRows] = useState<ClubAbsence[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        setRows(null);
        const from = todayIso();
        const params = new URLSearchParams({ clubId, from, to: addDaysIso(from, days) });
        if (departmentId) params.set('departmentId', departmentId);
        try {
            const res = await apiFetch<{ data: ClubAbsence[] }>(`/absences/club?${params.toString()}`);
            setRows(res.data);
        } catch (err) {
            setError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, days, departmentId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    return (
        <SectionCard title={t('absence.board.title')}>
            <p className="mb-3 text-sm text-muted-foreground">{t('absence.board.intro')}</p>
            <div className="mb-4 flex flex-wrap gap-3">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('absence.board.range')}</span>
                    <select value={days} onChange={(e) => setDays(Number(e.target.value) as (typeof RANGES)[number])} className={inputClass}>
                        {RANGES.map((d) => (
                            <option key={d} value={d}>
                                {t(`absence.board.range.${d}`)}
                            </option>
                        ))}
                    </select>
                </label>
                {departments.length > 0 && (
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('absence.board.department')}</span>
                        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                            <option value="">{t('absence.board.department.all')}</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : rows === null ? (
                <LoadingText />
            ) : rows.length === 0 ? (
                <EmptyState icon={<UserX className="h-6 w-6" aria-hidden />} text={t('absence.board.empty')} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2">{t('absence.board.name')}</th>
                                <th className="px-3 py-2">{t('absence.board.kind')}</th>
                                <th className="px-3 py-2">{t('absence.board.period')}</th>
                                <th className="px-3 py-2">{t('absence.board.note')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t border-border text-foreground">
                                    <td className="px-3 py-2 font-medium">{r.displayName}</td>
                                    <td className="px-3 py-2">
                                        <Chip tone={r.kind === 'krank' ? 'warning' : 'muted'}>{t(`absence.kind.${r.kind}`)}</Chip>
                                    </td>
                                    <td className="px-3 py-2">{periodLabel(r.startsOn, r.endsOn, (d) => formatDate(d, language))}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{r.note ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    );
}
