import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";

import { proxy } from "@/proxy";
import sitemap from "@/app/sitemap";
import { getCookieDomain, getRequestOrigin } from "@/lib/siteUrl";

process.env.NEXT_PUBLIC_SITE_URL = "https://solar-dream.org";
process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.solar-dream.org";
process.env.SOLARDREAM_RUNTIME_ROLE = "all";
delete process.env.AUTH_COOKIE_DOMAIN;

function request(
  url: string,
  cookies?: Record<string, string>,
  extraHeaders?: Record<string, string>,
) {
  const headers = new Headers(extraHeaders);
  if (cookies) {
    headers.set(
      "cookie",
      Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
    );
  }

  return new NextRequest(url, {
    headers,
  });
}

async function locationFor(response: NextResponse) {
  assert.equal(response.status, 308);
  return response.headers.get("location");
}

async function main() {
  const legacyDiscourseConnectRedirect = await proxy(
    request("https://solar-dream.org/?sso=signed-request&sig=signed-request"),
  );
  assert.equal(legacyDiscourseConnectRedirect.status, 307);
  assert.equal(
    legacyDiscourseConnectRedirect.headers.get("location"),
    "https://solar-dream.org/api/auth/discourse-sso?sso=signed-request&sig=signed-request",
  );
  assert.equal(
    legacyDiscourseConnectRedirect.headers.get("cache-control"),
    "no-store",
  );

  const legacyTechPortalRedirect = await proxy(request("https://solar-dream.org/tech-portal?from=legacy"));
  assert.equal(
    legacyTechPortalRedirect.status,
    307,
  );
  assert.equal(
    legacyTechPortalRedirect.headers.get("location"),
    "https://admin.solar-dream.org/th/tech-portal?from=legacy",
  );

  const staffHostRejection = await proxy(
    request("https://admin.solar-dream.org/en/admin/crm"),
  );
  assert.equal(staffHostRejection.status, 421);

  const directPublicHostWins = await proxy(
    request("https://solar-dream.org/en", undefined, {
      host: "solar-dream.org",
      "x-forwarded-host": "admin.solar-dream.org",
    }),
  );
  assert.equal(
    directPublicHostWins.status,
    200,
    "the direct Host header must win over an untrusted forwarded host",
  );

  assert.equal(
    getRequestOrigin(
      "http://127.0.0.1:3639/en/auth/callback",
      new Headers({
        host: "admin.solar-dream.org",
        "x-forwarded-host": "solar-dream.org",
      }),
    ),
    "https://admin.solar-dream.org",
  );

  assert.equal((await proxy(request("https://solar-dream.org/robots.txt"))).status, 200);
  assert.equal((await proxy(request("https://solar-dream.org/sitemap.xml"))).status, 200);

  const publicSitemap = sitemap();
  assert.ok(publicSitemap.length > 0);
  assert.ok(publicSitemap.every(({ url }) => url.startsWith("https://solar-dream.org/")));
  assert.ok(publicSitemap.every(({ url }) => !url.includes("/admin")));

  assert.equal(getCookieDomain("solar-dream.org"), ".solar-dream.org");
  assert.equal(getCookieDomain("admin.solar-dream.org"), ".solar-dream.org");
  assert.equal(getCookieDomain("untrusted.solar-dream.org"), undefined);
  assert.equal(getCookieDomain("localhost:3000"), undefined);

  process.env.AUTH_COOKIE_DOMAIN = ".solar-dream.org";
  assert.equal(getCookieDomain("solar-dream.org"), ".solar-dream.org");
  assert.equal(getCookieDomain("admin.solar-dream.org"), ".solar-dream.org");
  assert.equal(
    getCookieDomain("localhost:3000"),
    undefined,
    "production cookie domains must not be emitted for localhost",
  );
  assert.equal(getCookieDomain("untrusted.example.com"), undefined);
  delete process.env.AUTH_COOKIE_DOMAIN;

  console.log("Domain routing and cookie-scope checks passed.");
}

void main();
