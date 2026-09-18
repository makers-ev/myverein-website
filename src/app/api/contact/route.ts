import path from 'node:path';

import nodemailer from 'nodemailer';

import { buildAdminNotificationEmail } from '../../../lib/contactAdminEmailTemplate';
import { buildConfirmationEmail } from '../../../lib/contactEmailTemplate';

export type ContactCategory = 'bug' | 'feature' | 'general';

export interface ContactPayload {
  name: string;
  email: string;
  category: ContactCategory;
  message: string;
}

const CATEGORIES: ContactCategory[] = ['bug', 'feature', 'general'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pure validation, no I/O -- unit-testable without mocking nodemailer/env.
 * `honeypot` must arrive empty; a filled-in value means a bot filled out a
 * field real users never see.
 */
export function validateContactPayload(body: unknown): { data: ContactPayload } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Invalid request body' };
  const { name, email, category, message, honeypot } = body as Record<string, unknown>;

  if (typeof honeypot === 'string' && honeypot !== '') return { error: 'Message not sent' };
  if (typeof name !== 'string' || !name.trim()) return { error: 'Name is required' };
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) return { error: 'A valid email is required' };
  if (typeof category !== 'string' || !CATEGORIES.includes(category as ContactCategory)) {
    return { error: 'Invalid category' };
  }
  if (typeof message !== 'string' || !message.trim()) return { error: 'Message is required' };

  return { data: { name: name.trim(), email: email.trim(), category: category as ContactCategory, message: message.trim() } };
}

// Embedded via `cid:` in both templates rather than a hosted URL or inline
// base64 -- the one approach that reliably renders across mail clients
// without depending on the site being deployed/reachable.
const LOGO_CID = 'app-logo';
const LOGO_PATH = path.join(process.cwd(), 'public', 'myverein-logo.png');

// Generic SMTP transport, independent of anything the backend template's
// own email.ts might use -- this route sends mail itself. Configure via
// CONTACT_SMTP_* env vars (.env.example); the route responds 503 (not a
// silent failure) if they're unset.
function buildTransporter() {
  const host = process.env.CONTACT_SMTP_HOST;
  const user = process.env.CONTACT_SMTP_USER;
  const pass = process.env.CONTACT_SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.CONTACT_SMTP_PORT ?? 587),
    secure: process.env.CONTACT_SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export async function POST(req: Request) {
  let payload: ContactPayload;
  try {
    const result = validateContactPayload(await req.json());
    if ('error' in result) return Response.json({ error: result.error }, { status: 400 });
    payload = result.data;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const transporter = buildTransporter();
  const toAddress = process.env.CONTACT_TO_EMAIL;
  const fromAddress = process.env.CONTACT_FROM_EMAIL ?? process.env.CONTACT_SMTP_USER;
  if (!transporter || !toAddress || !fromAddress) {
    return Response.json({ error: 'Contact form is not configured' }, { status: 503 });
  }

  try {
    const admin = buildAdminNotificationEmail(payload);
    await transporter.sendMail({
      from: fromAddress,
      to: toAddress,
      subject: admin.subject,
      html: admin.html,
      text: admin.text,
    });

    const confirmation = buildConfirmationEmail({ name: payload.name, category: payload.category, logoCid: LOGO_CID });
    await transporter.sendMail({
      from: fromAddress,
      to: payload.email,
      subject: confirmation.subject,
      html: confirmation.html,
      text: confirmation.text,
      attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID }],
    });
  } catch {
    return Response.json({ error: 'Could not send message' }, { status: 502 });
  }

  return Response.json({ success: true });
}
