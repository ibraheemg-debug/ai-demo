import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  /** All supported locales */
  locales: ['en', 'ar', 'fr'] as const,

  /** Default locale used when no locale prefix is present */
  defaultLocale: 'en' as const,

  /** Always include the locale prefix in the URL */
  localePrefix: 'always',

  /** Persist the selected locale in a cookie so it survives refreshes */
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});

export type Locale = (typeof routing.locales)[number];
