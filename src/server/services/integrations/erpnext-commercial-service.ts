import "server-only";

import {
  erpNextGateway,
  ERPNextGatewayError,
  type ERPNextDocumentWriteResult,
  type ERPNextNormalizedDocument,
  type ERPNextGateway,
} from "@/server/services/integrations/erpnext-gateway";
import { getERPNextSetting } from "@/server/services/integrations/erpnext-transport";

type ERPNextDocument = Record<string, unknown>;

export type ERPNextCommercialResult = ERPNextDocumentWriteResult & { reused: boolean };
export type ERPNextCustomerMatch = { id: string; name: string; email: string; phone: string; raw: ERPNextDocument };
export type ERPNextQuotationSyncResult = { remoteName: string; result: { status: number; data: unknown }; readOnly: boolean };

function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : ""; }
function number(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function isUsableConfiguredName(value: string) { return value.length > 0 && !value.includes("\"") && !/^[^\p{L}\p{N}]+$/u.test(value); }
function isDuplicateError(error: unknown) { return error instanceof ERPNextGatewayError ? error.category === "CONFLICT" || error.providerStatus === 409 : /duplicate|must be unique|status 409/i.test(error instanceof Error ? error.message : ""); }
function documentResult(result: ERPNextDocumentWriteResult, reused: boolean): ERPNextCommercialResult { return { ...result, reused }; }
function normalizedDocument(value: ERPNextNormalizedDocument | null) { return value?.raw || null; }

export class ERPNextCommercialService {
  constructor(private readonly gateway: ERPNextGateway = erpNextGateway) {}
  async isConfigured() { return this.gateway.isConfiguredAsync(); }
  async findLeadByIdentity(input: { email?: string | null; phone?: string | null }) { return this.gateway.findLeadByIdentity(input); }
  async createLeadIdempotently(input: { data: ERPNextDocument; email?: string | null; phone?: string | null }): Promise<ERPNextCommercialResult> {
    const existing = await this.gateway.findLeadByIdentity({ email: input.email, phone: input.phone });
    const existingId = text(existing?.name);
    if (existingId) return { providerId: existingId, status: text(existing?.status) || null, raw: existing ?? {}, httpStatus: 200, reused: true };
    try { return documentResult(await this.gateway.createLead(input.data), false); }
    catch (error: unknown) {
      if (!isDuplicateError(error)) throw error;
      const raced = await this.gateway.findLeadByIdentity({ email: input.email, phone: input.phone });
      const racedId = text(raced?.name);
      if (!racedId) throw error;
      return { providerId: racedId, status: text(raced?.status) || null, raw: raced ?? {}, httpStatus: 200, reused: true };
    }
  }
  async getLead(providerId: string) { return normalizedDocument(await this.gateway.getLead(providerId)); }
  async updateLead(providerId: string, data: ERPNextDocument) { return this.gateway.updateLead(providerId, data); }
  async lookupCustomers(input: { email?: string | null; phone?: string | null; name?: string | null }): Promise<ERPNextCustomerMatch[]> {
    const identities = [
      { email: text(input.email).toLowerCase(), phone: "", name: "" },
      { email: "", phone: text(input.phone), name: "" },
      { email: "", phone: "", name: text(input.name) },
    ].filter((identity) => identity.email || identity.phone || identity.name);
    if (identities.length === 0) throw new ERPNextGatewayError("VALIDATION", "Customer email, phone, or name is required for ERPNext lookup.");
    const matches = new Map<string, ERPNextCustomerMatch>();
    for (const identity of identities) {
      const customer = await this.gateway.getCustomer(identity);
      const id = text(customer?.name);
      if (!id) continue;
      matches.set(id, { id, name: text(customer?.customer_name) || id, email: text(customer?.email_id).toLowerCase(), phone: text(customer?.mobile_no).replace(/\D/g, ""), raw: customer ?? {} });
    }
    return [...matches.values()];
  }
  async attachCustomerAddress(input: { customerId: string; customerName: string; address?: string | null; latitude?: number | null; longitude?: number | null; email?: string | null; phone?: string | null }) {
    const customerId = text(input.customerId); const customerName = text(input.customerName);
    if (!customerId || !customerName || (!text(input.address) && (input.latitude == null || input.longitude == null))) return { attempted: false, success: true };
    try {
      await this.gateway.createAddress({ address_title: `${customerName} Site Location`, address_type: "Installation", address_line1: text(input.address) || `GPS: ${input.latitude}, ${input.longitude}`, city: "Bangkok", country: "Thailand", email_id: text(input.email) || undefined, phone: text(input.phone) || undefined, latitude: input.latitude ?? undefined, longitude: input.longitude ?? undefined, links: [{ link_doctype: "Customer", link_name: customerId }] });
      return { attempted: true, success: true };
    } catch (error: unknown) { console.warn(`[ERPNext] Could not attach Address for customer ${customerId}:`, error); return { attempted: true, success: false }; }
  }
  async ensureCustomer(input: { name: string; email?: string | null; phone?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null; leadName?: string | null }) {
    const customerName = text(input.name); const email = text(input.email).toLowerCase(); const phone = text(input.phone).replace(/\D/g, "");
    if (!customerName && !email && !phone) throw new ERPNextGatewayError("VALIDATION", "Customer name, email, or phone is required for ERPNext creation.");
    const matches = await this.lookupCustomers({ email, phone });
    if (matches.length > 1) throw new ERPNextGatewayError("CONFLICT", "Multiple exact ERPNext customer matches require staff selection.");
    if (matches[0]) { await this.attachCustomerAddress({ ...input, customerId: matches[0].id, customerName: customerName || matches[0].name, email, phone }); return { customerId: matches[0].id, created: false, raw: matches[0].raw }; }
    const created = await this.gateway.createCustomer({ customer_name: customerName || email || phone, customer_type: "Individual", customer_group: "Commercial", territory: "All Territories", email_id: email || undefined, mobile_no: phone || undefined, primary_address: text(input.address) || undefined, lead_name: text(input.leadName) || undefined });
    await this.attachCustomerAddress({ ...input, customerId: created.providerId, customerName: customerName || created.providerId, email, phone });
    return { customerId: created.providerId, created: true, raw: created.raw };
  }
  async getQuotation(providerId: string) { return normalizedDocument(await this.gateway.getQuotation(providerId)); }
  async getQuotationHistory(providerId: string) { return this.gateway.getQuotationHistory(providerId); }
  async createQuotation(data: ERPNextDocument) { return this.gateway.createQuotation(data); }
  async updateQuotation(providerId: string, data: ERPNextDocument) { return this.gateway.updateQuotation(providerId, data); }
  async cancelQuotation(providerId: string) { return this.gateway.cancelQuotation(providerId); }
  async approveQuotation(providerId: string) { return this.gateway.approveQuotation(providerId); }
  async getSalesOrder(providerId: string) { return normalizedDocument(await this.gateway.getSalesOrder(providerId)); }
  async findSalesOrderByAcceptanceKey(acceptanceKey: string) { return this.gateway.findSalesOrderByAcceptanceKey(acceptanceKey); }
  async getPaymentTerms(providerId: string) { return normalizedDocument(await this.gateway.getPaymentTerms(providerId)); }
  async getCompanyName() {
    const configured = process.env.ERPNEXT_COMPANY_NAME?.trim() || (await getERPNextSetting("erpnext_company_name"))?.trim() || "";
    if (isUsableConfiguredName(configured)) return configured;
    const companyName = text((await this.gateway.findCompanies())[0]?.name);
    if (!companyName) throw new ERPNextGatewayError("VALIDATION", "ERPNext company name is missing or invalid.");
    return companyName;
  }
  async getDefaultQuotationItemCode() {
    const configured = process.env.ERPNEXT_DEFAULT_ITEM_CODE?.trim() || (await getERPNextSetting("erpnext_default_item_code"))?.trim() || "";
    if (configured) return configured;
    const itemCode = "SOLARDREAM-SOLAR-SYSTEM";
    const existing = await this.gateway.getItem(itemCode);
    const existingCode = text(existing?.item_code) || text(existing?.name);
    if (existingCode) return existingCode;
    const created = await this.gateway.createItem({ item_code: itemCode, item_name: "SolarDream Custom Solar System", item_group: process.env.ERPNEXT_DEFAULT_ITEM_GROUP?.trim() || "Products", stock_uom: process.env.ERPNEXT_DEFAULT_UOM?.trim() || "Nos", is_sales_item: 1, is_stock_item: 0, description: "Generic SolarDream quotation line for website lead configurations." });
    return text(created.raw.item_code) || created.providerId || itemCode;
  }
  async createSalesOrderFromQuotation(quotationName: string, acceptanceKey?: string): Promise<{ quotation: ERPNextDocument; salesOrder: ERPNextDocument; salesOrderName: string; reused: boolean }> {
    const normalizedName = text(quotationName);
    if (!normalizedName) throw new ERPNextGatewayError("VALIDATION", "ERPNext quotation name is required.");
    const quotation = await this.getQuotation(normalizedName);
    if (!quotation) throw new ERPNextGatewayError("CONFLICT", `ERPNext quotation ${normalizedName} was not found.`, 404);
    const normalizedAcceptanceKey = text(acceptanceKey) || `quotation:${normalizedName}:accepted`;
    const existing = await this.gateway.findSalesOrderByAcceptanceKey(normalizedAcceptanceKey);
    if (existing) {
      const existingName = text(existing.name);
      if (!existingName) throw new ERPNextGatewayError("PROVIDER", "ERPNext returned a Sales Order without an identifier.");
      let existingOrder = existing;
      if (number(existingOrder.docstatus) !== 1) {
        try { existingOrder = await this.gateway.submitDocument("Sales Order", existingName); }
        catch (error: unknown) {
          const refreshed = await this.getSalesOrder(existingName);
          if (!refreshed || number(refreshed.docstatus) !== 1) throw error;
          existingOrder = refreshed;
        }
      }
      if (number(existingOrder.docstatus) !== 1) {
        const refreshed = await this.getSalesOrder(existingName);
        if (!refreshed || number(refreshed.docstatus) !== 1) throw new ERPNextGatewayError("CONFLICT", `ERPNext Sales Order ${existingName} exists but is not submitted.`);
        existingOrder = refreshed;
      }
      return { quotation, salesOrder: existingOrder, salesOrderName: existingName, reused: true };
    }
    const customer = text(quotation.customer);
    if (!customer) throw new ERPNextGatewayError("VALIDATION", `ERPNext quotation ${normalizedName} is missing customer.`);
    const projectTemplate = process.env.DEFAULT_SOLAR_PROJECT_TEMPLATE?.trim() || process.env.ERPNEXT_DEFAULT_PROJECT_TEMPLATE?.trim() || (await getERPNextSetting("erpnext_default_project_template"))?.trim() || "";
    if (!projectTemplate) throw new ERPNextGatewayError("CONFIGURATION", "DEFAULT_SOLAR_PROJECT_TEMPLATE is not configured.");
    const rawItems = Array.isArray(quotation.items) ? quotation.items : [];
    if (rawItems.length === 0) throw new ERPNextGatewayError("VALIDATION", `ERPNext quotation ${normalizedName} has no items.`);
    const items = rawItems.map((value, index) => {
      const item = value && typeof value === "object" && !Array.isArray(value) ? value as ERPNextDocument : {};
      const itemCode = text(item.item_code) || text(item.itemCode);
      if (!itemCode) throw new ERPNextGatewayError("VALIDATION", `ERPNext quotation item ${index + 1} is missing item_code.`);
      const quantity = number(item.qty ?? item.quantity, 1); if (quantity <= 0) throw new ERPNextGatewayError("VALIDATION", `ERPNext quotation item ${index + 1} has an invalid quantity.`);
      const rate = number(item.rate ?? item.unit_price, 0);
      return { item_code: itemCode, item_name: text(item.item_name) || undefined, description: text(item.description) || undefined, qty: quantity, uom: text(item.uom) || undefined, stock_uom: text(item.stock_uom) || undefined, conversion_factor: number(item.conversion_factor, 1), rate, amount: number(item.amount, rate * quantity), warehouse: text(item.warehouse) || undefined, reference_doctype: "Quotation", reference_name: normalizedName, prevdoc_doctype: "Quotation", prevdoc_docname: normalizedName };
    });
    const created = await this.gateway.createSalesOrder({ customer, customer_name: text(quotation.customer_name) || undefined, transaction_date: text(quotation.transaction_date) || new Date().toISOString().slice(0, 10), company: await this.getCompanyName(), project_template: projectTemplate, custom_solardream_acceptance_key: normalizedAcceptanceKey, custom_solardream_proposal_id: text(quotation.custom_solardream_proposal_id ?? quotation.reference_proposal_id) || undefined, custom_solardream_quotation_id: normalizedName, items, docstatus: 1 });
    let salesOrder = created.raw; const salesOrderName = text(salesOrder.name) || created.providerId;
    if (!salesOrderName) throw new ERPNextGatewayError("PROVIDER", "ERPNext did not return a Sales Order ID.");
    if (number(salesOrder.docstatus) !== 1) {
      try { salesOrder = await this.gateway.submitDocument("Sales Order", salesOrderName); }
      catch (error: unknown) { const refreshed = await this.getSalesOrder(salesOrderName); if (!refreshed || number(refreshed.docstatus) !== 1) throw error; salesOrder = refreshed; }
    }
    if (number(salesOrder.docstatus) !== 1) { const refreshed = await this.getSalesOrder(salesOrderName); if (!refreshed || number(refreshed.docstatus) !== 1) throw new ERPNextGatewayError("CONFLICT", `ERPNext Sales Order ${salesOrderName} was created but not submitted.`); salesOrder = refreshed; }
    return { quotation, salesOrder, salesOrderName, reused: false };
  }
  async syncQuotation(input: { providerId?: string | null; data: ERPNextDocument }): Promise<ERPNextQuotationSyncResult> {
    const providerId = text(input.providerId);
    if (providerId) { const current = await this.getQuotation(providerId); if (current && number(current.docstatus) === 1) return { remoteName: providerId, result: { status: 200, data: { data: current } }, readOnly: true }; }
    const written = providerId ? await this.updateQuotation(providerId, input.data) : await this.createQuotation(input.data);
    return { remoteName: written.providerId, result: { status: written.httpStatus, data: { data: written.raw } }, readOnly: false };
  }
}

export const erpNextCommercialService = new ERPNextCommercialService();
