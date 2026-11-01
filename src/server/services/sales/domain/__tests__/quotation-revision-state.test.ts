import assert from "node:assert/strict";

import {
  canRequestProposalRevision,
  isProposalRevisionCurrentForAcceptance,
} from "../quotation-revision-state";

const documentHash = "a".repeat(64);
const sentRevision = { id: "revision-1", status: "SENT" as const, documentHash };

assert.equal(
  isProposalRevisionCurrentForAcceptance({
    expectedRevisionId: sentRevision.id,
    latestRevision: sentRevision,
    sourceDocumentHash: documentHash,
  }),
  true,
);
assert.equal(
  isProposalRevisionCurrentForAcceptance({
    expectedRevisionId: sentRevision.id,
    latestRevision: { ...sentRevision, id: "revision-2" },
    sourceDocumentHash: documentHash,
  }),
  false,
);
assert.equal(
  isProposalRevisionCurrentForAcceptance({
    expectedRevisionId: sentRevision.id,
    latestRevision: { ...sentRevision, status: "ACCEPTED" },
    sourceDocumentHash: documentHash,
  }),
  false,
);
assert.equal(
  isProposalRevisionCurrentForAcceptance({
    expectedRevisionId: sentRevision.id,
    latestRevision: sentRevision,
    sourceDocumentHash: "b".repeat(64),
  }),
  false,
);
assert.equal(
  canRequestProposalRevision({ latestRevisionStatus: "SENT", hasRecordedAcceptance: false }),
  true,
);
assert.equal(
  canRequestProposalRevision({ latestRevisionStatus: "ACCEPTED", hasRecordedAcceptance: false }),
  false,
);
assert.equal(
  canRequestProposalRevision({ latestRevisionStatus: "SENT", hasRecordedAcceptance: true }),
  false,
);

console.log("Quotation revision integrity assertions passed.");
