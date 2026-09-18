'use client';

import { useState, FormEvent } from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { appName } from '../../../project.config.json';
import type { ContactCategory } from '../api/contact/route';

const CATEGORIES: ContactCategory[] = ['bug', 'feature', 'general'];

// TODO: point this at your real support address before shipping (also used by the mailto fallback below).
const CONTACT_EMAIL = 'contact@example.com';

function mailtoFallback(name: string, email: string, category: ContactCategory, message: string): string {
  const subject = encodeURIComponent(`${appName} contact form (${category})`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

export default function ContactForm() {
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<ContactCategory>('general');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const canSubmit = name.trim() && email.trim() && message.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, category, message, honeypot }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle className="h-5 w-5 text-primary" strokeWidth={2.25} />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">{t('contact.title')}</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{t('contact.description')}</p>

      {status === 'success' ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-foreground shadow-sm">{t('contact.success')}</p>
      ) : (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Honeypot -- off-screen, not display:none (some bots skip hidden fields but not off-screen ones), real users never see or fill it. */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px]"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground">{t('contact.field-name')}</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">{t('contact.field-email')}</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-foreground">{t('contact.field-category')}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
              style={{
                borderColor: 'var(--color-primary)',
                backgroundColor: category === c ? 'var(--color-primary)' : 'transparent',
                color: category === c ? 'var(--color-primary-foreground)' : 'var(--color-primary)',
              }}
            >
              {t(`contact.category-${c}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-foreground">{t('contact.field-message')}</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {status === 'error' && (
        <div className="mt-3">
          <p className="text-sm text-red-600">{t('contact.error')}</p>
          <a href={mailtoFallback(name, email, category, message)} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:brightness-110">
            <Mail className="h-4 w-4" />
            {t('contact.mailto-fallback')}
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="mt-4 inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {submitting ? t('contact.submitting') : t('contact.submit')}
      </button>
    </form>
      )}
    </div>
  );
}
