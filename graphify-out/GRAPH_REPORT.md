# Graph Report - .  (2026-09-13)

## Corpus Check
- 22 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 512 nodes · 830 edges · 33 communities (19 shown, 14 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_SEO Metadata & Legal Pages|SEO Metadata & Legal Pages]]
- [[_COMMUNITY_App Layout & i18n Translation Modules|App Layout & i18n Translation Modules]]
- [[_COMMUNITY_Auth Flows, Modals & Protected Pages|Auth Flows, Modals & Protected Pages]]
- [[_COMMUNITY_Architecture & Orchestration Docs|Architecture & Orchestration Docs]]
- [[_COMMUNITY_ContactEmail, ADRs & Session Rationale|Contact/Email, ADRs & Session Rationale]]
- [[_COMMUNITY_Package Dependencies (runtime)|Package Dependencies (runtime)]]
- [[_COMMUNITY_Auth, CI & Security Docs (ADR005007)|Auth, CI & Security Docs (ADR005/007)]]
- [[_COMMUNITY_PaletteTheme UI & i18n Data|Palette/Theme UI & i18n Data]]
- [[_COMMUNITY_Palette Theming & Token Derivation|Palette Theming & Token Derivation]]
- [[_COMMUNITY_Contact Form & Email Templates|Contact Form & Email Templates]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Auth Client & Nav Bridge Docs|Auth Client & Nav Bridge Docs]]
- [[_COMMUNITY_Notifications & Rebranding Docs|Notifications & Rebranding Docs]]
- [[_COMMUNITY_App Icons & Manifest|App Icons & Manifest]]
- [[_COMMUNITY_Translation Module Bundle|Translation Module Bundle]]
- [[_COMMUNITY_Proxy Config|Proxy Config]]
- [[_COMMUNITY_JSON-LD  Site Metadata Helpers|JSON-LD / Site Metadata Helpers]]
- [[_COMMUNITY_Footer, Logo & Cookie Consent|Footer, Logo & Cookie Consent]]
- [[_COMMUNITY_Error Page|Error Page]]
- [[_COMMUNITY_Web-DevReviewer Subagent Docs|Web-Dev/Reviewer Subagent Docs]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
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

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 39 edges
2. `compilerOptions` - 17 edges
3. `Website Template README` - 14 edges
4. `AuthClient` - 11 edges
5. `proxy() (CSP + host validation)` - 11 edges
6. `Pages Table` - 11 edges
7. `login-signup page` - 11 edges
8. `Merged translations Object` - 11 edges
9. `RootLayout` - 10 edges
10. `url` - 10 edges

## Surprising Connections (you probably didn't know these)
- `login-signup page` --references--> `callbackUrl Open-Redirect Protection`  [EXTRACTED]
  src/app/login-signup/page.tsx → README.md
- `proxy() (CSP + host validation)` --references--> `NEW-ARCHITECTURE-README`  [EXTRACTED]
  src/proxy.ts → NEW-ARCHITECTURE-README.md
- `resolveCallbackUrl test suite` --references--> `CI workflow (ci.yml)`  [INFERRED]
  src/lib/resolveCallbackUrl.test.ts → .github/workflows/ci.yml
- `Protected-by-Default Routing` --semantically_similar_to--> `Adding a Protected Page (Guide)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `(protected)/layout.tsx` --conceptually_related_to--> `AuthNav`  [EXTRACTED]
  README.md → src/components/AuthNav.tsx

## Hyperedges (group relationships)
- **CSP nonce plumbing for inline scripts** — layout_rootlayout, seojsonld_component, proxy_ts [INFERRED 0.85]
- **Multi-layer language detection and fallback flow** — acceptlanguage_resolve_accept_language, layout_rootlayout, legaldocument_component [INFERRED 0.75]
- **i18n Translation Dictionary Merge Flow** — languagecontext_translations_merged, authtranslation_translations, componenttranslation_translations, hometranslation_translations, notificationtranslation_translations, pagelayouttranslation_translations [EXTRACTED 0.95]
- **Palette Derivation and Theming System** — palettes_registry, derivetokens_function, paletteprovider_component, palettesettings_component, adr008_rationale [INFERRED 0.85]
- **Language Selection and English-Fallback Flow** — supportedlanguages_array, languagecontext_languageprovider, supportedlanguages_issupportedlanguage, adr009_rationale [EXTRACTED 0.90]

## Communities (33 total, 14 thin omitted)

### Community 0 - "SEO Metadata & Legal Pages"
Cohesion: 0.06
Nodes (43): size, size, alt, size, jsonLd, metadata, metadataValues, ICONS (+35 more)

### Community 1 - "App Layout & i18n Translation Modules"
Cohesion: 0.06
Nodes (37): geistMono, geistSans, metadata, RootLayout(), Footer(), HeaderProps, Navbar(), NavItem (+29 more)

### Community 2 - "Auth Flows, Modals & Protected Pages"
Cohesion: 0.07
Nodes (31): NotFound(), AuthNav(), CookieCategory, CookieConsent(), DEFAULT_CATEGORIES, EmailVerificationPrompt(), EmailVerificationPromptProps, ForgotPasswordPrompt() (+23 more)

### Community 3 - "Architecture & Orchestration Docs"
Cohesion: 0.05
Nodes (49): Adding a New API Request (Guide), Adding a Protected Page (Guide), src/lib/auth-client.ts, authClient.$fetch, authClient.getSession(), authClient.resetPassword, backendUrl, callbackUrl Open-Redirect Protection (+41 more)

### Community 4 - "Contact/Email, ADRs & Session Rationale"
Cohesion: 0.08
Nodes (42): ADR-007: static prerender via CSP hash reverted, ADR-009 (i18n jsonb / DE-EN legal copy decision), {{appName}} interpolation mechanism, authClient, authClient.requestPasswordReset, AuthNav, admin-notification-templates.ts (backend), cid: logo attachment mechanism for email (+34 more)

### Community 5 - "Package Dependencies (runtime)"
Cohesion: 0.06
Nodes (32): dependencies, better-auth, @heroicons/react, js-cookie, lucide-react, next, next-themes, @next/third-parties (+24 more)

### Community 6 - "Auth, CI & Security Docs (ADR005/007)"
Cohesion: 0.07
Nodes (25): resolveAcceptLanguage, resolveAcceptLanguage test suite, Better Auth client (auth-client.ts), AuthNav, CI workflow (ci.yml), ContactPage(), createSiteMetadata(), ErrorPage (+17 more)

### Community 7 - "Palette/Theme UI & i18n Data"
Cohesion: 0.12
Nodes (27): ADR-008: Custom Palette Derivation, No WCAG Enforcement, ADR-009: Language Registry, LTR-only, Per-key EN Fallback, DE/EN-only Legal Copy, AuthTranslation Dictionary, twoFactor() plugin config (backend), ComponentTranslation Dictionary, deriveTokens(), HomeTranslation Dictionary, t() Translation Function (+19 more)

### Community 8 - "Palette Theming & Token Derivation"
Cohesion: 0.15
Nodes (20): DEFAULT_CUSTOM, PaletteContext, PaletteContextValue, PaletteProvider(), usePalette(), CustomEditor(), PaletteSettings(), deriveTokens() (+12 more)

### Community 9 - "Contact Form & Email Templates"
Cohesion: 0.14
Nodes (17): CATEGORIES, ContactForm(), mailtoFallback(), buildTransporter(), CATEGORIES, ContactCategory, ContactPayload, LOGO_PATH (+9 more)

### Community 10 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 11 - "Auth Client & Nav Bridge Docs"
Cohesion: 0.15
Nodes (12): authClient, backendUrl, Backend Better Auth Config (auth.ts), Protected-by-Default Routing Pattern, LanguageProvider Component, useLanguage() Hook, Navbar, Adding a New API Request Pattern (+4 more)

### Community 12 - "Notifications & Rebranding Docs"
Cohesion: 0.22
Nodes (9): /admin/notification-templates, <app-name> Placeholder, LanguageContext.tsx, LegalTranslation.ts, pageContent/Notifications.tsx, Rebranding This Template (Guide), t(key, params?), useNotificationText (+1 more)

### Community 13 - "App Icons & Manifest"
Cohesion: 0.47
Nodes (5): AppleIcon(), Icon(), manifest(), OpengraphImage(), twitter-image route (re-export)

### Community 14 - "Translation Module Bundle"
Cohesion: 0.40
Nodes (5): AuthTranslation, ComponentTranslation, HomeTranslation, translations (merged dictionary), PageLayoutTranslation

### Community 16 - "JSON-LD / Site Metadata Helpers"
Cohesion: 0.67
Nodes (3): createJsonLd, createSiteMetadata, JsonLd

### Community 17 - "Footer, Logo & Cookie Consent"
Cohesion: 0.67
Nodes (3): CookieConsent, Footer, Logo

### Community 19 - "Web-Dev/Reviewer Subagent Docs"
Cohesion: 1.00
Nodes (3): Orchestration Workflow, web-dev Subagent, web-reviewer Subagent

## Knowledge Gaps
- **170 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+165 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ContactPage()` connect `Auth, CI & Security Docs (ADR005/007)` to `SEO Metadata & Legal Pages`, `Contact/Email, ADRs & Session Rationale`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `login-signup page` connect `Contact/Email, ADRs & Session Rationale` to `Architecture & Orchestration Docs`, `Auth, CI & Security Docs (ADR005/007)`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `proxy() (CSP + host validation)` connect `Auth, CI & Security Docs (ADR005/007)` to `Contact/Email, ADRs & Session Rationale`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _178 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SEO Metadata & Legal Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.05809979494190021 - nodes in this community are weakly interconnected._
- **Should `App Layout & i18n Translation Modules` be split into smaller, more focused modules?**
  _Cohesion score 0.05889724310776942 - nodes in this community are weakly interconnected._
- **Should `Auth Flows, Modals & Protected Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.06918238993710692 - nodes in this community are weakly interconnected._