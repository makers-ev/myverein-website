// Plain constant, no "use client" -- both LanguageContext.tsx (client) and
// layout.tsx (server, for the pre-hydration lang script) need this same
// name. A named export can't be imported from a "use client" module into a
// Server Component (RSC wraps every export of such a module as a client
// reference, even a plain string, which throws when read on the server) --
// so this lives in its own client-free file instead.
export const COOKIE_NAME = 'app_lang';
