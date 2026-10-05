'use client';

import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubRegistration } from '@/components/verein/clubRegistration';

const primaryButton = 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50';
const secondaryButton = 'rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50';

/**
 * Status view for the user's latest (non-draft) club registration:
 * pending / needs_info / rejected / approved. The parent decides what the buttons do.
 */
export default function RegistrationStatusCard({
    registration,
    refreshing,
    onEdit,
    onNew,
    onRefresh,
    onOpenClub,
    className = 'mt-6',
}: {
    registration: ClubRegistration;
    refreshing: boolean;
    onEdit: () => void;
    onNew: () => void;
    onRefresh: () => void;
    onOpenClub: () => void;
    className?: string;
}) {
    const { t, language } = useLanguage();
    const name = registration.clubName;
    const status = registration.status;

    const Icon = status === 'approved' ? CheckCircle2 : status === 'rejected' ? XCircle : status === 'needs_info' ? AlertCircle : Clock;
    const iconBg = status === 'rejected' ? 'bg-destructive/15' : 'bg-primary/15';
    const iconColor = status === 'rejected' ? 'text-destructive' : 'text-primary';

    return (
        <div className={`${className} rounded-xl border border-border bg-card p-5`} role="status">
            <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-foreground">{t(`verein.create.status.${status}.title`)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t(`verein.create.status.${status}.body`, { name })}</p>
                    {registration.submittedAt && status === 'pending' && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t('verein.create.status.submittedAt')} {new Date(registration.submittedAt).toLocaleDateString(language)}
                        </p>
                    )}

                    {(status === 'needs_info' || status === 'rejected') && registration.reviewNote && (
                        <div className="mt-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                                {t(status === 'needs_info' ? 'verein.create.status.note' : 'verein.create.status.reason')}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{registration.reviewNote}</p>
                        </div>
                    )}

                    {status === 'approved' && (
                        <div className="mt-3">
                            {registration.clubSlug && (
                                <>
                                    <p className="text-xs font-semibold text-muted-foreground">{t('verein.create.status.slug')}</p>
                                    <p className="mt-1 inline-block rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground">
                                        {registration.clubSlug}
                                    </p>
                                </>
                            )}
                            <p className="mt-2 text-sm text-muted-foreground">{t('verein.create.status.approved.hint')}</p>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                        {status === 'pending' && (
                            <button type="button" onClick={onRefresh} disabled={refreshing} className={primaryButton}>
                                {t('verein.create.status.refresh')}
                            </button>
                        )}
                        {status === 'needs_info' && (
                            <button type="button" onClick={onEdit} className={primaryButton}>
                                {t('verein.create.status.edit')}
                            </button>
                        )}
                        {status === 'rejected' && (
                            <button type="button" onClick={onNew} className={primaryButton}>
                                {t('verein.create.status.new')}
                            </button>
                        )}
                        {status === 'approved' && (
                            <button type="button" onClick={onOpenClub} className={primaryButton}>
                                {t('verein.create.status.open')}
                            </button>
                        )}
                        {status === 'needs_info' && (
                            <button type="button" onClick={onRefresh} disabled={refreshing} className={secondaryButton}>
                                {t('verein.create.status.refresh')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
