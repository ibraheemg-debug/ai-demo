import { redirect } from "next/navigation";

/**
 * Root locale page → always redirect to the dashboard.
 */
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard`);
}
