import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/tech/sync/route";

const originalFetch = globalThis.fetch;
const originalNodeEnv = process.env.NODE_ENV;
const originalEnabled = process.env.LEGACY_TECH_COMPAT_ENABLED;
const originalTarget = process.env.STAFF_SYNC_INTERNAL_URL;
const originalAdminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest("https://solar-dream.org/api/tech/sync", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function responseJson(response: Response) {
  return await response.json() as Record<string, unknown>;
}

async function main() {
  process.env.NODE_ENV = "test";
  process.env.NEXT_PUBLIC_ADMIN_URL = "http://127.0.0.1:3320";
  process.env.STAFF_SYNC_INTERNAL_URL = "http://127.0.0.1:3320/api/tech/sync";
  process.env.LEGACY_TECH_COMPAT_ENABLED = "false";

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response("unexpected", { status: 500 });
  };
  const disabled = await POST(makeRequest("{}"));
  assert.equal(disabled.status, 410);
  assert.equal((await responseJson(disabled)).success, false);
  assert.equal(disabled.headers.get("cache-control"), "no-store");
  assert.equal(fetchCalls, 0);

  process.env.LEGACY_TECH_COMPAT_ENABLED = "true";
  const target = process.env.STAFF_SYNC_INTERNAL_URL;
  const body = JSON.stringify({ operationId: "offline-command-123456" });
  globalThis.fetch = async (input, init) => {
    fetchCalls += 1;
    assert.equal(String(input), target);
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "manual");
    assert.equal((init?.headers as Headers).get("authorization"), "Bearer staff-session");
    assert.equal((init?.headers as Headers).get("idempotency-key"), "offline-command-123456");
    assert.equal(await new Response(init?.body).text(), body);
    return new Response(JSON.stringify({ success: true, ack: { state: "PENDING_ERP" } }), {
      status: 200,
      headers: { "content-type": "application/json", "x-tech-sync-protocol": "1" },
    });
  };
  const forwarded = await POST(makeRequest(body, {
    authorization: "Bearer staff-session",
    "idempotency-key": "offline-command-123456",
    "x-tech-sync-protocol": "1",
    "x-forwarded-host": "attacker.example",
  }));
  assert.equal(forwarded.status, 200);
  assert.equal((await responseJson(forwarded)).success, true);
  assert.equal(forwarded.headers.get("x-tech-sync-compatibility"), "legacy-customer-proxy");
  assert.equal(forwarded.headers.get("x-tech-sync-protocol"), "1");
  assert.equal(fetchCalls, 1);

  globalThis.fetch = async () => new Response("<html>zero trust</html>", { status: 200, headers: { "content-type": "text/html" } });
  const challenge = await POST(makeRequest("{}"));
  assert.equal(challenge.status, 502);
  assert.deepEqual(await responseJson(challenge), { success: false, error: "Staff sync returned a non-JSON response." });

  const oversized = await POST(makeRequest("{}", { "content-length": String(10 * 1024 * 1024 + 769 * 1024) }));
  assert.equal(oversized.status, 413);

  process.env.STAFF_SYNC_INTERNAL_URL = "http://127.0.0.1:3320/not-sync";
  const invalidTarget = await POST(makeRequest("{}"));
  assert.equal(invalidTarget.status, 503);

  process.env.NODE_ENV = "production";
  process.env.STAFF_SYNC_INTERNAL_URL = "http://127.0.0.1:3320/api/tech/sync";
  const insecureTarget = await POST(makeRequest("{}"));
  assert.equal(insecureTarget.status, 503);
  process.env.STAFF_SYNC_INTERNAL_URL = "https://evil.example/api/tech/sync";
  const wrongOrigin = await POST(makeRequest("{}"));
  assert.equal(wrongOrigin.status, 503);

  process.stdout.write("Legacy technician compatibility bridge fixtures passed.\n");
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Compatibility bridge fixture failure."}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalEnabled === undefined) delete process.env.LEGACY_TECH_COMPAT_ENABLED;
    else process.env.LEGACY_TECH_COMPAT_ENABLED = originalEnabled;
    if (originalTarget === undefined) delete process.env.STAFF_SYNC_INTERNAL_URL;
    else process.env.STAFF_SYNC_INTERNAL_URL = originalTarget;
    if (originalAdminUrl === undefined) delete process.env.NEXT_PUBLIC_ADMIN_URL;
    else process.env.NEXT_PUBLIC_ADMIN_URL = originalAdminUrl;
  });
