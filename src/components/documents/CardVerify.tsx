'use client';

import { useId, useState } from 'react';
import { Smartphone } from 'lucide-react';

import { Chip, primaryButtonClass, inputClass } from '@/components/standorte/ui';
import type { Tone } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { clubQuery } from '@/lib/documents';
import { type VerifyAnswer, type VerifyResult, cardErrorKey, extractCardToken } from '@/lib/memberCard';

const RESULT_TONE: Record<VerifyResult, Tone> = { gueltig: 'success', abgelaufen: 'warning', ausgetreten: 'destructive', ungueltig: 'destructive' };

/**
 * Card check on the website (Wave 13 W8, `member_cards:verify`): paste the code or the link that was scanned. The camera scan is a
 * feature of the app. Nothing is stored: the answer disappears when the field is cleared or a new check starts.
 */
export default function CardVerify({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const id = useId();
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [answer, setAnswer] = useState<VerifyAnswer | null>(null);
    const [error, setError] = useState<string | null>(null);
    const token = extractCardToken(input);

    async function check() {
        setBusy(true);
        setError(null);
        setAnswer(null);
        try {
            // A text without a recognisable token is checked as-is: the server answers "ungültig" without a hint, like for a forgery.
            const res = await apiFetch<{ data: VerifyAnswer }>(`/member-cards/verify?${clubQuery(clubId)}`, { method: 'POST', body: { token: token ?? input.trim().slice(0, 300) } });
            setAnswer(res.data);
            setInput('');
        } catch (err) {
            setError(t(cardErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <section aria-label={t('docs.card.verify.title')} className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-foreground">{t('docs.card.verify.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('docs.card.verify.intro')}</p>
            </div>
            <form
                className="max-w-lg space-y-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (input.trim() && !busy) void check();
                }}
            >
                <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
                    {t('docs.card.verify.field')}
                </label>
                <textarea id={id} rows={3} value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" spellCheck={false} placeholder="mc1.…" className={`${inputClass} font-mono`} />
                <button type="submit" className={primaryButtonClass} disabled={busy || !input.trim()}>
                    {t('docs.card.verify.submit')}
                </button>
            </form>
            <p className="flex max-w-lg items-start gap-2 text-xs text-muted-foreground">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('docs.card.verify.appHint')}
            </p>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {answer && (
                <div role="status" className="max-w-lg rounded-xl border border-border bg-card p-4">
                    <Chip tone={RESULT_TONE[answer.result]}>{t(`docs.card.verify.result.${answer.result}`)}</Chip>
                    {answer.result === 'gueltig' && answer.member ? (
                        <div className="mt-3 flex items-center gap-3">
                            {answer.member.photo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={answer.member.photo.url} alt={t('docs.card.photoAlt', { name: answer.member.displayName })} className="h-16 w-16 rounded-xl object-cover" />
                            ) : (
                                <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-xl font-bold text-foreground">
                                    {answer.member.initials}
                                </div>
                            )}
                            <div>
                                <p className="text-base font-bold text-foreground">{answer.member.displayName}</p>
                                {answer.member.category && <p className="text-sm text-muted-foreground">{answer.member.category}</p>}
                            </div>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-muted-foreground">{t(`docs.card.verify.explain.${answer.result}`)}</p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">{t('docs.card.verify.notStored')}</p>
                </div>
            )}
        </section>
    );
}
