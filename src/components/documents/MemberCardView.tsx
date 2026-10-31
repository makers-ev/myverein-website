'use client';

import { QRCodeSVG } from 'qrcode.react';

import { Chip } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/clubMembers';
import { CARD_STATE_TONE, type MemberCard, safeColor, textOn } from '@/lib/memberCard';

/**
 * The card itself: club colours and logo, photo (only with consent, else initials), name, number, category, validity and, while the
 * card is valid, the QR code. The QR sits on a white tile in dark mode too (scanners need the contrast). Colours come from the server
 * but only valid `#RRGGBB` values reach the inline style.
 */
export default function MemberCardView({ card, offline = false }: { card: MemberCard; offline?: boolean }) {
    const { t, language } = useLanguage();
    const primary = safeColor(card.club.primaryColor, '#1f4e8c');
    const accent = safeColor(card.club.accentColor, primary);
    const ink = textOn(primary);
    const valid = card.state === 'gueltig';

    return (
        <article aria-label={t('docs.card.aria', { name: card.member.displayName })} className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <header className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: primary, color: ink }}>
                {card.club.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.club.logo.url} alt="" className="h-9 w-9 rounded bg-white object-contain p-0.5" />
                )}
                <p className="min-w-0 flex-1 truncate text-sm font-bold">{card.club.name}</p>
                <span className="h-6 w-1.5 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
            </header>
            <div className="flex items-center gap-4 px-4 py-4">
                {card.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.photo.url} alt={t('docs.card.photoAlt', { name: card.member.displayName })} className="h-20 w-20 rounded-xl object-cover" />
                ) : (
                    <div aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-xl text-2xl font-bold" style={{ backgroundColor: accent, color: textOn(accent) }}>
                        {card.member.initials}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-foreground">{card.member.displayName}</p>
                    {card.member.memberNumber && <p className="text-sm text-muted-foreground">{t('docs.card.number', { number: card.member.memberNumber })}</p>}
                    {card.member.category && <p className="text-sm text-muted-foreground">{card.member.category}</p>}
                </div>
            </div>
            <div className="space-y-3 border-t border-border px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={CARD_STATE_TONE[card.state]}>{t(`docs.card.state.${card.state}`)}</Chip>
                    {card.hint && <span className="text-xs text-muted-foreground">{t(`docs.card.hint.${card.hint}`)}</span>}
                </div>
                {valid && card.token ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="rounded-xl bg-white p-3" role="img" aria-label={t('docs.card.qrAlt')}>
                            <QRCodeSVG value={card.token} size={192} marginSize={0} level="M" bgColor="#ffffff" fgColor="#000000" />
                        </div>
                        <p className="text-center text-xs text-muted-foreground">{t('docs.card.qrHint')}</p>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t(valid && offline ? 'docs.card.qrExpired' : `docs.card.noQr.${card.state}`)}</p>
                )}
                {offline && (
                    <p role="status" className="text-xs text-warning">
                        {t('docs.card.offline')}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    {card.validUntil ? t('docs.card.validUntil', { date: formatDate(card.validUntil, language) }) : t('docs.card.validOpen')}
                    {' · '}
                    {t('docs.card.checkedAt', { when: new Date(card.checkedAt).toLocaleString(language) })}
                </p>
            </div>
        </article>
    );
}
