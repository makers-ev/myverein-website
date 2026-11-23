'use client';

import Link from 'next/link';

import InquiryForm from '@/components/publicClub/InquiryForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { rememberClubSlug } from '@/lib/applicantStatus';
import { markJoinIntent } from '@/lib/joinIntent';
import { type PublicClub, type PublicEvent } from '@/lib/publicClub';

// The server renders in UTC, the browser in its own zone: a fixed zone keeps server and client output identical.
const TIME_ZONE = 'Europe/Berlin';

function EventTime({ event, language, allDayLabel }: { event: PublicEvent; language: string; allDayLabel: string }) {
    const start = new Date(event.startsAt);
    const date = start.toLocaleDateString(language, { dateStyle: 'full', timeZone: TIME_ZONE });
    const time = event.allDay ? allDayLabel : start.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });
    return (
        <time dateTime={event.startsAt}>
            {date}, {time}
        </time>
    );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section aria-labelledby={id} className="rounded-xl bg-card p-5 shadow-card sm:p-6">
            <h2 id={id} className="font-display text-2xl leading-tight text-foreground">
                {title}
            </h2>
            <div className="mt-3">{children}</div>
        </section>
    );
}

/**
 * The public club page as the visitor sees it (Wave 15 W2). Shows exactly the parts present in `club` (what the club released), each
 * part only when it has content. `preview` is the board editor's preview: the form cannot send and the join link is inert.
 * Logos are plain images from the URLs the media layer delivered; they are never built here.
 */
