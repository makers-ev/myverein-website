'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, IdCard, RefreshCw } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { EmptyState, inputClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { clubQuery, downloadDocument } from '@/lib/documents';
import { type MemberCard, cardErrorKey, refreshDelayMs } from '@/lib/memberCard';
import type { WardClub } from '@/lib/familie';
import MemberCardView from './MemberCardView';

/**
 * "Mein Ausweis" (Wave 13 W8): the card of the signed-in member (`memberId = 'me'`) or of a ward. The token is refreshed shortly
 * before it expires and whenever the tab becomes visible again; it is never written to storage. PDF download in card or A4 layout.
 */
export function CardLoader({ clubId, memberId }: { clubId: string; memberId: string }) {
    const { t } = useLanguage();
    const q = clubQuery(clubId);
    const [card, setCard] = useState<MemberCard | null>(null);
    const [state, setState] = useState<'loading' | 'ok' | 'none' | 'error'>('loading');
    const [message, setMessage] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadRef = useRef<(() => Promise<void>) | null>(null);
    const [offline, setOffline] = useState(false);
    const [expired, setExpired] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: MemberCard }>(`/club-members/${encodeURIComponent(memberId)}/card?${q}`);
            setCard(res.data);
            setState('ok');
            setOffline(false);
            setExpired(false);
        } catch (err) {
            // 404: no valid membership / not allowed -- the stale card must not stay on screen.
            if (err instanceof ApiError && err.status === 404) {
                setCard(null);
                setState('none');
            } else {
                setState((prev) => (prev === 'ok' ? 'ok' : 'error'));
                // Keep what we have, say so, and try again shortly.
                setOffline(true);
                if (retry.current) clearTimeout(retry.current);
                retry.current = setTimeout(() => void loadRef.current?.(), 15_000);
            }
        }
    }, [memberId, q]);

    useEffect(() => {
        loadRef.current = load;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        if (!card) return;
        const delay = refreshDelayMs(card);
        if (delay !== null) timer.current = setTimeout(() => void load(), delay);
        // Once the token is past its expiry the QR is hidden, whatever the network does.
        const left = card.tokenExpiresAt ? Date.parse(card.tokenExpiresAt) - Date.now() : null;
        let hide: ReturnType<typeof setTimeout> | null = null;
        if (left !== null && Number.isFinite(left)) {
            hide = setTimeout(() => setExpired(true), Math.max(left, 0));
        }
        return () => {
            if (timer.current) clearTimeout(timer.current);
            if (hide) clearTimeout(hide);
        };
    }, [card, load]);

    useEffect(() => () => {
        if (retry.current) clearTimeout(retry.current);
    }, []);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') void load();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [load]);

    async function pdf(layout: 'card' | 'a4') {
        setMessage(null);
        try {
            await downloadDocument(`/club-members/${encodeURIComponent(memberId)}/card.pdf?${q}&layout=${layout}`, 'mitgliedsausweis.pdf');
        } catch (err) {
            setMessage(t(cardErrorKey(err)));
        }
    }

    if (state === 'loading') return <LoadingText />;
    if (state === 'error') return <LoadError onRetry={() => void load()} />;
    if (state === 'none' || !card) return <EmptyState icon={<IdCard className="h-6 w-6" aria-hidden="true" />} text={t('docs.card.none')} />;

    return (
        <div className="space-y-3">
            <MemberCardView card={expired ? { ...card, token: null } : card} offline={offline || expired} />
            <div className="flex flex-wrap gap-2">
                <button type="button" className={secondaryButtonClass} onClick={() => void load()}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t('docs.card.refresh')}
                </button>
                {card.state === 'gueltig' && (
                    <>
                        <button type="button" className={secondaryButtonClass} onClick={() => void pdf('card')}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {t('docs.card.pdf.card')}
                        </button>
                        <button type="button" className={secondaryButtonClass} onClick={() => void pdf('a4')}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {t('docs.card.pdf.a4')}
                        </button>
                    </>
                )}
            </div>
            {message && (
                <p role="alert" className="text-sm text-destructive">
                    {message}
                </p>
            )}
            <p className="max-w-sm text-xs text-muted-foreground">{t('docs.card.privacy')}</p>
        </div>
    );
}

/** Own card plus, for a member who is also a guardian, the cards of the wards of this club. */
export default function MyCardPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [wards, setWards] = useState<{ wardId: string; name: string }[]>([]);
    const [who, setWho] = useState('me');

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: WardClub[] }>('/my-wards')
            .then((res) => {
                if (!cancelled) setWards(res.data.filter((c) => c.clubId === clubId).flatMap((c) => c.wards.map((w) => ({ wardId: w.wardId, name: w.name }))));
            })
            .catch(() => {
                // No wards or no access: the own card is all there is.
            });
        return () => {
            cancelled = true;
        };
    }, [clubId]);

    return (
        <section aria-label={t('docs.card.title')} className="space-y-3">
            <div>
                <h2 className="text-lg font-bold text-foreground">{t('docs.card.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('docs.card.intro')}</p>
            </div>
            {wards.length > 0 && (
                <label className="block max-w-xs">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.person.whose')}</span>
                    <select value={who} onChange={(e) => setWho(e.target.value)} className={inputClass}>
                        <option value="me">{t('docs.person.mine')}</option>
                        {wards.map((w) => (
                            <option key={w.wardId} value={w.wardId}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            <CardLoader key={who} clubId={clubId} memberId={who} />
        </section>
    );
}
