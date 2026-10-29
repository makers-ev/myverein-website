'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';

import MemberPicker from '@/components/kalender/MemberPicker';
import { primaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { clubQuery, openPdf } from '@/lib/documents';
import { PRINT_MAX, cardErrorKey } from '@/lib/memberCard';
import MemberCardAdmin from './MemberCardAdmin';

/**
 * Board tab "Ausweise verwalten" (Wave 13 W8, `member_cards:manage`): find a person, issue / re-issue / revoke their card, and collect
 * people (up to 40) for the collective print (one A4 sheet PDF, opened from an authenticated request, nothing is stored).
 */
export default function CardsBoardPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
    const [active, setActive] = useState<string | null>(null);
    const [printing, setPrinting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activePerson = people.find((p) => p.id === active) ?? null;

    async function print() {
        setPrinting(true);
        setError(null);
        try {
            await openPdf(`/member-cards/print?${clubQuery(clubId)}`, 'POST', { clubMemberIds: people.map((p) => p.id) });
        } catch (err) {
            setError(t(cardErrorKey(err)));
        } finally {
            setPrinting(false);
        }
    }

    return (
        <section aria-label={t('docs.card.board.title')} className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-foreground">{t('docs.card.board.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('docs.card.board.intro')}</p>
            </div>
            <div className="max-w-md">
                <MemberPicker
                    clubId={clubId}
                    label={t('docs.card.board.pick')}
                    exclude={new Set(people.map((p) => p.id))}
                    disabled={people.length >= PRINT_MAX}
                    onPick={(m) => {
                        setPeople((l) => [...l, m]);
                        setActive(m.id);
                    }}
                />
            </div>
            {people.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{t('docs.card.board.empty')}</p>
            ) : (
                <>
                    <ul className="flex flex-wrap gap-2" aria-label={t('docs.card.board.selected')}>
                        {people.map((p) => (
                            <li key={p.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm ${active === p.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'}`}>
                                <button type="button" aria-pressed={active === p.id} onClick={() => setActive(p.id)}>
                                    {p.name}
                                </button>
                                <button
                                    type="button"
                                    aria-label={t('docs.ack.request.removeNamed', { name: p.name })}
                                    className="font-bold"
                                    onClick={() => {
                                        setPeople((l) => l.filter((x) => x.id !== p.id));
                                        if (active === p.id) setActive(null);
                                    }}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" className={primaryButtonClass} disabled={printing} onClick={() => void print()}>
                            <Printer className="h-4 w-4" aria-hidden="true" />
                            {t('docs.card.board.print', { count: people.length })}
                        </button>
                        <span className="text-xs text-muted-foreground">{t('docs.card.board.printHint', { max: PRINT_MAX })}</span>
                    </div>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    {activePerson && (
                        <div>
                            <p className="mb-2 text-sm font-semibold text-foreground">{activePerson.name}</p>
                            <MemberCardAdmin key={activePerson.id} clubId={clubId} clubMemberId={activePerson.id} />
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
