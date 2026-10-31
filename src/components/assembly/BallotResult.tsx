'use client';

import { type Ballot, optionLabel } from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { Notice } from '@/components/assembly/shared';

/**
 * Result of a counted/finalized ballot: outcome as text (never colour alone), the counts and the rule it was measured against.
 * The majority rule is the club's own reading of its statute, which the note says.
 */
export default function BallotResult({ ballot }: { ballot: Pick<Ballot, 'result' | 'options' | 'status' | 'resultHash' | 'majority' | 'secret'> }) {
    const { t } = useLanguage();
    const r = ballot.result;
    if (!r) return null;
    const outcome = r.outcome ?? 'none';
    return (
        <div className="space-y-2 rounded-lg border border-border bg-background p-3" aria-live="polite">
            <p className="text-sm font-bold text-foreground">
                {t(`assembly.outcome.${outcome}`)}
                {ballot.status !== 'finalized' && <span className="ml-2 text-xs font-normal text-muted-foreground">({t('assembly.result.preliminary')})</span>}
            </p>
            {r.form === 'yes_no' ? (
                <ul className="flex flex-wrap gap-4 text-sm text-foreground">
                    <li>{t('assembly.result.yes')}: <strong>{r.yes ?? 0}</strong></li>
                    <li>{t('assembly.result.no')}: <strong>{r.no ?? 0}</strong></li>
                    <li>{t('assembly.result.abstain')}: <strong>{r.abstain ?? 0}</strong></li>
                </ul>
            ) : (
                <ul className="space-y-1 text-sm text-foreground">
                    {(r.tallies ?? []).map((tally) => (
                        <li key={tally.optionId} className="flex justify-between gap-3">
                            <span>
                                {optionLabel(ballot, tally.optionId)}
                                {r.electedOptionIds?.includes(tally.optionId) && <span className="ml-2 text-xs font-semibold text-success">{t('assembly.result.elected')}</span>}
                                {r.tiedOptionIds?.includes(tally.optionId) && <span className="ml-2 text-xs font-semibold text-warning">{t('assembly.result.tied')}</span>}
                            </span>
                            <strong>{tally.votes}</strong>
                        </li>
                    ))}
                </ul>
            )}
            <p className="text-xs text-muted-foreground">
                {t('assembly.result.participation', { voted: r.participants ?? 0, eligible: r.eligible ?? 0 })}
                {ballot.majority ? ` · ${t('assembly.result.majority', { majority: t(`assembly.majority.${ballot.majority}`) })}` : ''}
            </p>
            {r.flags?.unannouncedAgendaItem && <Notice tone="warning">{t('assembly.result.unannounced')}</Notice>}
            <p className="text-xs text-muted-foreground">{t('assembly.result.assumption')}</p>
            {ballot.resultHash && <p className="break-all text-xs text-muted-foreground">SHA-256: {ballot.resultHash}</p>}
        </div>
    );
}
