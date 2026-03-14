import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /**
   * output: 'standalone' bundles only what is needed for production,
   * which is required for the multi-stage Docker build.
   */
  output: "standalone",
};

export default withNextIntl(nextConfig);
