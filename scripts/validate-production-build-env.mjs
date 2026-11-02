const REQUIRED_VARIABLES = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  "NEXT_DEPLOYMENT_ID",
];

const errors = [];
const values = new Map();

for (const name of REQUIRED_VARIABLES) {
  const value = process.env[name]?.trim();
  if (!value) {
    errors.push(`${name} is required.`);
  } else {
    values.set(name, value);
  }
}

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function validateOrigin(name, { allowLoopbackHttp = false } = {}) {
  const value = values.get(name);
  if (!value) return;

  let url;
  try {
    url = new URL(value);
  } catch {
    errors.push(`${name} must be an absolute HTTP or HTTPS origin.`);
    return;
  }

  const isHttpLoopback = url.protocol === "http:" && allowLoopbackHttp && isLoopbackHost(url.hostname);
  if (url.protocol !== "https:" && !isHttpLoopback) {
    errors.push(`${name} must use HTTPS (HTTP is allowed only for a loopback CI fixture).`);
  }

  if (
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    errors.push(`${name} must contain only an origin, without credentials, path, query, or fragment.`);
  }
}

validateOrigin("NEXT_PUBLIC_SITE_URL");
validateOrigin("NEXT_PUBLIC_ADMIN_URL");
validateOrigin("NEXT_PUBLIC_SUPABASE_URL", { allowLoopbackHttp: true });

const deploymentId = values.get("NEXT_DEPLOYMENT_ID");
if (deploymentId && /\s/.test(deploymentId)) {
  errors.push("NEXT_DEPLOYMENT_ID must not contain whitespace.");
}

const encryptionKey = values.get("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY");
if (encryptionKey) {
  const isBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encryptionKey);
  const decodedKey = isBase64 ? Buffer.from(encryptionKey, "base64") : null;
  const hasCanonicalEncoding = decodedKey?.toString("base64") === encryptionKey;

  if (!hasCanonicalEncoding || ![16, 24, 32].includes(decodedKey.length)) {
    errors.push("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be canonical Base64 encoding of a 16, 24, or 32 byte AES key.");
  }
}

if (errors.length > 0) {
  console.error("Production build environment validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Production build environment validation passed.");
}
