'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link2, Link2Off, Mail } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { Chip, errorMessage } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { type ClubMember, formatDate, inputClass, isLeftStatus, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { isValidEmail, type MemberInvite, unlinkBlockers, unlinkErrorKey } from '@/lib/memberLifecycle';
import { memberErrorKey } from '@/lib/clubMembers';

type Dialog = 'invite' | 'revoke' | 'unlink' | null;

/**
 * "Konto" block of the member detail (Wave 7 W3), only rendered for callers with `members:write`.
 * Members without account: invite by e-mail (`POST /club-members/:id/invite`), show the open invitation
 * (`GET`), revoke it (`DELETE`). Members with account: "Konto lösen" (`POST /club-members/:id/unlink`), which asks
 * for confirmation and, on a 409 `account_has_open_items`, lists what would be deleted and requires an explicit
 * "trotzdem lösen" (`force`).
 */
export default function MemberAccountSection({
    member,
    clubId,
    onMemberChanged,
}: {
    member: ClubMember;
    clubId: string;
    /** The unlink answered with the updated member. */
    onMemberChanged: (member: ClubMember) => void;
}) {
    const { t, language } = useLanguage();
    const left = isLeftStatus(member.effectiveStatus);
    const canInvite = !member.hasAccount && !left;

    const [invite, setInvite] = useState<MemberInvite | null>(null);
    const [inviteState, setInviteState] = useState<'idle' | 'loading' | 'error'>('idle');
    const [dialog, setDialog] = useState<Dialog>(null);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

    const loadInvite = useCallback(async () => {
        setInviteState('loading');
        try {
            const res = await apiFetch<{ data: MemberInvite | null }>(`/club-members/${member.id}/invite?clubId=${clubId}`);
            setInvite(res.data);
            setInviteState('idle');
        } catch {
            setInviteState('error');
        }
    }, [member.id, clubId]);

    useEffect(() => {
        if (!canInvite) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadInvite();
    }, [canInvite, loadInvite]);

    function openDialog(next: Exclude<Dialog, null>) {
        setNotice(null);
        setDialog(next);
    }

    const [resending, setResending] = useState(false);
    async function resend() {
        if (resending) return;
        setResending(true);
        setNotice(null);
        try {
            const res = await apiFetch<{ data: MemberInvite }>(`/club-members/${member.id}/invite/resend?clubId=${clubId}`, { method: 'POST' });
            setInvite(res.data);
            setNotice(
                res.data.emailSent === false
                    ? { ok: false, text: t('verein.account.invite.resentNoMail', { email: res.data.email }) }
                    : { ok: true, text: t('verein.account.invite.resent', { email: res.data.email }) },
            );
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
                setNotice({ ok: false, text: t('verein.account.invite.resendGone') });
                void loadInvite();
            } else if (err instanceof ApiError && err.status === 429) {
                setNotice({ ok: false, text: t('verein.account.invite.resendRate') });
            } else {
                setNotice({ ok: false, text: errorMessage(err, t) });
            }
        } finally {
            setResending(false);
        }
    }

    return (
        <section className="mb-4 rounded-lg border border-border p-3" aria-labelledby={`account-${member.id}`}>
            <h3 id={`account-${member.id}`} className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Link2 className="h-4 w-4" aria-hidden="true" /> {t('verein.account.title')}
            </h3>

            {member.hasAccount ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Chip tone="success">{t('verein.account.linked')}</Chip>
                    <p className="text-xs text-muted-foreground">{t('verein.account.linked.hint')}</p>
                    <button type="button" onClick={() => openDialog('unlink')} className={`ml-auto ${secondaryButtonClass}`}>
                        <Link2Off className="h-4 w-4" aria-hidden="true" /> {t('verein.account.unlink')}
                    </button>
                </div>
            ) : left ? (
                <p className="mt-2 text-xs text-muted-foreground">{t('verein.account.left')}</p>
            ) : (
                <div className="mt-2 space-y-2">
                    {inviteState === 'loading' && <p className="text-xs text-muted-foreground">{t('verein.account.invite.loading')}</p>}
                    {inviteState === 'error' && (
                        <p role="alert" className="text-xs text-destructive">
                            {t('verein.account.invite.loadError')}{' '}
                            <button type="button" onClick={() => void loadInvite()} className="font-semibold underline">
                                {t('verein.common.retry')}
                            </button>
                        </p>
                    )}
                    {inviteState === 'idle' && !invite && <p className="text-xs text-muted-foreground">{t('verein.account.invite.none')}</p>}
                    {inviteState === 'idle' && invite && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Chip tone={invite.status === 'pending' ? 'primary' : 'warning'}>{t(`verein.account.invite.status.${invite.status}`)}</Chip>
                            <span className="text-foreground">{invite.email}</span>
                            <span className="text-muted-foreground">
                                {t(invite.status === 'pending' ? 'verein.account.invite.validUntil' : 'verein.account.invite.expiredOn', {
                                    date: formatDate(invite.expiresAt, language),
                                })}
                            </span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openDialog('invite')} disabled={inviteState === 'loading'} className={secondaryButtonClass}>
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            {invite ? t('verein.account.invite.resend') : t('verein.account.invite')}
                        </button>
                        {invite && (invite.status === 'pending' || invite.status === 'expired') && (
                            <button type="button" onClick={() => void resend()} disabled={resending} className={secondaryButtonClass}>
                                <Mail className="h-4 w-4" aria-hidden="true" />
                                {resending ? t('verein.account.invite.resending') : t('verein.account.invite.resendNow')}
                            </button>
                        )}
                        {invite && (
                            <button type="button" onClick={() => openDialog('revoke')} className={secondaryButtonClass}>
                                {t('verein.account.invite.revoke')}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {notice && (
                <p role={notice.ok ? 'status' : 'alert'} className={`mt-2 text-xs ${notice.ok ? 'text-success' : 'text-warning'}`}>
                    {notice.text}
                </p>
            )}

            {dialog === 'invite' && (
                <InviteDialog
                    member={member}
                    clubId={clubId}
                    initialEmail={invite?.email ?? member.contactEmail ?? member.email ?? ''}
                    onClose={() => setDialog(null)}
                    onDone={(created) => {
                        setInvite(created);
                        setDialog(null);
                        setNotice(
                            created.emailSent === false
                                ? { ok: false, text: t('verein.account.invite.sentNoMail', { email: created.email }) }
                                : { ok: true, text: t('verein.account.invite.sent', { email: created.email }) },
                        );
                    }}
                />
            )}
            {dialog === 'revoke' && (
                <RevokeDialog
                    member={member}
                    clubId={clubId}
                    onClose={() => setDialog(null)}
                    onDone={() => {
                        setInvite(null);
                        setDialog(null);
                        setNotice({ ok: true, text: t('verein.account.invite.revoked') });
                    }}
                />
            )}
            {dialog === 'unlink' && (
                <UnlinkDialog
                    member={member}
                    clubId={clubId}
                    onClose={() => setDialog(null)}
                    onDone={(updated) => {
                        setDialog(null);
                        setNotice({ ok: true, text: t('verein.account.unlinked') });
                        onMemberChanged(updated);
                    }}
                />
            )}
        </section>
    );
}

function InviteDialog({
    member,
    clubId,
    initialEmail,
    onClose,
    onDone,
}: {
    member: ClubMember;
    clubId: string;
    initialEmail: string;
    onClose: () => void;
    onDone: (invite: MemberInvite) => void;
}) {
    const { t } = useLanguage();
    const [email, setEmail] = useState(initialEmail);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const valid = isValidEmail(email);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: MemberInvite }>(`/club-members/${member.id}/invite?clubId=${clubId}`, {
                method: 'POST',
                body: { email: email.trim() },
            });
            onDone(res.data);
        } catch (err) {
            setError(errorMessage(err, t));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('verein.account.invite.title', { name: member.name ?? '—' })}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button type="submit" form="member-invite-form" disabled={!valid || busy} className={primaryButtonClass}>
                        {t('verein.account.invite.send')}
                    </button>
                </div>
            }
        >
            <form id="member-invite-form" onSubmit={(e) => void submit(e)}>
                <p className="text-sm text-muted-foreground">{t('verein.account.invite.body')}</p>
                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    {t('verein.account.invite.email')}
                    <input
                        type="email"
                        value={email}
                        maxLength={320}
                        autoFocus
                        autoComplete="off"
                        onChange={(e) => setEmail(e.target.value)}
                        className={`mt-1 ${inputClass}`}
                    />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">{t('verein.account.invite.emailHint')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('verein.account.invite.notifyHint')}</p>
                {error && (
                    <p role="alert" className="mt-3 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}

function RevokeDialog({ member, clubId, onClose, onDone }: { member: ClubMember; clubId: string; onClose: () => void; onDone: () => void }) {
    const { t } = useLanguage();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function revoke() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/club-members/${member.id}/invite?clubId=${clubId}`, { method: 'DELETE' });
            onDone();
        } catch (err) {
            setError(errorMessage(err, t));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('verein.account.revoke.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void revoke()}
                        disabled={busy}
                        className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                    >
                        {t('verein.account.invite.revoke')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">{t('verein.account.revoke.body', { name: member.name ?? '—' })}</p>
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}

function UnlinkDialog({
    member,
    clubId,
    onClose,
    onDone,
}: {
    member: ClubMember;
    clubId: string;
    onClose: () => void;
    onDone: (member: ClubMember) => void;
}) {
    const { t } = useLanguage();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [blockers, setBlockers] = useState<{ key: string; count: number }[] | null>(null);
    const [force, setForce] = useState(false);

    async function unlink() {
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data?: ClubMember }>(`/club-members/${member.id}/unlink?clubId=${clubId}`, {
                method: 'POST',
                body: force ? { force: true } : {},
            });
            if (!res.data) throw new Error('Request failed');
            onDone(res.data);
        } catch (err) {
            const list = unlinkBlockers(err);
            if (list) {
                setBlockers(list);
                setForce(false);
            } else {
                setError(t(unlinkErrorKey(err, memberErrorKey)));
            }
            setBusy(false);
        }
    }

    const needsForce = blockers !== null;

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('verein.account.unlink.title', { name: member.name ?? '—' })}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void unlink()}
                        disabled={busy || (needsForce && !force)}
                        className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                    >
                        {needsForce ? t('verein.account.unlink.force') : t('verein.account.unlink')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">{t('verein.account.unlink.body')}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('verein.account.unlink.note')}</p>

            {blockers && (
                <div role="alert" className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                    <p className="font-semibold">{t('verein.account.unlink.openItems')}</p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5">
                        {blockers.map((b) => (
                            <li key={b.key}>{t(`verein.account.unlink.item.${b.key}`, { count: b.count })}</li>
                        ))}
                    </ul>
                    <label className="mt-3 flex items-start gap-2 text-sm">
                        <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="mt-0.5" />
                        <span>{t('verein.account.unlink.forceConfirm')}</span>
                    </label>
                </div>
            )}
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}
