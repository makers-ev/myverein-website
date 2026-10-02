# Graph Report - myverein-website  (2026-09-24)

## Corpus Check
- 124 files · ~62,100 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 871 nodes · 1490 edges · 98 communities (63 shown, 35 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2017e8e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 72 edges
2. `T` - 68 edges
3. `compilerOptions` - 16 edges
4. `url` - 14 edges
5. `Language` - 14 edges
6. `apiFetch()` - 13 edges
7. `createSiteMetadata()` - 13 edges
8. `Website Template README` - 13 edges
9. `AuthClient` - 12 edges
10. `keywords` - 11 edges

## Surprising Connections (you probably didn't know these)
- `resolveCallbackUrl test suite` --references--> `CI GitHub Actions Workflow`  [INFERRED]
  src/lib/resolveCallbackUrl.test.ts → .github/workflows/ci.yml
- `login-signup page` --references--> `callbackUrl Open-Redirect Protection`  [EXTRACTED]
  src/app/login-signup/page.tsx → README.md
- `proxy() (CSP + host validation)` --references--> `NEW-ARCHITECTURE-README`  [EXTRACTED]
  src/proxy.ts → NEW-ARCHITECTURE-README.md
- `README Sync Requirement` --conceptually_related_to--> `Pages Table`  [INFERRED]
  CLAUDE.md → README.md
- `Protected-by-Default Routing` --semantically_similar_to--> `Adding a Protected Page (Guide)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md

## Hyperedges (group relationships)
- **Orchestration + Subagent Review Cycle** — claude_orchestration_workflow, web_dev_agent, web_reviewer_agent [INFERRED 0.80]
- **SEO Metadata Pipeline for Public Pages** — readme_seo_metadata_system, readme_json_ld, readme_og_image_gen, readme_sitemap [EXTRACTED 0.90]
- **Brand Logo Rebrand Asset Set** — myverein_logo_png, myverein_logo_svg, readme_project_config [INFERRED 0.80]

## Communities (98 total, 35 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (11): jsonLd, metadata, metadataValues, author, authorUrl, logoUrl, author, authorUrl (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (40): ADR-007: static prerender via CSP hash reverted, ADR-009 (i18n jsonb / DE-EN legal copy decision), {{appName}} interpolation mechanism, authClient, authClient.requestPasswordReset, AuthNav, cid: logo attachment mechanism for email, buildAdminNotificationEmail (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (37): CalendarFormModal(), CalendarManager(), CLUB_ROLE_TYPES, ModalState, VisibilityModal(), Calendar, CalendarEvent, CalendarVisibility (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (29): resolveAcceptLanguage, resolveAcceptLanguage test suite, ADR-008: Custom Palette Derivation, No WCAG Enforcement, ADR-009: Language Registry, LTR-only, Per-key EN Fallback, DE/EN-only Legal Copy, AuthTranslation Dictionary, ComponentTranslation Dictionary, deriveTokens(), HomeTranslation Dictionary (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (23): Better Auth client (auth-client.ts), AuthNav, CI GitHub Actions Workflow, ContactPage(), createSiteMetadata(), ErrorPage, JsonLd component, Lighthouse CI as report-only, not a merge gate (rationale) (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (21): DEFAULT_CUSTOM, PaletteContext, PaletteContextValue, PaletteProvider(), usePalette(), CustomEditor(), PaletteSettings(), SettingsPageContent() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (18): CATEGORIES, ContactForm(), mailtoFallback(), buildTransporter(), CATEGORIES, ContactCategory, ContactPayload, LOGO_PATH (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (16): AbteilungenTab(), BoardMember, CLUB_ROLE_TYPES, ClubInfo, ClubInfoPage, ClubMember, ClubMemberRole, Department (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (8): geistMono, geistSans, metadata, Footer(), ThemeProvider(), LanguageProvider(), defaultLanguage, defaultLanguage

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (10): Language, LanguageContext, enKeys, langKeys, nonLegalEnKeys, translations, LegalTranslation, Translation (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (8): APP_LINK_ICONS, AuthNav(), AuthNavAppLink, EmailVerificationPromptProps, NotificationBell(), AuthClient, Session, ResetPasswordPageInner()

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (18): NotFound(), useLanguage(), BugStatus, KNOWN_BUGS, KnownBug, ROADMAP_ITEMS, RoadmapItem, RoadmapStatus (+10 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (9): EmailVerificationPrompt(), ForgotPasswordPrompt(), ForgotPasswordPromptProps, TwoFactorPrompt(), TwoFactorPromptProps, resolveCallbackUrl(), LoginSignupForm(), LoginSignupFormInner() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (11): authClient, backendUrl, Protected-by-Default Routing Pattern, LanguageProvider Component, useLanguage() Hook, Navbar, Adding a New API Request Pattern, Pages & Route Access Pattern (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/js-cookie, @types/node, @types/nodemailer (+4 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/js-cookie, @types/node, @types/nodemailer (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (12): dependencies, better-auth, @heroicons/react, js-cookie, lucide-react, next, next-themes, @next/third-parties (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (11): dependencies, better-auth, @heroicons/react, js-cookie, lucide-react, next, next-themes, @next/third-parties (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (11): callbackUrl Open-Redirect Protection, advanced.crossSubDomainCookies, Per-Request CSP Nonce, Docker Two-Stage Build, .env.example Configuration, next.config.ts Permissions-Policy, Better Auth Website Template, Security Notes (+3 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (11): Adding a Protected Page (Guide), authClient.getSession(), Cross-Origin Cookie Forwarding (layout), /notifications, page.tsx / pageContent Split, Protected-by-Default Routing, Next.js Route Groups, Server Component Cookie Forwarding (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (10): AuthTranslation, Translation, HomeTranslation, Translation, KalenderTranslation, Translation, LanguageContextType, NotificationTranslation (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (9): /admin/notification-templates, <app-name> Placeholder, LanguageContext.tsx, LegalTranslation.ts, pageContent/Notifications.tsx, Rebranding This Template (Guide), t(key, params?), useNotificationText (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.36
Nodes (8): Orchestration Workflow, /graphify Skill, graphify . --update, README Sync Requirement, graphify query CLI, graphify-out/graph.json, web-dev Subagent, web-reviewer Subagent

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (6): name, private, version, name, private, version

### Community 25 - "Community 25"
Cohesion: 0.29
Nodes (6): Adding a New API Request (Guide), src/lib/auth-client.ts, authClient.$fetch, backendUrl, Settings.tsx, useXxx.ts Hook Convention

### Community 26 - "Community 26"
Cohesion: 0.43
Nodes (7): authClient.resetPassword, /error, / (Homepage), 404 / not-found.tsx, Pages Table, /reset-password, /verify-email

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (7): auth-backend-template, Better Auth, Protected-by-Default Routing, Adding a New API Request Pattern, AuthNav.tsx, _template_better-auth-backend, NotificationBell.tsx

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (6): /api/contact route (ContactCategory), Contact Email Templates, /contact, ContactForm component, handleSubmit(), LPJ IT-Solutions Generic Branding

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): RootLayout(), REGION_ALIASES, resolveAcceptLanguage(), isSupportedLanguage(), SupportedLanguage, supportedLanguageIds

### Community 30 - "Community 30"
Cohesion: 0.47
Nodes (5): AppleIcon(), Icon(), manifest(), OpengraphImage(), twitter-image route (re-export)

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test

### Community 33 - "Community 33"
Cohesion: 0.40
Nodes (4): HeaderProps, Navbar(), NavItem, ThemeToggle()

### Community 34 - "Community 34"
Cohesion: 0.24
Nodes (7): IntroModal(), STEPS, Modal(), ModalProps, CATEGORIES, EditableMember, MemberEditModal()

### Community 35 - "Community 35"
Cohesion: 0.40
Nodes (5): NotificationCard(), NotificationItem, NotificationsPageContent(), Tab, useNotificationText()

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (5): AuthTranslation, ComponentTranslation, HomeTranslation, translations (merged dictionary), PageLayoutTranslation

### Community 37 - "Community 37"
Cohesion: 0.50
Nodes (5): myverein Logo (PNG), myverein Logo (SVG), POST /api/contact route, OG/Twitter Image Generation, project.config.json

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (4): JSON-LD Structured Data, / (Homepage), /verein, SEO Metadata System

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (4): Graphify Codebase Graph, Orchestration Workflow, web-dev Subagent, web-reviewer Subagent

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (3): createJsonLd, createSiteMetadata, JsonLd

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (3): CookieConsent, Footer, Logo

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (3): Color Palette & Theming System, CSP Nonce Security Pattern, Dynamic Rendering Limitation (ADR-007)

### Community 50 - "Community 50"
Cohesion: 0.09
Nodes (29): ClubMember, conditionTone(), DAMAGE_STATUSES, DamageStatus, damageText, damageTone, formatEuros(), InventoryDamageReport (+21 more)

### Community 51 - "Community 51"
Cohesion: 0.12
Nodes (21): buildWifiQrPayload(), escapeWifiField(), DamageReportsSection(), ItemFormModal(), ClubMember, CopyButton(), KeyHoldersSection(), LinkFormModal() (+13 more)

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (11): metadata, metadata, metadata, metadata, description, keywords, url, metadata (+3 more)

### Community 53 - "Community 53"
Cohesion: 1.00
Nodes (3): Orchestration Workflow, web-dev Subagent, web-reviewer Subagent

### Community 57 - "Community 57"
Cohesion: 0.10
Nodes (19): Adding a new API request, Adding a protected page, Better Auth Website Template, code:ts (const { data, error } = await authClient.$fetch<{ data: Widg), code:ts (const incomingHeaders = await headers();), code:block3 (npm install), code:block4 (open http://localhost:3001), code:block5 (docker build -f Dockerfile.base -t web-auth-base-image .) (+11 more)

### Community 76 - "Community 76"
Cohesion: 0.15
Nodes (13): ApiError, apiFetch(), ApiFetchOptions, AvailabilityException, AvailabilitySlot, DEFAULT_ROW, MyClub, RowState (+5 more)

### Community 77 - "Community 77"
Cohesion: 0.17
Nodes (7): ICONS, LegalDocument(), metadata, metadata, metadata, description, title

### Community 78 - "Community 78"
Cohesion: 0.18
Nodes (7): metadata, title, createNoIndexMetadata(), NoIndexMetadataParams, metadata, metadata, metadata

### Community 79 - "Community 79"
Cohesion: 0.12
Nodes (13): ClubMember, Meeting, MEETING_STATUSES, MeetingDetail(), MeetingInvitee, MeetingList(), MeetingResolution, OverlapCandidate (+5 more)

### Community 80 - "Community 80"
Cohesion: 0.18
Nodes (7): size, size, alt, size, logoPath, primaryColor, logoPath

### Community 81 - "Community 81"
Cohesion: 0.18
Nodes (9): JsonLdProps, jsonLd, metadata, metadataValues, createJsonLd(), JsonLdParams, jsonLd, metadata (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.24
Nodes (8): localizeDeEn(), BUILT_FEATURE_AREAS, BuiltCapability, BuiltFeatureArea, BuiltPlatform, FeaturesPageContent(), PLATFORM_STYLES, PlatformBadge()

### Community 83 - "Community 83"
Cohesion: 0.32
Nodes (6): CHANGELOG_RELEASES, ChangelogChange, ChangelogChangeType, ChangelogRelease, ChangelogPageContent(), TYPE_STYLES

### Community 84 - "Community 84"
Cohesion: 0.40
Nodes (4): Available subagents in this repo, Graphify, Orchestration, Protected-by-default routing

### Community 85 - "Community 85"
Cohesion: 0.40
Nodes (4): HomepagePageContent(), NEXT_CARDS, OVERVIEW_CARDS, PERSONA_CARDS

### Community 86 - "Community 86"
Cohesion: 0.40
Nodes (4): MyClub, StandortePageContent(), Tab, Location

### Community 88 - "Community 88"
Cohesion: 0.50
Nodes (3): CookieCategory, CookieConsent(), DEFAULT_CATEGORIES

## Knowledge Gaps
- **339 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+334 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ContactPage()` connect `Community 5` to `Community 1`, `Community 52`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Why does `login-signup page` connect `Community 1` to `Community 26`, `Community 19`, `Community 5`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **Why does `useLanguage()` connect `Community 12` to `Community 2`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 33`, `Community 34`, `Community 35`, `Community 50`, `Community 51`, `Community 76`, `Community 77`, `Community 79`, `Community 82`, `Community 83`, `Community 85`, `Community 86`, `Community 87`, `Community 88`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 48 inferred relationships involving `T` (e.g. with `AboutPageContent()` and `NotFound()`) actually correct?**
  _`T` has 48 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _350 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07751937984496124 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._