import "server-only";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { systemSettingsKeyValue } from "@/db/schema";
import { assertNoLegacyPublicErpSecrets } from "@/lib/serverEnv";
import { queueApiLog, serializeError } from "@/utils/logger";

export type ERPNextTransportMethod = "GET" | "POST" | "PUT";

export type ERPNextTransportCategory =
  | "CONFIGURATION"
  | "NETWORK"
  | "PROVIDER"
  | "CONFLICT"
  | "VALIDATION";

export type ERPNextTransportResponse = {
  status: number;
  data: unknown;
};

export type ERPNextTransportConfig = {
  baseUrl: string;
  authHeader: string;
};

export type ERPNextTransport = {
  request(
    method: ERPNextTransportMethod,
    endpoint: string,
    body?: unknown,
  ): Promise<ERPNextTransportResponse>;
  isConfigured(): Promise<boolean>;
};

export class ERPNextTransportError extends Error {
  readonly category: ERPNextTransportCategory;
  readonly providerStatus: number | null;

  constructor(
    category: ERPNextTransportCategory,
    message: string,
    providerStatus: number | null = null,
  ) {
    super(message);
    this.name = "ERPNextTransportError";
    this.category = category;
    this.providerStatus = providerStatus;
  }
}

type TransportOptions = {
  resolveConfig?: () => Promise<ERPNextTransportConfig>;
  fetchImpl?: typeof fetch;
};

const ERP_NEXT_SETTING_KEYS = [
  "erpnext_site_endpoint",
  "erpnext_api_key",
  "erpnext_api_secret",
  "erpnext_company_name",
  "erpnext_default_item_code",
] as const;

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_TEXT_CHARS = 12_000;
const MAX_PROVIDER_MESSAGE_CHARS = 1_000;

function queueSafeApiLog(input: Parameters<typeof queueApiLog>[0]) {
  try {
    queueApiLog(input);
  } catch {
    // Logging must never replace the provider result or error.
  }
}

async function readSettings(keys: readonly string[]) {
  if (keys.length === 0) return {} as Record<string, string>;

  try {
    const rows = await db.query.systemSettingsKeyValue.findMany({
      where: inArray(systemSettingsKeyValue.key, [...keys]),
      columns: { key: true, value: true },
    }) as Array<{ key: string; value: string }>;

    return Object.fromEntries(
      rows
        .map((row) => [row.key, row.value.trim()] as const)
        .filter(([, value]) => value.length > 0),
    );
  } catch {
    return {} as Record<string, string>;
  }
}

export async function getERPNextSetting(key: string) {
  const values = await readSettings([key]);
  return values[key] || null;
}

export async function resolveERPNextConfig(): Promise<ERPNextTransportConfig> {
  const settings = await readSettings(ERP_NEXT_SETTING_KEYS);
  const baseUrl = (
    settings.erpnext_site_endpoint
    || process.env.ERPNEXT_URL
    || process.env.ERPNEXT_BASE_URL
    || ""
  ).trim().replace(/\/$/, "");
  const apiKey = (settings.erpnext_api_key || process.env.ERPNEXT_API_KEY || "").trim();
  const apiSecret = (settings.erpnext_api_secret || process.env.ERPNEXT_API_SECRET || "").trim();

  if (!baseUrl || !apiKey || !apiSecret) {
    throw new ERPNextTransportError("CONFIGURATION", "ERPNext integration is not configured.");
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new ERPNextTransportError("CONFIGURATION", "ERPNext integration URL is invalid.");
  }

  return { baseUrl, authHeader: `token ${apiKey}:${apiSecret}` };
}

function parseResponseBody(text: string): unknown {
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function providerMessage(value: unknown, status: number) {
  const record = asRecord(value);
  const serverMessages = typeof record._server_messages === "string" ? record._server_messages : "";
  let nestedMessage = "";
  if (serverMessages) {
    try {
      const parsed = JSON.parse(serverMessages) as unknown;
      if (Array.isArray(parsed)) {
        nestedMessage = parsed
          .map((entry) => asRecord(entry).message)
          .find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
          ?.replace(/<[^>]*>/g, "") || "";
      }
    } catch {
      nestedMessage = "";
    }
  }
  const message = [record._error_message, nestedMessage, record.exception, record.message]
    .find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    ?.replace(/<[^>]*>/g, "")
    .trim();
  return (message || `ERPNext responded with status ${status}.`)
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/token\s+\S+/gi, "token [redacted]")
    .replace(/(api[_-]?key|secret)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, MAX_PROVIDER_MESSAGE_CHARS);
}

function providerCategory(status: number): ERPNextTransportCategory {
  if (status === 409) return "CONFLICT";
  if (status === 400 || status === 422) return "VALIDATION";
  return "PROVIDER";
}

export function createERPNextTransport(options: TransportOptions = {}): ERPNextTransport {
  const resolveConfig = options.resolveConfig || resolveERPNextConfig;
  const fetchImpl = options.fetchImpl || fetch;

  return {
    async isConfigured() {
      try {
        await resolveConfig();
        return true;
      } catch {
        return false;
      }
    },
    async request(method, endpoint, body) {
      assertNoLegacyPublicErpSecrets();
      if (!endpoint.startsWith("/api/")) {
        throw new ERPNextTransportError("VALIDATION", "ERPNext endpoint must be an internal Frappe API path.");
      }
      const config = await resolveConfig();
      const url = new URL(endpoint, `${config.baseUrl}/`).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let responseWasLogged = false;
      try {
        let response: Response;
        try {
          response = await fetchImpl(url, {
            method,
            headers: { "Content-Type": "application/json", Authorization: config.authHeader },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            cache: "no-store",
            signal: controller.signal,
          });
        } catch {
          throw new ERPNextTransportError("NETWORK", "ERPNext could not be reached.");
        }
        const responseText = (await response.text().catch(() => "")).slice(0, MAX_RESPONSE_TEXT_CHARS);
        const responseBody = parseResponseBody(responseText);
        const errorMessage = response.ok ? null : providerMessage(responseBody, response.status);
        queueSafeApiLog({
          direction: "OUTBOUND",
          sourceSystem: "ERPNEXT",
          endpoint,
          method,
          statusCode: response.status,
          requestHeaders: { "Content-Type": "application/json", Authorization: config.authHeader },
          requestBody: body ?? {},
          responseBody,
          errorMessage,
        });
        responseWasLogged = true;
        if (!response.ok) {
          throw new ERPNextTransportError(providerCategory(response.status), errorMessage || `ERPNext responded with status ${response.status}.`, response.status);
        }
        return { status: response.status, data: responseBody };
      } catch (error: unknown) {
        if (!responseWasLogged) {
          const serialized = serializeError(error);
          queueSafeApiLog({
            direction: "OUTBOUND",
            sourceSystem: "ERPNEXT",
            endpoint,
            method,
            statusCode: 500,
            requestHeaders: { Authorization: config.authHeader },
            requestBody: body ?? {},
            responseBody: {},
            errorMessage: serialized.message,
          });
        }
        if (error instanceof ERPNextTransportError) throw error;
        throw new ERPNextTransportError("NETWORK", "ERPNext request failed.");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const erpNextTransport = createERPNextTransport();
