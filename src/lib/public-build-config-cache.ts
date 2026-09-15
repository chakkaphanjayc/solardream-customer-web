import "server-only";

import { unstable_cache } from "next/cache";

import { getPublicBuildConfig } from "@/lib/publicBuildConfig";
import type { Locale } from "@/i18n/locales";

export const BUILD_CONFIG_CACHE_TAG = "build-config";

/**
 * The configurator is public content, but its source is editable by staff.
 * Cache the normalized, locale-specific result and invalidate it from the
 * admin save action when the published configuration changes.
 */
export const getCachedPublicBuildConfig = unstable_cache(
  getPublicBuildConfig,
  ["public-build-config-v1"],
  { revalidate: 300, tags: [BUILD_CONFIG_CACHE_TAG] },
);
