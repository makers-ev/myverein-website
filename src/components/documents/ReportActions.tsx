'use client';

import { useId, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';

import { inputClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { todayIso } from '@/lib/clubMembers';
import { MEMBER_LIST_COLUMNS, MEMBER_LIST_DEFAULT_COLUMNS, memberListParams, orderedColumns, reportYears } from '@/lib/documentGeneration';
import GenerateDialog, { useTemplateOffered } from './GenerateDialog';

/**
 * "Mitgliederliste als PDF" (Wave 13 W6): column choice, key date, former members, department. The server needs
 * `members:read_sensitive` besides `documents:generate` and audits the export; the button only appears when the template is offered.
 */
export function MemberListReportAction({ clubId, departments, canSensitive }: { clubId: string; departments: { id: string; name: string }[]; canSensitive: boolean }) {
    const { t } = useLanguage();
    const offered = useTemplateOffered(clubId, 'mitgliederliste');
    const [open, setOpen] = useState(false);
    if (!offered || !canSensitive) return null;
    return (
        <>
            <button type="button" className={secondaryButtonClass} onClick={() => setOpen(true)}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {t('docs.gen.memberList.action')}
            </button>
            {open && <MemberListDialog clubId={clubId} departments={departments} onClose={() => setOpen(false)} />}
        </>
    );
}

function MemberListDialog({ clubId, departments, onClose }: { clubId: string; departments: { id: string; name: string }[]; onClose: () => void }) {
    const { t } = useLanguage();
    const id = useId();
    const [columns, setColumns] = useState<Set<string>>(new Set(MEMBER_LIST_DEFAULT_COLUMNS));
    const [asOf, setAsOf] = useState('');
    const [includeLeft, setIncludeLeft] = useState(false);
    const [departmentId, setDepartmentId] = useState('');
    const today = todayIso();
    const dateOk = asOf === '' || asOf <= today;

    function toggle(column: string, on: boolean) {
        setColumns((prev) => {
            const next = new Set(prev);
            if (on) next.add(column);
            else next.delete(column);
            return next;
        });
    }

    const chosen = orderedColumns(columns);
    return (
        <GenerateDialog
            clubId={clubId}
            templateId="mitgliederliste"
            title={t('docs.gen.memberList.title')}
            intro={t('docs.gen.memberList.intro')}
            params={memberListParams({ columns: chosen, asOf, includeLeft, departmentId })}
            target={{ kind: 'archive' }}
            canSubmit={chosen.length > 0 && dateOk}
            onClose={onClose}
        >
            <fieldset>
                <legend className="mb-1 text-xs font-medium text-muted-foreground">{t('docs.gen.memberList.columns')}</legend>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {MEMBER_LIST_COLUMNS.map((c) => (
                        <label key={c} className="flex items-center gap-2 text-sm text-foreground">
                            <input type="checkbox" checked={columns.has(c)} onChange={(e) => toggle(c, e.target.checked)} />
                            {t(`docs.gen.memberList.col.${c}`)}
                        </label>
                    ))}
                </div>
                {chosen.length === 0 && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                        {t('docs.gen.memberList.noColumns')}
                    </p>
                )}
                {columns.has('birthDate') || columns.has('address') || columns.has('phone') || columns.has('email') ? (
                    <p className="mt-2 text-xs text-muted-foreground">{t('docs.gen.memberList.sensitive')}</p>
                ) : null}
            </fieldset>
            <label className="block" htmlFor={`${id}-asof`}>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.gen.memberList.asOf')}</span>
                <input id={`${id}-asof`} type="date" max={today} value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputClass} aria-invalid={!dateOk} />
            </label>
            {departments.length > 0 && (
                <label className="block" htmlFor={`${id}-dep`}>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.gen.memberList.department')}</span>
                    <select id={`${id}-dep`} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                        <option value="">{t('docs.gen.memberList.allDepartments')}</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={includeLeft} onChange={(e) => setIncludeLeft(e.target.checked)} />
                {t('docs.gen.memberList.includeLeft')}
            </label>
        </GenerateDialog>
    );
}

/** "Jahresbericht als PDF" (Wave 13 W6): pick the year (default: the current one). Needs `documents:generate` and `club_stats:read`. */
export function AnnualReportAction({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const offered = useTemplateOffered(clubId, 'jahresbericht');
    const [open, setOpen] = useState(false);
    if (!offered) return null;
    return (
        <>
            <button type="button" className={secondaryButtonClass} onClick={() => setOpen(true)}>
                <FileText className="h-4 w-4" aria-hidden="true" />
                {t('docs.gen.annual.action')}
            </button>
            {open && <AnnualDialog clubId={clubId} onClose={() => setOpen(false)} />}
        </>
    );
}

function AnnualDialog({ clubId, onClose }: { clubId: string; onClose: () => void }) {
    const { t } = useLanguage();
    const id = useId();
    const current = Number(todayIso().slice(0, 4));
    const [year, setYear] = useState(current);
    return (
        <GenerateDialog clubId={clubId} templateId="jahresbericht" title={t('docs.gen.annual.title')} intro={t('docs.gen.annual.intro')} params={{ year }} target={{ kind: 'archive' }} onClose={onClose}>
            <label className="block" htmlFor={`${id}-year`}>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.gen.annual.year')}</span>
                <select id={`${id}-year`} value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputClass}>
                    {reportYears(current).map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </label>
        </GenerateDialog>
    );
}
