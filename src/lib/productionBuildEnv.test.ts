import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const validatorPath = resolve(process.cwd(), "scripts/validate-production-build-env.mjs");
const validBuildEnvironment = {
  NEXT_PUBLIC_SITE_URL: "https://solar-dream.org",
  NEXT_PUBLIC_ADMIN_URL: "https://admin.solar-dream.org",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "ci-placeholder-anon-key",
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  NEXT_DEPLOYMENT_ID: "test-deployment-2026-10-29",
};

function runValidator(overrides: Record<string, string> = {}) {
  return spawnSync(process.execPath, [validatorPath], {
    encoding: "utf8",
    env: { ...process.env, ...validBuildEnvironment, ...overrides },
  });
}

test("production build environment validator enforces deployment inputs", async (t) => {
  await t.test("accepts complete HTTPS origins and a valid AES key", () => {
    const result = runValidator();

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /validation passed/);
  });

  await t.test("accepts the loopback HTTP Supabase fixture used by CI", () => {
    const result = runValidator({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9" });

    assert.equal(result.status, 0, result.stderr);
  });

  await t.test("rejects missing deployment configuration by name", () => {
    const result = runValidator({ NEXT_DEPLOYMENT_ID: "  " });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /NEXT_DEPLOYMENT_ID is required/);
  });

  await t.test("rejects non-HTTPS public origins", () => {
    const result = runValidator({ NEXT_PUBLIC_SITE_URL: "http://solar-dream.org" });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /NEXT_PUBLIC_SITE_URL must use HTTPS/);
  });

  await t.test("rejects Supabase URLs with a path", () => {
    const result = runValidator({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co/rest/v1" });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /NEXT_PUBLIC_SUPABASE_URL must contain only an origin/);
  });

  await t.test("accepts all AES key lengths supported by Next.js", () => {
    for (const byteLength of [16, 24, 32]) {
      const result = runValidator({
        NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Buffer.alloc(byteLength, 11).toString("base64"),
      });

      assert.equal(result.status, 0, `AES key length ${byteLength}: ${result.stderr}`);
    }
  });

  await t.test("rejects malformed AES keys without echoing their value", () => {
    const invalidKey = "not-a-valid-secret-key";
    const result = runValidator({ NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: invalidKey });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be canonical Base64/);
    assert.equal(result.stderr.includes(invalidKey), false);
  });
});
