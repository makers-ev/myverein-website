import { createAuthClient } from "better-auth/react";
import { organizationClient, twoFactorClient } from "better-auth/client/plugins";

/**
 * This app is a client of the backend's Better Auth instance (see
 * auth-backend-template/src/auth/auth.ts) — it is NOT a second identity
 * provider. Every plugin listed here has a matching server-side plugin so
 * the inferred client API lines up with what the backend actually exposes:
 * organization() <-> organizationClient(), twoFactor() <-> twoFactorClient().
 * `admin`, `bearer`, and `openAPI` don't need client-side plugins — `admin`
 * only adds server routes/session fields, `bearer` is a server-only header
 * convenience, and `openAPI` just serves docs.
 */
export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

// This site's own origin, used as the verification email's callbackURL.
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: backendUrl,
  plugins: [organizationClient(), twoFactorClient()],
});

export type AuthClient = typeof authClient;
export type Session = typeof authClient.$Infer.Session;
