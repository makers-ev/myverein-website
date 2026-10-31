'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, UserPlus, XCircle } from 'lucide-react';

import ApplicationForm, { type SubmittedResult } from '@/components/verein/ApplicationForm';
import LoadingText from '@/components/LoadingText';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { decidedSubmissions, decisionMessage, openApplications, readLastClubSlug, rememberClubSlug } from '@/lib/applicantStatus';
import { type ApplyConflict, formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    allowedModes,
    childWarningKey,
    type FormDefinition,
    formErrorKey,
    type MySubmission,
    type OnBehalfOf,
    selectApplicationState,
    type Submission,
} from '@/lib/formSchema';

interface ClubState {
    slug: string;
    definition: FormDefinition;
    submitted: MySubmission[];
    /** Recently decided applications (rejected / accepted / withdrawn) with the board's message. */
    decided: MySubmission[];
    modes: OnBehalfOf[];
    mode: OnBehalfOf | null;
    resume?: { submission: Submission; form: FormDefinition; outdated: boolean };
    /** Bumped whenever the form has to start over (mode switch, discarded draft, reload). */
    formKey: number;
}

/**
 * Digitaler Aufnahmeantrag. The applicant enters the club code, the card loads that club's own application form
 * (`GET /club-forms/:slug/aufnahme`), renders it (`ApplicationForm` / `FormRenderer`), keeps a draft while the person types
 * and submits it (`POST /form-submissions/:id/submit`). The applicant is NOT a member afterwards -- the board has to approve
 * the application first, so open applications are listed with "wartet auf Entscheidung" and can be withdrawn. If the club's
 * form supports it, a parent can apply for a child (separate draft and application). `onRefresh` lets the user re-check
 * their membership (e.g. after the board approved in the meantime).
 */
