/**
 * Single source of the shared control classes (inputs, buttons). The per-feature constants
 * (`inputClass`, `primaryButtonClass`, `primaryBtn`, ...) re-export these so a form control looks the same on every page.
 * Controls are 44px tall (touch target), radius 8px, colour and filter transitions only, a tiny press scale.
 */
export const UI_INPUT =
    'min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]';

const BTN_BASE = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-[filter,background-color,transform] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100';

export const UI_BTN_PRIMARY = `${BTN_BASE} bg-primary text-primary-foreground hover:brightness-110`;
export const UI_BTN_SECONDARY = `${BTN_BASE} border border-border bg-card text-foreground hover:bg-muted`;
export const UI_BTN_DANGER_OUTLINE = `${BTN_BASE} border border-destructive/40 text-destructive hover:bg-destructive/10`;
export const UI_BTN_DANGER = `${BTN_BASE} bg-destructive text-destructive-foreground hover:brightness-110`;
export const UI_BTN_ICON = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';
export const UI_LABEL = 'mb-1 block text-xs font-medium text-muted-foreground';
