/**
 * Club settings for communication (Wave 9 W6): reminder switches and lead times, the automatic age transition and the
 * club's mail template (sender name, signature, reply-to). `GET`/`PATCH /club-settings` carry them next to the club rules
 * (`members:write` for reminders/age transition, `announcements:write` for the mail template fields).
 */

export interface ReminderSettings {
    reminderEventEnabled: boolean;
    reminderEventLeadHours: number;
    reminderLoanEnabled: boolean;
    reminderLoanLeadDays: number;
    reminderMaintenanceEnabled: boolean;
    reminderMaintenanceLeadDays: number;
    reminderRsvpEnabled: boolean;
    reminderRsvpLeadDays: number;
    ageTransitionAuto: boolean;
}

export interface MailTemplateSettings {
    senderName: string | null;
    signature: string | null;
    replyTo: string | null;
}

export type ReminderKey = 'event' | 'loan' | 'maintenance' | 'rsvp';

/** Range and unit of each lead time (backend limits: event 1-168 h, loan 0-30 d, maintenance 0-90 d, RSVP 1-30 d). */
export const REMINDER_RULES: Record<ReminderKey, { enabled: keyof ReminderSettings; lead: keyof ReminderSettings; min: number; max: number; unit: 'hours' | 'days' }> = {
    event: { enabled: 'reminderEventEnabled', lead: 'reminderEventLeadHours', min: 1, max: 168, unit: 'hours' },
    loan: { enabled: 'reminderLoanEnabled', lead: 'reminderLoanLeadDays', min: 0, max: 30, unit: 'days' },
    maintenance: { enabled: 'reminderMaintenanceEnabled', lead: 'reminderMaintenanceLeadDays', min: 0, max: 90, unit: 'days' },
    rsvp: { enabled: 'reminderRsvpEnabled', lead: 'reminderRsvpLeadDays', min: 1, max: 30, unit: 'days' },
};
export const REMINDER_KEYS = Object.keys(REMINDER_RULES) as ReminderKey[];

/** Whole number inside the range, `undefined` for anything else (empty, fractional, out of range). */
export function parseLead(raw: string, min: number, max: number): number | undefined {
    if (!/^\d+$/.test(raw.trim())) return undefined;
    const n = Number(raw);
    return n >= min && n <= max ? n : undefined;
}

export const SENDER_NAME_MAX = 80;
export const SIGNATURE_MAX = 1000;

export function isValidReplyTo(value: string): boolean {
    const v = value.trim();
    return v === '' || (v.length <= 254 && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(v));
}

export interface MailTemplateDraft {
    senderName: string;
    signature: string;
    replyTo: string;
}

export function draftFromTemplate(s: Partial<MailTemplateSettings>): MailTemplateDraft {
    return { senderName: s.senderName ?? '', signature: s.signature ?? '', replyTo: s.replyTo ?? '' };
}

export type MailTemplateProblem = 'senderName' | 'signature' | 'replyTo';

export function mailTemplateProblems(d: MailTemplateDraft): MailTemplateProblem[] {
    const out: MailTemplateProblem[] = [];
    if (d.senderName.length > SENDER_NAME_MAX || /[\r\n\u0000-\u001f]/.test(d.senderName)) out.push('senderName');
    if (d.signature.length > SIGNATURE_MAX) out.push('signature');
    if (!isValidReplyTo(d.replyTo)) out.push('replyTo');
    return out;
}

/** Only the changed mail template fields; an emptied field clears the stored value (`null`). */
export function mailTemplatePatch(saved: Partial<MailTemplateSettings>, d: MailTemplateDraft): Partial<MailTemplateSettings> {
    const patch: Partial<MailTemplateSettings> = {};
    const next = (v: string) => (v.trim() === '' ? null : v.trim());
    if (next(d.senderName) !== (saved.senderName ?? null)) patch.senderName = next(d.senderName);
    if (next(d.signature) !== (saved.signature ?? null)) patch.signature = next(d.signature);
    if ((next(d.replyTo)?.toLowerCase() ?? null) !== (saved.replyTo ?? null)) patch.replyTo = next(d.replyTo);
    return patch;
}

export const MAIL_PREVIEW_TEMPLATES = ['announcement', 'urgent', 'reminder', 'decision'] as const;
export type MailPreviewTemplate = (typeof MAIL_PREVIEW_TEMPLATES)[number];

export interface MailPreview {
    sample: true;
    subject: string;
    html: string;
    from: string;
    replyTo: string | null;
}
