import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { COOKIE_NAME as LANG_COOKIE_NAME } from "@/contexts/languageCookie";
import { supportedLanguageIds, isSupportedLanguage } from "@/contexts/supportedLanguages";
import { resolveAcceptLanguage } from "@/contexts/acceptLanguage";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PaletteProvider } from "@/components/PaletteProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import { AuthNav } from "@/components/AuthNav";
import Logo from "@/components/Logo";
import { url, defaultLanguage } from "../../project.config.json";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// `url` in project.config.json ships as the unfilled "https://<url>.com" placeholder
// -- `<`/`>` make that an invalid URL, so `new URL()` throws and would crash
// the build before a project ever replaces it. Fall back to a harmless
// default rather than failing the out-of-the-box build.
function safeMetadataBase(candidate: string): URL {
  try {
    return new URL(candidate);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  // Lets every page's relative OG/icon paths (e.g. opengraph-image.tsx's
  // generated route) resolve to an absolute URL without each one repeating it.
  metadataBase: safeMetadataBase(url),
  title: "Auth Template",
  description: "Secure, scalable, and elegant authentication solutions for your next big project",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mainLinks = [
    { name: "nav.verein", href: "/verein" },
    { name: "nav.kalender", href: "/kalender" },
    { name: "nav.verfuegbarkeit", href: "/verfuegbarkeit" },
    { name: "nav.notifications", href: "/notifications" },
    { name: "nav.settings", href: "/settings" },
  ];

  // next-themes injects a raw inline <script> (FOUC prevention) and,
  // mid-session, an inline <style> (disableTransitionOnChange) -- both need
  // this request's CSP nonce explicitly passed through, or this app's
  // nonce-based CSP (proxy.ts) silently blocks both on every single page.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Same cookie LanguageContext.tsx reads client-side (see languageCookie.ts)
  // -- read here too so the server-rendered `<html lang>` matches the user's
  // actual choice from the first paint, instead of a hardcoded default that
  // doesn't match ~half of visitors. This layout already reads `headers()`
  // above (dynamic rendering either way), so reading `cookies()` too costs
  // nothing extra.
  const cookieLang = (await cookies()).get(LANG_COOKIE_NAME)?.value;
  // Priority: explicit cookie choice → browser's Accept-Language → config
  // default. `headers()` is already read above for the CSP nonce, so this
  // costs no extra request and needs no client-side re-render to correct
  // a wrong initial guess.
  const acceptLanguageHeader = (await headers()).get("accept-language");
  const initialLanguage = isSupportedLanguage(cookieLang)
    ? cookieLang
    : (resolveAcceptLanguage(acceptLanguageHeader, supportedLanguageIds) ??
      (defaultLanguage as (typeof supportedLanguageIds)[number]));

  return (
    <html
      lang={initialLanguage}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning is required here by next-themes: it sets the
          `dark` class on <html> via a pre-hydration inline script, which
          intentionally differs from the server-rendered class list. Scoped to
          this one element only -- it does not silence hydration warnings
          anywhere else in the tree. */}
      <body className="min-h-full flex flex-col">
        <ThemeProvider nonce={nonce}>
          <PaletteProvider>
            <LanguageProvider initialLanguage={initialLanguage}>
              <Navbar
                mainLinks={mainLinks}
                logo={<Logo />}
                guestNav={<AuthNav />}
                mobileGuestNav={<AuthNav />}
              />
              <main className="flex-1">{children}</main>
              <Footer />
              <CookieConsent />
            </LanguageProvider>
          </PaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
