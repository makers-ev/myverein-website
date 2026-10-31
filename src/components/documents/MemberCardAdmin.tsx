'use client';

import { useCallback, useEffect, useState } from 'react';
import { IdCard } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useConfirm } from '@/components/useConfirm';
import { Chip, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDate, todayIso } from '@/lib/clubMembers';
import { clubQuery } from '@/lib/documents';
import { CARD_STATE_TONE, type MemberCard, cardErrorKey } from '@/lib/memberCard';

/**
 * Card management of one person for the board (`member_cards:manage`, Wave 13 W8): issue, re-issue (old QR codes stop working) and
 * revoke. The server decides what is possible; every answer is the current card, which is shown as a state line.
 */
export default function MemberCardAdmin({ clubId, clubMemberId }: { clubId: string; clubMemberId: string }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const q = clubQuery(clubId);
    const base = `/club-members/${encodeURIComponent(clubMemberId)}/card`;
    const [card, setCard] = useState<MemberCard | null>(null);
    const [state, setState] = useState<'loading' | 'ok' | 'none' | 'error'>('loading');
    const [validUntil, setValidUntil] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: MemberCard }>(`${base}?${q}`);
            setCard(res.data);
            setState('ok');
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
                setCard(null);
                setState('none');
            } else setState('error');
        }
    }, [base, q]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const pastDate = validUntil !== '' && validUntil < todayIso();

    async function act(path: string, method: 'POST', done: string) {
        if (pastDate && path !== '/revoke') {
            setMessage({ text: t('docs.card.admin.err.past'), error: true });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const res = await apiFetch<{ data: MemberCard }>(`${base}${path}?${q}`, { method, body: validUntil && path !== '/revoke' ? { validUntil } : {} });
            setCard(res.data);
            setState('ok');
            setMessage({ text: t(done), error: false });
        } catch (err) {
            setMessage({ text: t(cardErrorKey(err)), error: true });
        } finally {
            setBusy(false);
        }
    }

    if (state === 'loading') return <LoadingText />;
    if (state === 'error') return <LoadError onRetry={() => void load()} />;

    const issued = !!card?.issued;
    return (
        <section aria-label={t('docs.card.admin.title')} className="space-y-3 rounded-xl border border-border bg-card p-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <IdCard className="h-4 w-4" aria-hidden="true" />
                {t('docs.card.admin.title')}
            </h3>
            {card ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <Chip tone={CARD_STATE_TONE[card.state]}>{t(`docs.card.state.${card.state}`)}</Chip>
                    {card.hint && <span className="text-xs text-muted-foreground">{t(`docs.card.hint.${card.hint}`)}</span>}
                    {card.issuedAt && <span className="text-xs text-muted-foreground">{t('docs.card.admin.issuedAt', { date: formatDate(card.issuedAt, language) })}</span>}
                    {card.validUntil && <span className="text-xs text-muted-foreground">{t('docs.card.validUntil', { date: formatDate(card.validUntil, language) })}</span>}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{t('docs.card.admin.none')}</p>
            )}
            <label className="block max-w-xs">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.card.admin.validUntil')}</span>
                <input type="date" min={todayIso()} aria-invalid={pastDate} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
            </label>
            <div className="flex flex-wrap gap-2">
                {!issued && (
                    <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void act('', 'POST', 'docs.card.admin.issued')}>
                        {t('docs.card.admin.issue')}
                    </button>
                )}
                {issued && (
                    <button
                        type="button"
                        className={secondaryButtonClass}
                        disabled={busy}
                        onClick={async () => {
                            if (await confirm({ title: t('docs.card.admin.reissue'), body: t('docs.card.admin.reissue.body'), confirmLabel: t('docs.card.admin.reissue') })) await act('/reissue', 'POST', 'docs.card.admin.reissued');
                        }}
                    >
                        {t('docs.card.admin.reissue')}
                    </button>
                )}
                {issued && card?.hint !== 'widerrufen' && (
                    <button
                        type="button"
                        className={`${secondaryButtonClass} text-destructive`}
                        disabled={busy}
                        onClick={async () => {
                            if (await confirm({ title: t('docs.card.admin.revoke'), body: t('docs.card.admin.revoke.body'), confirmLabel: t('docs.card.admin.revoke'), danger: true })) await act('/revoke', 'POST', 'docs.card.admin.revoked');
                        }}
                    >
                        {t('docs.card.admin.revoke')}
                    </button>
                )}
            </div>
            {message && (
                <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-destructive' : 'text-foreground'}`}>
                    {message.text}
                </p>
            )}
            {dialog}
        </section>
    );
}
