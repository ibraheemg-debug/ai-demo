/**
 * Locale-aware navigation helpers built on top of next-intl's routing config.
 *
 * Usage (client components):
 *   import { useRouter, usePathname, Link } from '@/i18n/navigation';
 *
 * Usage (server components / route handlers):
 *   import { redirect } from '@/i18n/navigation';
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