export default function JoinClubCard({ onRefresh, className = 'mt-6' }: { onRefresh: () => void; className?: string }) {
    const { t, language } = useLanguage();
    const [slug, setSlug] = useState('');
    const [phase, setPhase] = useState<'slug' | 'loading' | 'ready'>('slug');
    const [loadErrorKey, setLoadErrorKey] = useState<string | null>(null);
    const [club, setClub] = useState<ClubState | null>(null);
    const [conflict, setConflict] = useState<ApplyConflict | null>(null);
    const [banner, setBanner] = useState<{ warnings: string[] } | null>(null);
    // A reload while a club is shown keeps the club area mounted (`refreshing`) instead of replacing it with a loading state.
    const [refreshing, setRefreshing] = useState(false);
    const [refreshFailed, setRefreshFailed] = useState(false);
    const [withdrawId, setWithdrawId] = useState<string | null>(null);
    const [withdrawBusy, setWithdrawBusy] = useState(false);
    const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);
    const bannerRef = useRef<HTMLDivElement>(null);
    const flushRef = useRef<(() => Promise<void>) | null>(null);
    const loadSeq = useRef(0);
    // Drafts and pending applications over all clubs (`null` = not loaded yet): resuming after a reload needs no club code.
    const [openApps, setOpenApps] = useState<MySubmission[] | null>(null);
    const [openFailed, setOpenFailed] = useState(false);
    const alive = useRef(true);

    async function loadOpenApps() {
        try {
            const res = await apiFetch<{ data: MySubmission[] }>('/form-submissions/mine');
            if (!alive.current) return;
            setOpenApps(openApplications(res.data));
            setOpenFailed(false);
        } catch {
            if (alive.current) setOpenFailed(true);
        }
    }

    useEffect(() => {
        alive.current = true;
        // The last used club code (not a secret) is offered again; the open applications come from the server.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSlug((current) => current || readLastClubSlug());
        void loadOpenApps();
        return () => {
            alive.current = false;
        };
    }, []);

    /** Loads the club's form and the person's own submissions; resumes the newest draft of the chosen mode. */
    async function load(clubSlug: string, preferred?: OnBehalfOf, keepForm = false): Promise<boolean> {
        const seq = ++loadSeq.current;
        const reloading = club !== null && club.slug === clubSlug;
        if (reloading) setRefreshing(true);
        else setPhase('loading');
        setLoadErrorKey(null);
        setRefreshFailed(false);
        try {
            const [formRes, mineRes] = await Promise.all([
                apiFetch<{ data: FormDefinition }>(`/club-forms/${encodeURIComponent(clubSlug)}/aufnahme`),
                apiFetch<{ data: MySubmission[] }>('/form-submissions/mine'),
            ]);
            const definition = formRes.data;
            const { drafts, submitted } = selectApplicationState(mineRes.data, clubSlug);
            const decided = decidedSubmissions(mineRes.data, clubSlug);
            const modes = allowedModes(definition, submitted);
            const mode = preferred && modes.includes(preferred) ? preferred : (modes[0] ?? null);
            let resume: ClubState['resume'];
            const draft = mode ? drafts[mode] : undefined;
            if (draft) {
                try {
                    const detail = await apiFetch<{ data: { submission: Submission; form: FormDefinition; outdated: boolean } }>(`/form-submissions/${draft.id}`);
                    resume = detail.data;
                } catch {
                    // A draft that cannot be read is skipped: the person starts a fresh form (the old draft expires by itself).
                }
            }
            if (!alive.current || seq !== loadSeq.current) return false;
            rememberClubSlug(clubSlug);
            setOpenApps(openApplications(mineRes.data));
            setOpenFailed(false);
            setClub((prev) =>
                keepForm && prev && prev.slug === clubSlug
                    ? // Background refresh after a submit: the list changes, the form the person may already be filling in stays.
                      { ...prev, submitted, decided, modes: allowedModes(prev.definition, submitted) }
                    : { slug: clubSlug, definition, submitted, decided, modes, mode, resume, formKey: (prev?.formKey ?? 0) + 1 },
            );
            setPhase('ready');
            setRefreshing(false);
            return true;
        } catch (err) {
            if (!alive.current || seq !== loadSeq.current) return false;
            setRefreshing(false);
            if (reloading) {
                // The club area stays; the person can retry.
                setRefreshFailed(true);
                return false;
            }
            setLoadErrorKey(err instanceof ApiError && err.status === 404 ? 'verein.join.notFound' : formErrorKey(err));
            setPhase('slug');
            return false;
        }
    }

    function handleLoad(e: React.FormEvent) {
        e.preventDefault();
        const value = slug.trim().toLowerCase();
        if (!value) return;
        setBanner(null);
        setActionErrorKey(null);
        setWithdrawId(null);
        void load(value);
    }

    function resumeApplication(app: MySubmission) {
        setSlug(app.club.slug);
        setBanner(null);
        setActionErrorKey(null);
        setWithdrawId(null);
        void load(app.club.slug, app.onBehalfOf);
    }

    async function changeMode(next: OnBehalfOf) {
        if (!club || next === club.mode) return;
        // A pending autosave of the form that goes away is finished first, so its draft shows up when the other mode loads.
        await flushRef.current?.().catch(() => {});
        setBanner(null);
        await load(club.slug, next);
    }

    async function backToSlug() {
        await flushRef.current?.().catch(() => {});
        loadSeq.current++;
        setClub(null);
        setBanner(null);
        setPhase('slug');
        void loadOpenApps();
    }

    async function withdraw(id: string) {
        if (!club) return;
        setWithdrawBusy(true);
        setActionErrorKey(null);
        try {
            await apiFetch(`/form-submissions/${id}/withdraw`, { method: 'POST' });
            if (!alive.current) return;
            setWithdrawId(null);
            setBanner(null);
            await load(club.slug, club.mode ?? undefined);
        } catch (err) {
            if (!alive.current) return;
            setActionErrorKey(formErrorKey(err));
            // The application may have been decided meanwhile: show the current state.
            if (err instanceof ApiError && err.status === 409) await load(club.slug, club.mode ?? undefined);
        } finally {
            if (alive.current) setWithdrawBusy(false);
        }
    }

    async function handleSubmitted(result: SubmittedResult) {
        if (!club) return;
        const warnings = result.warnings.map(childWarningKey).filter((k): k is string => k !== null);
        // The success banner and the new entry in the list come from the submit answer itself, so a failing reload cannot hide them.
        const entry = { ...result.submission, purpose: 'aufnahme', version: club.definition.version, club: { id: '', name: '', slug: club.slug } } as MySubmission;
        const submitted = [entry, ...club.submitted.filter((s) => s.id !== entry.id)];
        const modes = allowedModes(club.definition, submitted);
        setClub({ ...club, submitted, modes, mode: club.mode && modes.includes(club.mode) ? club.mode : (modes[0] ?? null), resume: undefined, formKey: club.formKey + 1 });
        setBanner({ warnings });
        setTimeout(() => bannerRef.current?.focus(), 0);
        void load(club.slug, club.mode ?? undefined, true);
    }

    if (conflict) {
        const member = conflict === 'already_member';
        const bodyKey = {
            already_member: 'verein.join.alreadyMember.body',
            application_pending: 'verein.join.applicationPending.body',
            other: 'verein.join.pending.exists',
        }[conflict];
        const titleKey = {
            already_member: 'verein.join.alreadyMember.title',
            application_pending: 'verein.join.applicationPending.title',
            other: 'verein.join.pending.title',
        }[conflict];
        return (
            <div className={`${className} rounded-xl border border-border bg-card p-5`} role="status">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        {member ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Clock className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">{t(titleKey)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{t(bodyKey)}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={onRefresh} className={primaryButtonClass}>
                                {t(member ? 'verein.join.alreadyMember.refresh' : 'verein.join.pending.refresh')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setConflict(null);
                                    if (club) void load(club.slug, club.mode ?? undefined);
                                }}
                                className={secondaryButtonClass}
                            >
                                {t('verein.join.pending.another')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className} rounded-xl border border-border bg-card p-5`}>
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.join.body')}</p>
                </div>
            </div>

            {phase !== 'ready' || !club ? (
                <form onSubmit={handleLoad} className="mt-5">
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.join.slug')}
                        <input
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder={t('forms.apply.slugPlaceholder')}
                            autoCapitalize="none"
                            disabled={phase === 'loading'}
                            aria-describedby={loadErrorKey ? 'join-load-error' : undefined}
                            aria-invalid={loadErrorKey ? true : undefined}
                            className={`mt-1 font-mono ${inputClass}`}
                        />
                    </label>
                    {loadErrorKey && (
                        <p id="join-load-error" role="alert" className="mt-2 text-sm text-destructive">
                            {t(loadErrorKey)}
                        </p>
                    )}
                    {phase === 'loading' && <LoadingText className="mt-3" />}
                    <button type="submit" disabled={phase === 'loading' || !slug.trim()} className={`mt-4 ${primaryButtonClass}`}>
                        {t('forms.apply.load')}
                    </button>
                    {openFailed && openApps === null && (
                        <div role="alert" className="mt-4 flex flex-wrap items-center gap-2 text-sm text-destructive">
                            {t('forms.apply.mine.failed')}
                            <button type="button" onClick={() => void loadOpenApps()} className={secondaryButtonClass}>
                                {t('common.retry')}
                            </button>
                        </div>
                    )}
                    {openApps !== null && openApps.length > 0 && (
                        <section className="mt-5" aria-label={t('forms.apply.mine.title')}>
                            <h3 className="text-sm font-bold text-foreground">{t('forms.apply.mine.title')}</h3>
                            <ul className="mt-2 space-y-2">
                                {openApps.map((a) => (
                                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-medium text-foreground">{t('forms.apply.mine.club', { name: a.club.name || a.club.slug, slug: a.club.slug })}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t(a.onBehalfOf === 'guardian' ? 'forms.apply.open.forChild' : 'forms.apply.open.forSelf')} ·{' '}
                                                {a.status === 'draft' ? t('forms.apply.mine.draft') : t('forms.apply.open.waiting')} · {formatDate(a.submittedAt ?? a.createdAt, language)}
                                            </p>
                                        </div>
                                        <button type="button" disabled={phase === 'loading'} onClick={() => resumeApplication(a)} className={secondaryButtonClass}>
                                            {t(a.status === 'draft' ? 'forms.apply.mine.resume' : 'forms.apply.mine.open')}
                                            <span className="sr-only"> – {a.club.name || a.club.slug}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </form>
            ) : (
                <div className="mt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-foreground">
                            {t('verein.join.slug')}: <span className="font-mono font-semibold">{club.slug}</span>
                        </p>
                        <button type="button" onClick={() => void backToSlug()} className="text-xs font-semibold text-primary underline">
                            {t('forms.apply.otherClub')}
                        </button>
                    </div>

                    {refreshing && <LoadingText className="mt-3" />}
                    {refreshFailed && (
                        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-destructive">
                            {t('forms.apply.refreshFailed')}
                            <button type="button" onClick={() => void load(club.slug, club.mode ?? undefined, true)} className={secondaryButtonClass}>
                                {t('common.retry')}
                            </button>
                        </div>
                    )}

                    {banner && (
                        <div ref={bannerRef} tabIndex={-1} role="status" className="mt-4 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            <p className="flex items-center gap-2 font-semibold">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                                {t('verein.join.pending.title')}
                            </p>
                            <p className="mt-1">{t('verein.join.pending.body')}</p>
                            {banner.warnings.length > 0 && (
                                <ul className="mt-2 list-inside list-disc text-warning">
                                    {banner.warnings.map((key) => (
                                        <li key={key}>{t(key)}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {(club.submitted.length > 0 || club.decided.length > 0) && (
                        <section className="mt-4" aria-label={t('forms.apply.open.title')}>
                            <h3 className="text-sm font-bold text-foreground">{t('forms.apply.open.title')}</h3>
                            <ul className="mt-2 space-y-2">
                                {club.submitted.map((s) => (
                                    <li key={s.id} className="rounded-lg border border-border px-3 py-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                                    {t(s.onBehalfOf === 'guardian' ? 'forms.apply.open.forChild' : 'forms.apply.open.forSelf')}
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                                        <Clock className="h-3 w-3" aria-hidden="true" />
                                                        {t('forms.apply.open.waiting')}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('verein.applications.submitted')} {formatDate(s.submittedAt ?? s.createdAt, language)}
                                                </p>
                                            </div>
                                            {withdrawId === s.id ? (
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-foreground">
                                                    {t('forms.apply.withdraw.confirm')}
                                                    <button type="button" disabled={withdrawBusy} onClick={() => void withdraw(s.id)} className="rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50">
                                                        {t('forms.apply.withdraw.yes')}
                                                    </button>
                                                    <button type="button" disabled={withdrawBusy} onClick={() => setWithdrawId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                                                        {t('verein.roles.add.cancel')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => setWithdrawId(s.id)} className={secondaryButtonClass}>
                                                    {t('forms.apply.withdraw')}
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                                {club.decided.map((s) => (
                                    <DecidedItem key={s.id} submission={s} language={language} t={t} onRefresh={onRefresh} />
                                ))}
                            </ul>
                            {club.decided.some((s) => s.status === 'rejected' || s.status === 'withdrawn') && club.submitted.length === 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">{t('forms.apply.decided.again')}</p>
                            )}
                            {actionErrorKey && (
                                <p role="alert" className="mt-2 text-sm text-destructive">
                                    {t(actionErrorKey)}
                                </p>
                            )}
                            {club.submitted.length > 0 && (
                                <div className="mt-3">
                                    <button type="button" onClick={onRefresh} className={secondaryButtonClass}>
                                        {t('verein.join.pending.refresh')}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {club.mode === null ? (
                        <p className="mt-4 text-sm text-muted-foreground">{t('forms.apply.nothingMore')}</p>
                    ) : (
                        <>
                            {club.modes.length > 1 && (
                                <div className="mt-5">
                                    <p className="text-xs font-semibold text-muted-foreground">{t('forms.apply.mode.label')}</p>
                                    <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={t('forms.apply.mode.label')}>
                                        {club.modes.map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                role="radio"
                                                aria-checked={club.mode === m}
                                                onClick={() => void changeMode(m)}
                                                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                                                    club.mode === m ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'
                                                }`}
                                            >
                                                {t(m === 'guardian' ? 'forms.apply.mode.child' : 'forms.apply.mode.self')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {club.mode === 'guardian' && (
                                <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
                                    <p className="font-medium">{t('forms.apply.child.title')}</p>
                                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                                        <li>{t('forms.apply.child.hint.data')}</li>
                                        <li>{t('forms.apply.child.hint.consent')}</li>
                                        <li>{t('forms.apply.child.hint.account')}</li>
                                    </ul>
                                </div>
                            )}
                            <ApplicationForm
                                key={`${club.formKey}:${club.mode}`}
                                slug={club.slug}
                                mode={club.mode}
                                current={club.definition}
                                resume={club.resume}
                                registerFlush={(flush) => {
                                    flushRef.current = flush;
                                }}
                                onSubmitted={(r) => void handleSubmitted(r)}
                                onConflict={setConflict}
                                onDiscarded={() => void load(club.slug, club.mode ?? undefined)}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

/** A decided application in the applicant's list: status, date (Berlin day), and for a rejection the board's message as plain text. */
export function DecidedItem({
    submission: s,
    language,
    t,
    onRefresh,
}: {
    submission: MySubmission;
    language: string;
    t: (key: string, params?: Record<string, string | number>) => string;
    onRefresh: () => void;
}) {
    const message = decisionMessage(s);
    const accepted = s.status === 'accepted';
    const rejected = s.status === 'rejected';
    return (
        <li className="rounded-lg border border-border px-3 py-2">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                {t(s.onBehalfOf === 'guardian' ? 'forms.apply.open.forChild' : 'forms.apply.open.forSelf')}
                <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        accepted ? 'bg-success/15 text-success' : rejected ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                    }`}
                >
                    {accepted ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <XCircle className="h-3 w-3" aria-hidden="true" />}
                    {t(`forms.apply.decided.${s.status}`)}
                </span>
            </p>
            <p className="text-xs text-muted-foreground">{t('forms.apply.decided.on', { date: formatDate(s.decidedAt ?? s.submittedAt ?? s.createdAt, language) })}</p>
            {rejected && (
                <div className="mt-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">{t('forms.apply.decided.message')}</p>
                    <p className={`mt-0.5 whitespace-pre-line break-words ${message ? 'text-foreground' : 'text-muted-foreground'}`}>{message ?? t('forms.apply.decided.noMessage')}</p>
                </div>
            )}
            {accepted && (
                <div className="mt-2 text-sm text-foreground">
                    <p>{t('forms.apply.decided.acceptedHint')}</p>
                    <button type="button" onClick={onRefresh} className={`mt-2 ${secondaryButtonClass}`}>
                        {t('verein.join.pending.refresh')}
                    </button>
                </div>
            )}
        </li>
    );
}
