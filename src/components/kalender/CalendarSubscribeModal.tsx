'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { ApiError, apiFetch } from '@/lib/api-client';

import { type Calendar, type TFn, dangerBtn, errorMessage, inputClass, labelClass, primaryBtn, secondaryBtn } from './calendarTypes';

interface FeedLink {
    id: string;
    label: string | null;
    calendarId: string | null;
    calendarName: string | null;
    createdAt: string;
    lastUsedAt: string | null;
}

/** Returned only by create and rotate: token and URLs are never shown again. */
interface IssuedFeed extends FeedLink {
    token: string;
    url: string;
    webcalUrl: string;
}

interface Props {
    clubId: string;
    calendars: Calendar[];
    language: string;
    t: TFn;
    onClose: () => void;
}

/** "Kalender abonnieren": personal subscription links (`/calendar-feeds`), shown once, listed with revoke and rotate. */
export default function CalendarSubscribeModal({ clubId, calendars, language, t, onClose }: Props) {
    const [links, setLinks] = useState<FeedLink[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [calendarId, setCalendarId] = useState('');
    const [label, setLabel] = useState('');
    const [issued, setIssued] = useState<IssuedFeed | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const res = await apiFetch<{ data: FeedLink[] }>(`/calendar-feeds?clubId=${clubId}`);
            setLinks(res.data);
        } catch (err) {
            setLoadError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function run(action: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError(err instanceof ApiError && err.status === 409 ? t('kalender.feeds.err.limit') : errorMessage(err, t));
        } finally {
            setBusy(false);
        }
    }

    const create = () =>
        run(async () => {
            const res = await apiFetch<{ data: IssuedFeed }>(`/calendar-feeds?clubId=${clubId}`, {
                method: 'POST',
                body: { calendarId: calendarId || null, ...(label.trim() ? { label: label.trim() } : {}) },
            });
            setIssued(res.data);
            setCopied(null);
            setLabel('');
            await load();
        });

    const rotate = (link: FeedLink) => {
        if (!window.confirm(t('kalender.feeds.rotate.confirm'))) return Promise.resolve();
        return run(async () => {
            const res = await apiFetch<{ data: IssuedFeed }>(`/calendar-feeds/${link.id}/rotate?clubId=${clubId}`, { method: 'POST' });
            setIssued(res.data);
            setCopied(null);
            await load();
        });
    };

    const revoke = (link: FeedLink) => {
        if (!window.confirm(t('kalender.feeds.revoke.confirm'))) return Promise.resolve();
        return run(async () => {
            await apiFetch(`/calendar-feeds/${link.id}?clubId=${clubId}`, { method: 'DELETE' });
            setIssued((prev) => (prev?.id === link.id ? null : prev));
            await load();
        });
    };

    async function copy(key: string, text: string) {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
        } catch {
            setCopied(null);
        }
    }

    const fmt = (iso: string) => new Date(iso).toLocaleDateString(language, { dateStyle: 'medium' });

    return (
        <Modal open onClose={onClose} title={t('kalender.feeds.title')} size="lg" footer={<div className="flex justify-end"><button type="button" onClick={onClose} className={secondaryBtn}>{t('kalender.feeds.close')}</button></div>}>
            <div className="space-y-5 text-sm">
                <p className="text-muted-foreground">{t('kalender.feeds.intro')}</p>

                {issued && (
                    <div role="status" className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-3">
                        <p className="font-semibold text-foreground">{t('kalender.feeds.issued.title')}</p>
                        <p className="text-foreground">{t('kalender.feeds.issued.warning')}</p>
                        {([
                            ['url', t('kalender.feeds.issued.url'), issued.url],
                            ['webcal', t('kalender.feeds.issued.webcal'), issued.webcalUrl],
                        ] as const).map(([key, text, value]) => (
                            <div key={key}>
                                <label htmlFor={`feed-${key}`} className={labelClass}>
                                    {text}
                                </label>
                                <div className="flex gap-2">
                                    <input id={`feed-${key}`} readOnly value={value} onFocus={(e) => e.currentTarget.select()} className={`${inputClass} font-mono text-xs`} />
                                    <button type="button" onClick={() => void copy(key, value)} className={`${secondaryBtn} inline-flex shrink-0 items-center gap-1.5`}>
                                        <Copy className="h-4 w-4" aria-hidden />
                                        {copied === key ? t('kalender.feeds.copied') : t('kalender.feeds.copy')}
                                    </button>
                                </div>
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground">{t('kalender.feeds.issued.howto')}</p>
                        <a href={issued.webcalUrl} className="inline-block text-sm font-semibold text-primary underline">
                            {t('kalender.feeds.issued.open')}
                        </a>
                    </div>
                )}

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void create();
                    }}
                    className="space-y-3 rounded-lg border border-border p-3"
                >
                    <p className="font-semibold text-foreground">{t('kalender.feeds.new')}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor="feed-calendar" className={labelClass}>
                                {t('kalender.feeds.calendar')}
                            </label>
                            <select id="feed-calendar" value={calendarId} onChange={(e) => setCalendarId(e.target.value)} className={inputClass}>
                                <option value="">{t('kalender.feeds.calendar.all')}</option>
                                {calendars.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="feed-label" className={labelClass}>
                                {t('kalender.feeds.label')}
                            </label>
                            <input id="feed-label" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('kalender.feeds.label.placeholder')} className={inputClass} />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('kalender.feeds.visibility')}</p>
                    <button type="submit" disabled={busy} className={primaryBtn}>
                        {t('kalender.feeds.create')}
                    </button>
                </form>

                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                        {error}
                    </p>
                )}

                <section aria-labelledby="feed-list-title">
                    <h3 id="feed-list-title" className="mb-2 font-semibold text-foreground">
                        {t('kalender.feeds.list')}
                    </h3>
                    {loadError ? (
                        <p role="alert" className="text-destructive">
                            {loadError}{' '}
                            <button type="button" onClick={() => void load()} className="font-semibold underline">
                                {t('kalender.cancelEvent.preview.retry')}
                            </button>
                        </p>
                    ) : links === null ? (
                        <p role="status" className="text-muted-foreground">
                            {t('kalender.feeds.loading')}
                        </p>
                    ) : links.length === 0 ? (
                        <p className="text-muted-foreground">{t('kalender.feeds.empty')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {links.map((link) => (
                                <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                                    <span className="min-w-0">
                                        <span className="block truncate font-semibold text-foreground">{link.label || t('kalender.feeds.unnamed')}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {link.calendarName ?? t('kalender.feeds.calendar.all')} · {t('kalender.feeds.created', { date: fmt(link.createdAt) })} ·{' '}
                                            {link.lastUsedAt ? t('kalender.feeds.lastUsed', { date: fmt(link.lastUsedAt) }) : t('kalender.feeds.neverUsed')}
                                        </span>
                                    </span>
                                    <span className="flex gap-2">
                                        <button type="button" disabled={busy} onClick={() => void rotate(link)} className={`${secondaryBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                                            <RefreshCw className="h-4 w-4" aria-hidden />
                                            {t('kalender.feeds.rotate')}
                                        </button>
                                        <button type="button" disabled={busy} onClick={() => void revoke(link)} className={`${dangerBtn} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                                            <Trash2 className="h-4 w-4" aria-hidden />
                                            {t('kalender.feeds.revoke')}
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </Modal>
    );
}
