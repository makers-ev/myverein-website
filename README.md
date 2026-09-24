# Better Auth Website Template

Next.js website template with Better Auth authentication wired in. Talks to
`_template_better-auth-backend`'s Hono server directly from the browser -- this app
has no local `/api/auth` route and no session store of its own.

## Table of contents

- [Pages](#pages)
- [SEO](#seo)
- [Adding a new API request](#adding-a-new-api-request)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Color palettes & theming](#color-palettes--theming)
- [Docker](#docker)
- [Security notes](#security-notes)
- [License](#license)

## Pages

| Route | Access | Content |
|---|---|---|
| `/` | public | Homepage |
| `/features` | public | Marketing feature overview: what's already built today (`builtFeaturesData.ts`), grouped by feature area, each capability tagged Website / App / Website & App via `PlatformBadge` |
| `/about` | public | "Über uns": what MyVerein is, the Makers e.V. project context (link to the-makers.space) and the two developers as cards with GitHub links (avatars are static files in `public/about/`, no external requests); texts in `AboutTranslation.ts` (DE/EN) |
| `/login-signup` | public | Sign in / sign up, with 2FA follow-up, a post-signup "verify your e-mail" prompt, and a self-service "forgot password" flow (`ForgotPasswordPrompt`, toggled from the sign-in form) |
| `/verify-email` | public | Landing page for the verification e-mail's link |
| `/reset-password` | public | Landing page for the "forgot password" e-mail's link — Better Auth's `/reset-password/:token` callback redirects here with `?token=...` (valid) or `?error=...` (invalid/expired, same pattern as `/verify-email`); the form calls `authClient.resetPassword({ newPassword, token })`. The e-mail is triggered by `authClient.requestPasswordReset({ email, redirectTo })` from this site's own "forgot password" flow (see `/login-signup`) or from `_template_better-auth-admin`'s user detail page |
| `/verein` | protected | Tabs: Vereinsinfo (board/departments/documents), Mein Profil (Selbstauskunft: birth date + emergency contact via `PATCH /club-members/me`), Mitglieder (table, role assignment offering only unassigned roles, member edit modal for `members:write`), Abteilungen (create/list). Without a membership it shows the Aufnahmeantrag form (club code + category, `POST /club-members/apply`). Management controls are gated by `permissions` from `GET /club-members/me` |
| `/kalender` | protected | Tabs: Termine (month grid with department-colored event pills/dots and a day agenda, or a grouped upcoming list; event detail modal with RSVP/waitlist; with `calendars:write`: create/edit/delete events in modals, click a day to create, calendar management incl. rename/default/delete and visibility grants), Treffen (meeting cards with status chips, agenda/minutes/status editing, invitee chips, Terminfindung overlap check with progress bars, attendance, resolutions). Write controls are gated by `permissions` from `GET /club-members/me`; any member can read and RSVP |
| `/standorte` | protected | Tabs: Standorte (location CRUD, key holders, WiFi networks, links, `visibleToGuests` toggles), Material (inventory item CRUD incl. a "maintenance due" at-a-glance overview, read-only loans/damage-reports per item plus the one board triage action: damage-report status gemeldet→in_bearbeitung→behoben) — Vorstands-focused (write actions need `locations:write`/`inventory:write`, 403 surfaced inline rather than hidden), any member can read. Member self-service (borrow/return, filing a damage report with a photo) lives on the mobile app only |
| `/verfuegbarkeit` | protected | Self-service: recurring weekly availability (7-day toggle grid + time rows per active day) + one-off exceptions as status cards |
| `/settings` | protected | Account settings: appearance (color palette), change-password, 2FA enable/disable, delete account |
| `/notifications` | protected | Own notifications, Unread/Read tabs, mark read/unread, delete (only where the backend marked it `deletable`) |
| `/contact` | public | Contact form (bug/feature/general), posts to `POST /api/contact` |
| `/error` | public | Auth error landing page |
| `404` | public | Not-found page (rendered for any unmatched route) |

Protected routes live under `src/app/(protected)/` -- `(protected)/layout.tsx`
re-checks the session server-side on every request (the source of truth);
the Navbar's sign-in/account menu (`src/components/AuthNav.tsx`) is only an
optimistic client-side hint of what to show, same principle as `src/proxy.ts`.

`src/components/NotificationBell.tsx` lives inside `AuthNav.tsx` (signed-in
only) and polls the backend's `GET /notifications/unread-count` on an
interval and on window focus (no websocket/SSE in v1). `LanguageContext.tsx`'s
`t(key, params?)` supports `{{paramName}}` interpolation for content that
carries dynamic values as data rather than a fixed string -- the backend's
welcome notification (`translationKey: "notification.welcome"`,
`paramsJson: { appName }`) is the one consumer today, rendered in
`src/app/pageContent/Notifications.tsx`. That page's `useNotificationText`
prefers a notification's `title{De,En}`/`body{De,En}` columns over
`translationKey` whenever they're set -- always true for an admin-authored
notification, and true for a system one only once an admin has overridden
it via the backend's `/admin/notification-templates` (see that repo's
README) -- falling back to `t(translationKey, paramsJson)` otherwise.

`src/app/not-found.tsx` is Next.js's App Router special file for unmatched
routes -- renders inside the root layout (nav/footer/`LanguageProvider`
stay intact) for any URL that doesn't resolve to a page, same card layout
as `/error`/`/verify-email`/`/reset-password` for a consistent family of
"you landed on a dead link" pages. Not listed in the table above since it
has no route of its own to list.

`POST /api/contact` (own route handler, own SMTP transport via `CONTACT_SMTP_*`
env vars -- independent of anything `_template_better-auth-backend`'s
`email.ts` does) sends two HTML mails: a notification to `CONTACT_TO_EMAIL`
(`src/lib/contactAdminEmailTemplate.ts`, a plain field table so it pastes
cleanly into Excel/Sheets) and a branded confirmation back to the sender
(`src/lib/contactEmailTemplate.ts`, same card layout/colors as the backend
template's auth emails). Both read `appName`/`primaryColor` from
`project.config.json` (see [Rebranding this template for a new
project](#rebranding-this-template-for-a-new-project)) and embed
`public/lpj-its.png` via `cid:` -- swap that logo file for a real project.
Responds 503 if `CONTACT_SMTP_*`/`CONTACT_TO_EMAIL` are unset (fails closed,
not a silent no-op).

### Adding a protected page

1. Create the route as a new folder under `src/app/(protected)/`, e.g.
   `src/app/(protected)/billing/page.tsx` -- the `(protected)` segment is a
   [route group](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
   (doesn't appear in the URL), so this becomes `/billing`, not
   `/protected/billing`.
2. Any `page.tsx` placed there automatically inherits
   `(protected)/layout.tsx`'s session check -- there is nothing to import or
   wrap per-page. If the session check fails, it redirects to
   `/login-signup?callbackUrl=/billing` before your page ever renders. The
   `callbackUrl` value comes from the incoming request's `x-url` header,
   set in `src/proxy.ts` -- if you introduce a second middleware or edge
   function, make sure that header still gets set, or the post-login
   redirect silently falls back to `/dashboard`.
3. Follow the existing pages' split: `page.tsx` under `(protected)/` stays
   thin (SEO metadata via `createSiteMetadata`/`createJsonLd`, no
   `connection()` call needed -- the layout's own `headers()` call already
   opts the route into dynamic rendering), the actual UI goes in
   `src/app/pageContent/`, matching `(protected)/settings/page.tsx` ->
   `pageContent/Settings.tsx`.
4. If the page needs a nav entry, add it to `AuthNav.tsx` (shown only to
   signed-in users) rather than the public `Navbar.tsx` links.

## SEO

Everything below is driven by `project.config.json` at the repo root (`title`,
`description`, `url`, `logoUrl`, `author`, `authorUrl`, `keywords`) — **fill
that in for real before deploying**. The shipped placeholder
(`"url": "https://<url>.com"`) is not a valid URL (`<`/`>` aren't legal URL
characters); the build still succeeds against it (`safeMetadataBase()` in
`layout.tsx` falls back to `http://localhost:3000` rather than crashing) but
canonical links, the sitemap, and OG/JSON-LD URLs all render garbage until
it's replaced.

| Piece | File | What it does |
|---|---|---|
| Page title/description/OG/Twitter/canonical | `src/seo/createSiteMetadata.ts`, called from each public `page.tsx`'s `export const metadata` | One shared shape for every public, indexable page. `imageUrl` is optional — omit it (as every page here does) to fall back to the generated `/opengraph-image` route instead of a page-specific image |
| `noindex` pages | `src/seo/createNoIndexMetadata.ts`, called from every `(protected)/*/page.tsx` | Title only, `robots: { index: false, follow: false }`, no OG/Twitter/canonical — nothing behind login is meant to be publicly discoverable. Every new protected page must use this, not `createSiteMetadata` |
| Structured data (JSON-LD) | `src/seo/createJsonLd.ts` + `src/components/seoJsonLd.tsx`, called from `page.tsx` files that want it | Default `type` is `"WebSite"` — pass `type: "BlogPosting"` explicitly if a future page is an actual article. **Needs the request's CSP nonce** (`<JsonLd json={...} nonce={nonce} />`, `nonce` from `(await headers()).get('x-nonce')`) or the browser silently drops the `<script type="application/ld+json">` tag under this app's CSP — this was actually broken (no `nonce` passed) before this got fixed; don't reintroduce it on a new page |
| OG image / Twitter card image | `src/app/opengraph-image.tsx` (`src/app/twitter-image.tsx` re-exports it) | Generated at build time via `next/og`'s `ImageResponse` from `public/lpj-its.svg` + `project.config.json`'s title/description — correctly sized 1200×630, unlike reusing the 1000×1000 logo PNG directly (the original bug this replaced). Edit this file's JSX to change the generated layout, not a static image file |
| Favicon / Apple touch icon | `src/app/icon.tsx` / `src/app/apple-icon.tsx` | Same `next/og` generation approach, 32×32 and 180×180 |
| PWA manifest | `src/app/manifest.ts` | `theme_color`/`background_color` mirror `globals.css`'s `--primary` / light-mode `--background` — keep in sync by hand if the palette changes |
| Sitemap | `src/app/sitemap.ts` | Hardcoded list of public route paths — **add the path here when you add a new public page**, this isn't auto-discovered from the filesystem |
| Robots directives | `src/app/robots.ts` | Points crawlers at `sitemap.xml`; blocks `/admin` for Googlebot and blocks Bing/Semrush entirely (deliberate, not an oversight) |
| `<html lang>` | `src/app/layout.tsx` | Read server-side from the same cookie `LanguageContext.tsx` uses (`src/contexts/languageCookie.ts`'s `COOKIE_NAME`), defaulting to `"de"` — matches the app's actual default language instead of a hardcoded `"en"` |
| Absolute-URL resolution | `metadataBase` in `src/app/layout.tsx` | Lets every relative OG/icon path above resolve to a full URL without repeating `project.config.json`'s `url` everywhere |

**Adding a new page checklist:** public page → `export const metadata = createSiteMetadata({...})` (omit `imageUrl` unless this page needs its own image), add its path to `src/app/sitemap.ts`. Protected page → `export const metadata = createNoIndexMetadata({ title: ... })` instead, and it does **not** go in the sitemap.

**Known, deliberate limitation — pages stay dynamically rendered, not static/ISR:** an earlier attempt (see the vault's `ADR-007` update from 2026-09-07) tried making pages with no per-request content statically prerenderable via hash-based CSP (`'sha256-...'` instead of `'nonce-...'` for `next-themes`' script). Verified via a real production build that this breaks hydration: Next also ships its own per-page, per-build inline RSC hydration payload (`self.__next_f.push(...)`) that can't be hand-hashed and has no nonce on a static page. Reverted. Don't remove a page's `await connection()` call to "make it static" without re-reading that ADR update first — it will silently break client-side interactivity, not fail the build.

**Not in scope here:** URL-based i18n (`hreflang`, per-language indexable URLs) and RTL. The app is client-side language-switched (see `LanguageContext.tsx`) with no URL segmentation, so a crawler only ever sees one language per URL — a real future initiative, not a config toggle.

**Supported languages:** `src/contexts/supportedLanguages.ts` is the single registry (`id`/`label`/`nativeLabel`/`isRTL`) both this app and `_template_better-auth-mobile` derive their `Language` union from — German, English, French, Spanish, Portuguese, Italian, Dutch, Polish, Russian, Japanese, and Chinese (Simplified), all LTR (`isRTL: false` for every entry; Arabic/RTL is a deliberately separate future scope, see the vault's `ADR-009`). `t()` falls back to the English value for any key missing in the active language instead of showing the raw key. `LegalTranslation.ts` stays German/English-only by design — `LegalDocument.tsx` shows a visible banner when it falls back to English there.

### Lighthouse CI

`.github/workflows/ci.yml`'s last step runs a Lighthouse audit (Performance/
Accessibility/Best Practices/SEO, 0–100 each) against a real production build
of `/`, `/contact`, and `/imprint`, using `lighthouserc.js`. It's report-only:

- `lighthouserc.js`'s `collect.startServerCommand` runs `npm run start` and
  waits for its `"Ready in"` log line itself — the workflow doesn't manage
  the server process across steps.
- `continue-on-error: true` on that step means a low score never fails the
  build or blocks a PR. There's no `ci.assert` block in `lighthouserc.js`
  either (that's what would turn a score into a hard gate).
- `uploadArtifacts: true` on the action uploads the reports as a plain,
  private GitHub Actions artifact — not `temporaryPublicStorage` (Google's
  public hosting), which stays off, consistent with the suite's
  no-external-services default. A separate manual `actions/upload-artifact`
  step doesn't work here: the action's own "Uploading" phase leaves nothing
  for a later step to find, even though it did write the reports.
- **To see a run's results:** GitHub → Actions tab → the workflow run →
  "Artifacts" → download `lighthouse-reports` → open one of the `.html`
  files in a browser.
- **To run it locally:** `npx @lhci/cli autorun --config=./lighthouserc.js`
  (builds nothing itself — run `npm run build` first).
- Add a new page's URL to `lighthouserc.js`'s `collect.url` array if it
  should be audited too; not auto-discovered from the filesystem, same as
  `sitemap.ts` above.

## Adding a new API request

Every request this template makes today goes through `authClient` (`src/lib/auth-client.ts`) directly against Better Auth's own routes — `Settings.tsx`'s `handleSaveProfile`/`handleChangePassword` (`authClient.updateUser`, `authClient.changePassword`) are the pattern. Calling one of your own backend routes (not `/api/auth/*`) follows the same loop, just split across the two execution contexts the App Router gives you.

**1. Confirm the backend route exists first.** Every path has to match a real route in `_template_better-auth-backend/src/routes/*.ts` — see that repo's README section "Adding a new API route" if it doesn't exist yet. A mismatched path fails at runtime, not at compile time.

**2. From a Client Component, call it through `authClient.$fetch`, always with an absolute URL.** It's the same cross-origin browser fetch as any `authClient` method — the session cookie rides along automatically, no manual `Authorization` header. Build the URL as `` `${backendUrl}${path}` `` (import `backendUrl` from `src/lib/auth-client.ts`), never a bare path: `authClient` is configured with `baseURL: backendUrl`, but better-auth's client resolves a relative path against `${backendUrl}/api/auth` (its own routes' base, see `withPath()` in better-auth's `client/utils/url.ts`), not `backendUrl` itself. A bare `/widgets` silently resolves to `/api/auth/widgets` — a path Better Auth's own handler doesn't recognize, so it 404s with an empty, non-JSON body instead of your actual route's response:

```ts
const { data, error } = await authClient.$fetch<{ data: Widget[] }>(`${backendUrl}/widgets`);
```

`$fetch` resolves to `{ data, error }` rather than throwing (better-fetch's convention, same as every other `authClient` call in `Settings.tsx`) — branch on `error`, don't wrap it in `try`/`catch`.

**3. From a Server Component, forward the incoming cookie by hand.** A server-side `authClient.$fetch` is a fresh outgoing request from the Next.js server, not the browser, so it does *not* automatically carry the browser's session cookie — `(protected)/layout.tsx` already does this for `authClient.getSession()`; copy its `fetchOptions.headers.cookie` pattern for any other route you call from a Server Component. Same absolute-URL rule as step 2 applies here too:

```ts
const incomingHeaders = await headers();
const { data } = await authClient.$fetch<{ data: Widget[] }>(`${backendUrl}/widgets`, {
  headers: { cookie: incomingHeaders.get('cookie') ?? '' },
});
```

**4. Put the call where the data is used.** For a one-off request local to a single page, colocate it in that page's `pageContent/*.tsx` component with a plain `useState` per request (`Settings.tsx`'s per-action `submitting`/`error` state pairs are the model) — there's no `src/hooks/` convention in this template yet. Once a second component needs the same request, that's the point to extract a `useXxx.ts` hook (the mobile template's `src/hooks/useWidgets`-style hooks, described in its own README, are the shape to copy) rather than duplicating the fetch in both places.

**5. Type the response, don't guess it.** `authClient.$fetch<{ data: T }>` should match the backend handler's `return c.json({ data: ... })` shape exactly. If the backend returns `void` (most `DELETE` routes), type it `authClient.$fetch<void>(...)`.

That's the whole loop — confirm the backend route → call it via `authClient.$fetch` (with cookie-forwarding if it's a Server Component) → colocate the call, or extract a hook once more than one component needs it → type the response. No new dependency; `authClient` already does everything `fetch` would, plus the cookie handling a separate-backend setup needs.

## Getting started

```
npm install
cp .env.example .env   # point NEXT_PUBLIC_BACKEND_URL at auth-backend-template, set ALLOWED_HOSTS
npm run dev
```

```
open http://localhost:3001
```

Requires `auth-backend-template` running (see its own README for the
Docker/local quickstart) -- this app has no auth logic of its own.

## Configuration

All variables live in `.env.example`. The ones worth calling out specifically:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | yes | Base URL of `_template_better-auth-backend`. Inlined into the JS bundle at build time — change it and restart `next dev`/rebuild, a running bundle won't pick it up live |
| `NEXT_PUBLIC_SITE_URL` | no | This site's own public origin, sent to the backend as the `callbackURL` for verification/reset e-mails so their link lands on `/verify-email`/`/reset-password` here instead of the bare backend origin. Also used as the logo link/Imprint link in the contact-form confirmation e-mail (`src/lib/contactEmailTemplate.ts`). Defaults to `http://localhost:3001` |
| `ALLOWED_HOSTS` | yes | Comma-separated allowlist of hosts this server may be reached as. Enforced in `src/proxy.ts` — unset rejects every request |
| `CONTACT_SMTP_HOST` / `CONTACT_SMTP_PORT` / `CONTACT_SMTP_SECURE` / `CONTACT_SMTP_USER` / `CONTACT_SMTP_PASSWORD` | no | SMTP config for `/contact`'s `POST /api/contact` route (`src/app/api/contact/route.ts`) — its own transport, independent of the backend's `email.ts`. Unset means the route responds 503, not a silent failure |
| `CONTACT_TO_EMAIL` | no (required for `/contact` to work) | Inbox the internal notification mail goes to |
| `CONTACT_FROM_EMAIL` | no | Defaults to `CONTACT_SMTP_USER` if unset |

`NEXT_PUBLIC_SITE_URL` (and mobile's `EXPO_PUBLIC_WEBSITE_URL`, same idea) has to be reachable from wherever the link actually gets clicked -- not just from your dev machine. `localhost` only works if you open the e-mail on the same machine the dev server runs on; clicking the link from a phone (mobile signup, or checking mail on a physical device) needs your machine's LAN IP instead, same as `NEXT_PUBLIC_BACKEND_URL` above.

### Rebranding this template for a new project

**Most of a rebrand is one file: `project.config.json` at the repo root.**

| Field | Drives |
|---|---|
| `appName` | Every `{{appName}}` occurrence app-wide (`LanguageContext.tsx`'s `t()` always fills it in, see [SEO](#seo)) — legal copy (`LegalTranslation.ts`), contact-form e-mails (`contactEmailTemplate.ts`/`contactAdminEmailTemplate.ts`), the contact form's `mailto:` fallback subject (`ContactForm.tsx`) |
| `title`, `description`, `url`, `author`, `authorUrl`, `keywords` | Page titles/SEO metadata — see [SEO](#seo) |
| `logoPath` | The generated OG/Twitter/favicon images (`opengraph-image.tsx`/`twitter-image.tsx`/`icon.tsx`/`apple-icon.tsx`) — swap the referenced SVG file, or point `logoPath` at a new one |
| `primaryColor` | The accent color in contact-form e-mails (`BRAND.primary`/`HEADER_BG`) — mail clients can't read CSS variables, so this can't just reference `globals.css` |
| `defaultLanguage` | Last-resort fallback in `layout.tsx`/`LanguageContext.tsx`: a saved cookie choice wins first, then the browser's `Accept-Language` header (`acceptLanguage.ts`), and only if neither matches a supported language does this value apply |

What's still separate, and why:

| What | Where | Why not in `project.config.json` |
|---|---|---|
| Default color palette (light + dark, every token) | `src/app/globals.css` | CSS custom properties can't be generated from a JSON import without a build step; `primaryColor` above only covers the one non-CSS consumer (e-mails). This is only the *default* palette now — see [Color palettes & theming](#color-palettes--theming) for the user-facing palette picker layered on top |
| Logo file itself | `public/lpj-its.png` (e-mail `cid:` attachment, `src/app/api/contact/route.ts`'s `LOGO_PATH`) / `public/lpj-its.svg` (referenced by `logoPath`) | Two files, two formats — PNG for mail-client compatibility, SVG for `next/og` generation. `logoPath` only points at the SVG one |
| Legal content itself | `src/contexts/LegalTranslation.ts` | Real starter copy, not Lorem Ipsum, but still generic; review against your actual data flows before shipping, per that file's own top-of-file comment. `{{appName}}` is filled in automatically, the surrounding legal text is not |
| Contact-form e-mail language | `contactEmailTemplate.ts`/`contactAdminEmailTemplate.ts` | Hardcoded German independent of `defaultLanguage` — there's no i18n system for e-mail content, edit those strings directly if you need a different language |

## Color palettes & theming

Users can switch between a few predefined color palettes, or build a custom
one, from **Settings → Appearance** (`src/components/PaletteSettings.tsx`).
This layers on top of light/dark mode (`next-themes`, unaffected by this) —
each palette defines its own light *and* dark token set.

| Piece | File | Role |
|---|---|---|
| Palette registry | `src/theme/palettes.ts` | `palettes` — a `Record<paletteId, { label, light, dark }>` of predefined palettes (`ink-navy`, `ocean`, `forest`, `sunset`). `ink-navy` is the default and must always match `globals.css`'s `:root`/`.dark` values exactly (see below) |
| Runtime application | `src/components/PaletteProvider.tsx` | Wraps the app (inside `ThemeProvider`, since it reads `next-themes`' `resolvedTheme` to know which mode's tokens to apply). On every palette/mode change, writes the active token set as inline CSS custom properties on `<html>` (`--background`, `--primary`, etc.), overriding `globals.css`'s defaults. Persists the chosen palette id and any custom colors to `localStorage` (`color-palette-id` / `color-palette-custom`) — exposes both via the `usePalette()` hook |
| Custom palette derivation | `src/theme/deriveTokens.ts` | Pure function: 3 anchor colors (background/foreground/primary, one set per mode) → a full token set, mixing card/muted/border from the anchors and picking black/white foreground text by contrast. No WCAG contrast enforcement — a user can pick a poorly-readable combination (deliberate, see the vault's `ADR-008`) |
| Custom palette UI | `src/components/PaletteSettings.tsx` | Predefined-palette swatches + (when "Custom" is selected) 6 native `<input type="color">` pickers, wired to `usePalette()` |

**Adding a new predefined palette:** add an entry to the `palettes` object in
`src/theme/palettes.ts` with a `label`, `light`, and `dark` token set — the
`TokenSet` type requires every key, so TypeScript catches a missing one. It
shows up in Settings automatically; no other file to touch.

**Changing the default palette's colors:** `ink-navy` is the *only* palette
that also needs updating in **two other places**, because it's what a first
paint renders before `PaletteProvider` has run client-side:

- `src/app/globals.css`'s `:root`/`.dark` blocks — the actual values a fresh
  page load uses before any JS executes.
- `src/theme/palettes.ts`'s `palettes['ink-navy']` entry — must mirror
  `globals.css` exactly, or switching away from a different palette back to
  the default (or a plain reload) shows a mismatched color for one frame.

(`src/app/manifest.ts`'s `theme_color`/`background_color` already carries
this same "keep in sync by hand" note, for the same reason — see [SEO](#seo).)

**Known limitation:** switching to a *non-default* palette flashes the
default (`ink-navy`) for one frame on a full page reload — there's no
pre-hydration blocking script for the palette, unlike `next-themes`' own
light/dark FOUC-prevention script. Acceptable for a template; fixing it
would mean adding a second nonce'd inline script mirroring that approach.

## Docker

Two-stage build, following the same pattern as `website-view-only`: a shared
base image, then the app image built on top of it.

```
docker build -f Dockerfile.base -t web-auth-base-image .
docker build -f Dockerfile.website -t web-auth-template .
docker run -p 3001:3001 --env-file .env web-auth-template
```

## Security notes

- `src/proxy.ts` sets a per-request nonce Content-Security-Policy plus
  `X-Frame-Options`/`X-Content-Type-Options`/`Referrer-Policy`; `next.config.ts`
  adds `Permissions-Policy` on top (not request-specific, so it lives there
  instead).
- Pages that need the CSP nonce applied but have no other dynamic data
  (`/`, `/login-signup`) force dynamic rendering via `connection()` --
  without it Next would statically prerender them and `strict-dynamic` would
  block their scripts in production.
- `callbackUrl` handling in `login-signup/LoginSignupForm.tsx` only accepts
  same-origin relative paths (rejects `//evil.com`-style protocol-relative
  URLs) to prevent open-redirect abuse.
- **Never "fix" a CSP violation in production by adding `'unsafe-inline'`/
  `'unsafe-eval'` to `script-src`/`style-src`.** `src/proxy.ts` already
  branches correctly (`isDev` gets the relaxed policy for local dev only,
  production gets `'nonce-${nonce}' 'strict-dynamic'`). If CSP errors show
  up in production, something isn't actually reading/applying that nonce
  (check the `x-nonce` request header this file sets, and that whatever's
  being blocked uses it) -- that's the bug to fix, not a reason to widen the
  policy for every environment, which removes the actual XSS protection the
  nonce exists for. `src/app/layout.tsx` reads the request's nonce
  (`headers().get('x-nonce')`) and passes it to `ThemeProvider` for exactly
  this reason -- `next-themes` injects a raw inline `<script>` (FOUC
  prevention) and, mid-session, an inline `<style>`
  (`disableTransitionOnChange`); without the `nonce` prop both get silently
  blocked on *every* page, invisible in dev since dev mode doesn't need a
  nonce at all.
- **In production, if the website/backend are deployed on different
  subdomains** (e.g. `app.example.com` / `api.example.com`) and login
  succeeds at the API but the website never sees a session, the backend's
  cookie needs `advanced.crossSubDomainCookies` enabled so it's not scoped
  to only its own subdomain. See `_template_better-auth-backend`'s README
  ("Operations" -- "Website/admin stuck in a login loop in production,
  across subdomains") for the fix and, more importantly, how to verify it
  actually deployed before assuming it's still broken. `authClient` here
  does not need `fetchOptions: { credentials: "include" }` -- better-auth's
  client already defaults to that whenever the `Request` API supports it.

---
## License

See [LICENSE](./LICENSE).

--- 

&copy; [lpj.app](https://github.com/lpj-app). Proprietary -- all rights reserved.