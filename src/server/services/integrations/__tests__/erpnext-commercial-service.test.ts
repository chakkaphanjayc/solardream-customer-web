import assert from "node:assert/strict";

import { ERPNextGateway, ERPNextGatewayError } from "../erpnext-gateway";
import { createERPNextTransport, ERPNextTransportError, type ERPNextTransport } from "../erpnext-transport";
import { ERPNextCommercialService } from "../erpnext-commercial-service";

type Call = { method: string; endpoint: string; body?: unknown };

function makeFakeTransport(calls: Call[]): ERPNextTransport {
  return {
    isConfigured: async () => true,
    request: async (method, endpoint, body) => {
      calls.push({ method, endpoint, body });
      if (method === "GET" && endpoint.startsWith("/api/resource/Lead?")) return { status: 200, data: { data: [] } };
      if (method === "GET" && endpoint.startsWith("/api/resource/Customer?")) return { status: 200, data: { data: [] } };
      if (method === "GET" && endpoint.startsWith("/api/resource/Sales%20Order?")) return { status: 200, data: { data: [] } };
      if (method === "GET" && endpoint === "/api/resource/Quotation/QTN-1") return { status: 200, data: { data: { name: "QTN-1", customer: "CUST-1", customer_name: "Ada", transaction_date: "2026-10-03", items: [{ item_code: "PANEL-1", qty: 2, rate: 100, amount: 200 }] } } };
      if (method === "GET" && endpoint.startsWith("/api/resource/Version?")) return { status: 200, data: { data: [{ name: "VERSION-1", docname: "QTN-1" }] } };
      if (method === "POST" && endpoint === "/api/resource/Lead") return { status: 201, data: { data: { name: "LEAD-1", status: "Lead" } } };
      if (method === "POST" && endpoint === "/api/resource/Customer") return { status: 201, data: { data: { name: "CUST-2", customer_name: "Ada" } } };
      if (method === "POST" && endpoint === "/api/resource/Quotation") return { status: 201, data: { data: { name: "QTN-2", status: "Open" } } };
      if (method === "PUT" && endpoint === "/api/resource/Quotation/QTN-2") return { status: 200, data: { data: { name: "QTN-2", status: "Approved" } } };
      if (method === "POST" && endpoint === "/api/resource/Sales%20Order") return { status: 201, data: { data: { name: "SO-1", docstatus: 0 } } };
      if (method === "POST" && endpoint === "/api/method/frappe.client.submit") return { status: 200, data: { message: { name: "SO-1", docstatus: 1 } } };
      throw new Error(`Unexpected fake ERPNext call: ${method} ${endpoint}`);
    },
  };
}

async function main() {
  const previousCompany = process.env.ERPNEXT_COMPANY_NAME;
  const previousTemplate = process.env.DEFAULT_SOLAR_PROJECT_TEMPLATE;
  process.env.ERPNEXT_COMPANY_NAME = "SolarDream Co.";
  process.env.DEFAULT_SOLAR_PROJECT_TEMPLATE = "Solar Template";
  try {
    const calls: Call[] = [];
    const service = new ERPNextCommercialService(new ERPNextGateway(makeFakeTransport(calls)));
    const lead = await service.createLeadIdempotently({ data: { first_name: "Ada", email_id: "ada@example.com" }, email: "ada@example.com" });
    assert.equal(lead.providerId, "LEAD-1"); assert.equal(lead.reused, false);
    const customer = await service.ensureCustomer({ name: "Ada", email: "ada@example.com" });
    assert.deepEqual({ customerId: customer.customerId, created: customer.created }, { customerId: "CUST-2", created: true });
    const quotation = await service.createQuotation({ title: "QT-1", customer: "CUST-2" });
    assert.equal(quotation.providerId, "QTN-2"); assert.equal(quotation.httpStatus, 201);
    assert.equal((await service.updateQuotation("QTN-2", { status: "Approved" })).providerId, "QTN-2");
    assert.equal((await service.getQuotationHistory("QTN-1"))[0]?.name, "VERSION-1");
    const salesOrder = await service.createSalesOrderFromQuotation("QTN-1");
    assert.equal(salesOrder.salesOrderName, "SO-1"); assert.equal(salesOrder.salesOrder.docstatus, 1);
    const salesOrderBody = calls.find((call) => call.endpoint === "/api/resource/Sales%20Order")?.body as { data?: { items?: Array<Record<string, unknown>> } };
    assert.equal(salesOrderBody.data?.items?.[0]?.prevdoc_doctype, "Quotation"); assert.equal(salesOrderBody.data?.items?.[0]?.prevdoc_docname, "QTN-1");
    assert.equal((salesOrderBody.data as Record<string, unknown> | undefined)?.custom_solardream_acceptance_key, "quotation:QTN-1:accepted");
    const missingGateway = new ERPNextGateway({ isConfigured: async () => true, request: async () => { throw new ERPNextTransportError("PROVIDER", "missing", 404); } });
    assert.equal(await missingGateway.getQuotation("QTN-MISSING"), null);
    const networkGateway = new ERPNextGateway({ isConfigured: async () => true, request: async () => { throw new ERPNextTransportError("NETWORK", "ERPNext could not be reached."); } });
    await assert.rejects(() => networkGateway.getQuotation("QTN-1"), (error: unknown) => error instanceof ERPNextGatewayError && error.category === "NETWORK");
    const safeTransport = createERPNextTransport({ resolveConfig: async () => ({ baseUrl: "https://erp.example", authHeader: "token top-secret" }), fetchImpl: async () => new Response(JSON.stringify({ message: "permission denied token top-secret" }), { status: 500 }) });
    await assert.rejects(() => safeTransport.request("GET", "/api/resource/Quotation/QTN-1"), (error: unknown) => error instanceof ERPNextTransportError && error.providerStatus === 500 && !error.message.includes("top-secret"));
    console.log("ERPNext commercial adapter: 13 focused assertions passed.");
  } finally {
    if (previousCompany === undefined) delete process.env.ERPNEXT_COMPANY_NAME; else process.env.ERPNEXT_COMPANY_NAME = previousCompany;
    if (previousTemplate === undefined) delete process.env.DEFAULT_SOLAR_PROJECT_TEMPLATE; else process.env.DEFAULT_SOLAR_PROJECT_TEMPLATE = previousTemplate;
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
