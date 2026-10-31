'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { diffWords } from '@/lib/consents';

/** Word-level comparison of two consent text versions: removed words struck through, added words highlighted. */
export default function DiffView({ before, after }: { before: string; after: string }) {
    const { t } = useLanguage();
    const parts = diffWords(before, after);
    const unchanged = parts.every((p) => p.type === 'same');
    return (
        <div>
            <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground">
                {parts.map((p, i) =>
                    p.type === 'same' ? (
                        <span key={i}>{p.text} </span>
                    ) : p.type === 'add' ? (
                        <ins key={i} className="rounded bg-success/15 px-0.5 text-foreground no-underline">
                            <span className="sr-only">{t('privacy.diff.added')}: </span>
                            {p.text}{' '}
                        </ins>
                    ) : (
                        <del key={i} className="rounded bg-destructive/15 px-0.5 text-muted-foreground">
                            <span className="sr-only">{t('privacy.diff.removed')}: </span>
                            {p.text}{' '}
                        </del>
                    ),
                )}
            </p>
            {unchanged && <p className="mt-1 text-xs text-muted-foreground">{t('privacy.diff.unchanged')}</p>}
        </div>
    );
}
