import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  paymentRequests,
  quotationDeliveryDocuments,
  quotationDocumentRequests,
} from "@/db/schema";
import type { PortalAccess } from "@/lib/portalAccess";
import { loadInstallationSnapshot } from "@/lib/installationWorkflow";
import { getCustomerQuotationReadModel } from "@/server/services/sales/quotation-read-model-service";
import { listCustomerQuotationNegotiationEvents } from "@/server/services/sales/quotation-negotiation-service";
import { getQuotationAcceptanceSummary } from "@/server/services/sales/quotation-acceptance-read-service";
import {
  hasPublishedCustomerQuotation,
  redactUnpublishedCustomerProposal,
} from "@/lib/proposalPortalExposure";

export async function loadPortalSnapshot(access: PortalAccess) {
  const [documentRequests, deliveryDocuments, billingRequests, installation, quotationReadModel, negotiationEvents, acceptance] = await Promise.all([
    db.query.quotationDocumentRequests.findMany({
      where: eq(quotationDocumentRequests.quotationId, access.proposal.id),
      orderBy: [asc(quotationDocumentRequests.createdAt)],
      with: {
        attachments: {
          orderBy: (attachments, { asc: orderAscending }) => [orderAscending(attachments.createdAt)],
        },
      },
    }),
    db.query.quotationDeliveryDocuments.findMany({
      where: and(
        eq(quotationDeliveryDocuments.quotationId, access.proposal.id),
        ne(quotationDeliveryDocuments.status, "ARCHIVED"),
      ),
      orderBy: [asc(quotationDeliveryDocuments.createdAt)],
      with: {
        attachments: {
          orderBy: (attachments, { asc: orderAscending }) => [orderAscending(attachments.createdAt)],
        },
      },
    }),
    db.query.paymentRequests.findMany({
      where: eq(paymentRequests.proposalId, access.proposal.id),
    }),
    loadInstallationSnapshot(access.proposal.id, {
      userId: access.actorUserId,
      mode: access.mode === "guest" ? "GUEST" : "MEMBER",
      role: "CUSTOMER",
    }),
    getCustomerQuotationReadModel(access.proposal.id, access.proposal.revisionNumber),
    listCustomerQuotationNegotiationEvents(access.proposal.id),
    getQuotationAcceptanceSummary(access.proposal.id),
  ]);
  const isQuotationPublished = hasPublishedCustomerQuotation({
    status: access.proposal.status,
    dispatchStatus: access.proposal.dispatchStatus,
    hasPublishedReadModel: Boolean(quotationReadModel),
    hasAcceptance: Boolean(acceptance),
  });
  const proposal = isQuotationPublished
    ? access.proposal
    : redactUnpublishedCustomerProposal(access.proposal);
  const customerQuotationReadModel = isQuotationPublished ? quotationReadModel : null;
  const customerDeliveryDocuments = isQuotationPublished
    ? deliveryDocuments
    : deliveryDocuments.filter((document) => document.deliveryType !== "FINAL_QUOTATION");

  return {
    proposal,
    acceptance,
    quotationReadModel: customerQuotationReadModel,
    negotiationEvents,
    documentRequests,
    deliveryDocuments: customerDeliveryDocuments,
    paymentRequests: billingRequests,
    installation,
    accessMode: access.mode,
  };
}