export default function PublicClubView({ club, preview = false }: { club: PublicClub; preview?: boolean }) {
    const { t, language } = useLanguage();
    return (
        <article className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6 sm:py-12">
            {club.coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- URL delivered by the media layer (public_opt_in), host varies per deployment
                <img src={club.coverUrl} alt="" width={1200} height={400} fetchPriority="high" className="aspect-[3/1] w-full rounded-xl border border-hairline object-cover" referrerPolicy="no-referrer" />
            )}
            <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {club.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed/public-opt-in URL from the media layer, host varies per deployment
                    <img src={club.logoUrl} alt={t('pc.logo.alt', { name: club.name })} width={96} height={96} className="h-24 w-24 shrink-0 rounded-xl border border-hairline bg-card object-contain p-1" referrerPolicy="no-referrer" />
                )}
                <div className="min-w-0">
                    {preview ? (
                        <p role="heading" aria-level={3} className="font-display text-4xl leading-[1.08] text-foreground sm:text-5xl">
                            {club.name}
                        </p>
                    ) : (
                        <h1 className="font-display text-4xl leading-[1.08] text-foreground sm:text-5xl">{club.name}</h1>
                    )}
                    {club.tagline && <p className="mt-2 text-lg text-foreground">{club.tagline}</p>}
                    {club.city && <p className="mt-1 text-base text-muted-foreground">{club.city}</p>}
                </div>
            </header>

            {club.description && (
                <Section id="pc-about" title={t('pc.about')}>
                    <p className="whitespace-pre-line text-base leading-7 text-foreground">{club.description}</p>
                </Section>
            )}

            {club.departments.length > 0 && (
                <Section id="pc-departments" title={t('pc.departments')}>
                    <ul className="flex flex-wrap gap-2">
                        {club.departments.map((d) => (
                            <li key={d.id} className="rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary-text">
                                {d.name}
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {club.events.length > 0 && (
                <Section id="pc-events" title={t('pc.events')}>
                    <ul className="divide-y divide-hairline">
                        {club.events.map((e, i) => (
                            <li key={`${e.startsAt}-${i}`} className="py-3 first:pt-0 last:pb-0">
                                <p className="font-medium text-foreground">
                                    {e.title}
                                    {e.cancelled && <span className="ml-2 rounded-full bg-destructive-soft px-2 py-0.5 text-xs font-semibold text-destructive">{t('pc.events.cancelled')}</span>}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    <EventTime event={e} language={language} allDayLabel={t('pc.events.allDay')} />
                                    {e.locationName ? ` · ${e.locationName}` : ''}
                                </p>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {club.leadForm.enabled && (
                <Section id="pc-inquiry" title={t(club.leadForm.trialTraining ? 'pc.form.title.trial' : 'pc.form.title.inquiry')}>
                    <InquiryForm club={club} disabled={preview} />
                </Section>
            )}

            {(club.contact || club.address) && (
                <Section id="pc-contact" title={t('pc.contact')}>
                    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                        {club.address && (
                            <>
                                <dt className="text-muted-foreground">{t('pc.contact.address')}</dt>
                                <dd className="whitespace-pre-line text-foreground">{club.address}</dd>
                            </>
                        )}
                        {club.contact?.email && (
                            <>
                                <dt className="text-muted-foreground">{t('pc.contact.email')}</dt>
                                <dd>
                                    <a href={`mailto:${club.contact?.email}`} className="break-all font-medium text-primary-text hover:underline">
                                        {club.contact?.email}
                                    </a>
                                </dd>
                            </>
                        )}
                        {club.contact?.phone && (
                            <>
                                <dt className="text-muted-foreground">{t('pc.contact.phone')}</dt>
                                <dd>
                                    <a href={`tel:${club.contact.phone.replace(/[^+\d]/g, '')}`} className="font-medium text-primary-text hover:underline">
                                        {club.contact?.phone}
                                    </a>
                                </dd>
                            </>
                        )}
                        {club.contact?.website && (
                            <>
                                <dt className="text-muted-foreground">{t('pc.contact.website')}</dt>
                                <dd>
                                    <a href={club.contact?.website} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary-text hover:underline">
                                        {club.contact?.website}
                                    </a>
                                </dd>
                            </>
                        )}
                    </dl>
                </Section>
            )}

            {club.sponsors.length > 0 && (
                <Section id="pc-sponsors" title={t('pc.sponsors')}>
                    <ul className="flex flex-wrap items-center gap-x-8 gap-y-5">
                        {club.sponsors.map((s, i) => {
                            const content = s.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- see above
                                <img src={s.logoUrl} alt={t('pc.sponsors.logo.alt', { name: s.name })} height={48} loading="lazy" className="h-12 w-auto max-w-40 object-contain" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="text-sm font-medium text-foreground">{s.name}</span>
                            );
                            return (
                                <li key={`${i}-${s.name}`}>
                                    {s.website && !preview ? (
                                        <a href={s.website} target="_blank" rel="noopener noreferrer sponsored" aria-label={s.logoUrl ? undefined : s.name} className="inline-flex min-h-11 items-center">
                                            {content}
                                        </a>
                                    ) : (
                                        <span className="inline-flex min-h-11 items-center">{content}</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Section>
            )}

            {club.galleryUrls.length > 0 && (
                <Section id="pc-gallery" title={t('pc.gallery')}>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {club.galleryUrls.map((src) => (
                            <li key={src}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
                                <img src={src} alt={t('pc.gallery.alt', { name: club.name })} width={400} height={300} loading="lazy" className="aspect-[4/3] w-full rounded-lg border border-hairline object-cover" referrerPolicy="no-referrer" />
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <section aria-labelledby="pc-join" className="rounded-xl border border-hairline p-5 sm:p-6">
                <h2 id="pc-join" className="font-display text-2xl leading-tight text-foreground">
                    {t('pc.join.title')}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('pc.join.body')}</p>
                {preview ? (
                    <span className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground opacity-60">{t('pc.join.cta')}</span>
                ) : (
                    <JoinLink slug={club.slug} label={t('pc.join.cta')} />
                )}
            </section>

            <p className="text-xs text-muted-foreground">{t('pc.footer')}</p>
        </article>
    );
}

/** Leads into the normal joining flow: the club page `/verein` offers the remembered code (join card, or "join another club" for members of other clubs) and asks for sign-in first. */
function JoinLink({ slug, label }: { slug: string; label: string }) {
    return (
        <Link
            href="/verein"
            onClick={() => {
                rememberClubSlug(slug);
                markJoinIntent();
            }}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
        >
            {label}
        </Link>
    );
}
