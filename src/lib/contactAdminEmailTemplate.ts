import type { ContactPayload } from '../app/api/contact/route';
import { appName, primaryColor } from '../../project.config.json';

const BORDER = '#e2e8f0';
const HEADER_BG = primaryColor;
const HEADER_FG = '#ffffff';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Internal notification mail sent to the contact inbox. Built as a real
 * <table> (not flexbox/grid) so pasting it straight out of the mail client
 * into Excel/Sheets keeps the rows intact.
 */
export function buildAdminNotificationEmail(payload: ContactPayload): { subject: string; html: string; text: string } {
  const { name, email, category, message, referral } = payload;
  const subject = `Kontaktanfrage über ${appName} (${category}) von ${name}`;

  const rows: [string, string][] = [
    ['Name', name],
    ['E-Mail', email],
    ['Kategorie', category],
    ['Nachricht', message],
  ];
  // Only the `beta` category collects a referral ("how did you hear about
  // us") field -- add the row only when there's actually a value, so every
  // other category's table stays exactly as it was.
  if (referral) rows.push(['Empfohlen durch', referral]);

  const body = rows
    .map(
      ([field, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid ${BORDER};font-weight:600;white-space:nowrap;">${escapeHtml(field)}</td><td style="padding:8px 12px;border:1px solid ${BORDER};white-space:pre-wrap;">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  const html = `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#0f172a;">
    <tr>
      <th style="padding:8px 12px;border:1px solid ${BORDER};background:${HEADER_BG};color:${HEADER_FG};text-align:left;" colspan="2">Neue Kontaktanfrage</th>
    </tr>
    ${body}
  </table>`;

  const text = rows.map(([field, value]) => `${field}: ${value}`).join('\n');

  return { subject, html, text };
}
