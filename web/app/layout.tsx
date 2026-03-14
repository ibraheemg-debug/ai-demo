/**
 * Minimal root layout required by Next.js.
 * The actual <html> and <body> elements are provided by the locale-specific
 * layout at app/[locale]/layout.tsx so that lang="" and dir="" can be set
 * correctly per locale (including RTL for Arabic).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (children) as any;
}
