import type { ContactCategory } from '../app/api/contact/route';
import { appName as APP_NAME, primaryColor } from '../../project.config.json';

// This site's own origin, used for the logo link and footer's
// Imprint/Contact links -- same convention as auth-client.ts's `siteUrl`.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

// `primary` comes from project.config.json (same value globals.css's
// `--primary` token should carry -- mail clients can't read CSS variables,
// so this can't just reference globals.css). The rest of this palette is a
// generic neutral scale that works with any accent color; swap it if a
// project needs more than an accent change. Fixed to German -- this
// template has no i18n system for contact-form content, and German is this
// template suite's default (see LanguageContext).
const BRAND = {
  primary: primaryColor,
  background: '#f8fafc',
  card: '#ffffff',
  foreground: '#0f172a',
  mutedForeground: '#64748b',
  border: '#e2e8f0',
};

/**
 * HTML + plain-text confirmation ("response") mail sent back to whoever
 * submitted the contact form. The logo is embedded as a `cid:` attachment
 * (see route.ts) -- inlined base64 or a bare hosted URL are the
 * alternatives, but `cid` is the one that reliably renders across mail
 * clients without depending on the app being deployed/reachable.
 */
export function buildConfirmationEmail({
  name,
  category,
  logoCid,
}: {
  name: string;
  category: ContactCategory;
  logoCid: string;
}): { subject: string; html: string; text: string } {
  const subject = `${APP_NAME} - Deine Nachricht wurde empfangen`;
  const greeting = `Hallo ${name},`;
  const body =
    category === 'bug'
      ? 'danke für die Meldung -- wir haben sie erhalten und kümmern uns so schnell wie möglich darum.'
      : category === 'feature'
        ? 'danke für den Vorschlag -- wir haben ihn erhalten und werden ihn berücksichtigen.'
        : 'danke für deine Nachricht -- sie wurde empfangen und wird bearbeitet. Du hörst so schnell wie möglich von uns.';
  const signoff = 'Viele Grüße,';
  const team = `Dein ${APP_NAME}-Team`;

  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0; padding:0; background-color:${BRAND.background}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.background}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:${BRAND.card}; border:1px solid ${BRAND.border}; border-radius:16px; overflow:hidden;">
            <tr>
              <td style="padding:28px 32px; border-bottom:1px solid ${BRAND.border};">
                <a href="${SITE_URL}" style="text-decoration:none;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:10px;">
                        <img src="cid:${logoCid}" width="36" height="36" alt="${APP_NAME}" style="display:block; border-radius:9px;" />
                      </td>
                      <td style="font-size:19px; font-weight:700; color:${BRAND.foreground};">${APP_NAME}</td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px; font-size:16px; font-weight:600; color:${BRAND.foreground};">${greeting}</p>
                <p style="margin:0; font-size:15px; line-height:1.6; color:${BRAND.foreground};">${body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0; font-size:15px; color:${BRAND.foreground};">${signoff}<br />${team}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; background-color:${BRAND.background}; border-top:1px solid ${BRAND.border};">
                <p style="margin:0; font-size:12px; color:${BRAND.mutedForeground};">
                  <a href="${SITE_URL}" style="color:${BRAND.primary}; text-decoration:none;">${APP_NAME}</a>
                  &middot;
                  <a href="${SITE_URL}/imprint" style="color:${BRAND.primary}; text-decoration:none;">Impressum</a>
                  &middot;
                  <a href="${SITE_URL}/contact" style="color:${BRAND.primary}; text-decoration:none;">Kontakt</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${greeting}\n\n${body}\n\n${signoff}\n${team}`;

  return { subject, html, text };
}
