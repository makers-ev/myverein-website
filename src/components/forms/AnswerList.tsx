'use client';

import { Lock } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { answerText, type RenderedAnswer } from '@/lib/applicationReview';

/**
 * Read-only list of submitted answers (application review, exit queue). The server has already rendered them against the
 * form version they were filled in; protected answers the caller may not read arrive `redacted` and show a marker instead of
 * a value. All text is applicant input and rendered as plain text, never as HTML.
 */
export default function AnswerList({ answers }: { answers: readonly RenderedAnswer[] }) {
    const { t } = useLanguage();
    return (
        <dl className="space-y-2">
            {answers.map((a) => (
                <div key={a.key} className="rounded-lg border border-border px-3 py-2">
                    <dt className="break-words text-xs font-semibold text-muted-foreground">{a.label}</dt>
                    <dd className={`mt-0.5 whitespace-pre-line break-words text-sm ${a.answered && !a.redacted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {a.redacted ? (
                            <span className="inline-flex items-center gap-1.5 italic">
                                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('forms.review.redacted')}
                            </span>
                        ) : (
                            answerText(a, t)
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
