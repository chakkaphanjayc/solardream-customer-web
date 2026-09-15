import { NextRequest, NextResponse } from "next/server";

import { getConfiguredAdminSiteUrl, getHostname } from "@/lib/siteUrl";

const MAX_SYNC_BYTES = 10 * 1024 * 1024 + 768 * 1024;
const FORWARDED_HEADERS = [
  "accept",
  "authorization",
  "content-type",
  "cookie",
  "idempotency-key",
  "x-tech-sync-protocol",
] as const;

function compatibilityEnabled() {
  return process.env.LEGACY_TECH_COMPAT_ENABLED?.trim().toLowerCase() === "true";
}

function getStaffSyncTarget() {
  const configured = process.env.STAFF_SYNC_INTERNAL_URL?.trim();
  const target = new URL(configured || `${getConfiguredAdminSiteUrl()}/api/tech/sync`);
  if (target.pathname !== "/api/tech/sync") {
    throw new Error("STAFF_SYNC_INTERNAL_URL must point to /api/tech/sync.");
  }
  if (process.env.NODE_ENV === "production") {
    if (target.protocol !== "https:") throw new Error("The Staff sync compatibility target must use HTTPS.");
    if (getHostname(target.origin) !== getHostname(getConfiguredAdminSiteUrl())) {
      throw new Error("The Staff sync compatibility target must use the configured Staff origin.");
    }
  }
  return target;
}

function compatibilityResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Tech-Sync-Compatibility": "legacy-customer-proxy",
    },
  });
}

export const maxDuration = 30;

/**
 * Temporary same-origin bridge for a PWA that was installed from the public
 * origin before the split. It forwards the authenticated request to Staff
 * without importing any Staff route or server-only module into Customer.
 */
export async function POST(request: NextRequest) {
  if (!compatibilityEnabled()) {
    return compatibilityResponse({ success: false, error: "Legacy Technician PWA compatibility is disabled." }, 410);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_SYNC_BYTES) {
    return compatibilityResponse({ success: false, error: "The offline sync request is too large." }, 413);
  }

  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_SYNC_BYTES) {
      return compatibilityResponse({ success: false, error: "The offline sync request is too large." }, 413);
    }

    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch(getStaffSyncTarget(), {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (!contentType.includes("application/json")) {
      return compatibilityResponse(
        { success: false, error: response.status === 401 || response.status === 403 ? "Staff authentication is required." : "Staff sync returned a non-JSON response." },
        response.status === 401 || response.status === 403 ? response.status : 502,
      );
    }

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Tech-Sync-Compatibility": "legacy-customer-proxy",
        ...(response.headers.get("x-tech-sync-protocol")
          ? { "X-Tech-Sync-Protocol": response.headers.get("x-tech-sync-protocol") as string }
          : {}),
      },
    });
  } catch (error: unknown) {
    console.error("[Legacy Technician PWA Proxy] Staff sync request failed.", error);
    return compatibilityResponse({ success: false, error: "Staff sync is temporarily unavailable." }, 503);
  }
}
