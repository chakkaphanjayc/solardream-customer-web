import type { ProposalRevisionStatus } from "@/types/proposal-revisions";

export function isProposalRevisionCurrentForAcceptance(input: {
  expectedRevisionId: string;
  latestRevision: {
    id: string;
    status: ProposalRevisionStatus;
    documentHash: string | null;
  } | null;
  sourceDocumentHash: string;
}): boolean {
  const latest = input.latestRevision;
  return Boolean(
    latest &&
      latest.id === input.expectedRevisionId &&
      (latest.status === "SENT" || latest.status === "VIEWED") &&
      latest.documentHash === input.sourceDocumentHash,
  );
}

export function canRequestProposalRevision(input: {
  latestRevisionStatus: ProposalRevisionStatus | null;
  hasRecordedAcceptance: boolean;
}): boolean {
  return !input.hasRecordedAcceptance && input.latestRevisionStatus !== "ACCEPTED";
}

export const proposalRevisionTransitions: Record<
  ProposalRevisionStatus,
  readonly ProposalRevisionStatus[]
> = {
  DRAFT: ["DRAFT", "SENT", "VOID"],
  SENT: ["SENT", "VIEWED", "ACCEPTED", "SUPERSEDED", "VOID"],
  VIEWED: ["VIEWED", "ACCEPTED", "SUPERSEDED", "VOID"],
  ACCEPTED: ["ACCEPTED"],
  SUPERSEDED: ["SUPERSEDED"],
  VOID: ["VOID"],
};

export class ProposalRevisionTransitionError extends Error {
  readonly code = "INVALID_PROPOSAL_REVISION_TRANSITION";

  constructor(from: ProposalRevisionStatus, to: ProposalRevisionStatus) {
    super(`Invalid proposal revision lifecycle transition: ${from} -> ${to}.`);
  }
}

export function canTransitionProposalRevision(
  from: ProposalRevisionStatus,
  to: ProposalRevisionStatus,
): boolean {
  return proposalRevisionTransitions[from].includes(to);
}

export function assertProposalRevisionTransition(
  from: ProposalRevisionStatus,
  to: ProposalRevisionStatus,
): void {
  if (!canTransitionProposalRevision(from, to)) {
    throw new ProposalRevisionTransitionError(from, to);
  }
}

export type LegacyProposalDispatchStatus =
  | "PENDING_DISPATCH"
  | "DISPATCHED"
  | "SIGNED"
  | "EXPIRED";

export type LegacyProposalProjection = {
  status: string;
  dispatchStatus: LegacyProposalDispatchStatus;
};

export function quotationRevisionLockKey(proposalId: string): string {
  return `proposal-revision:${proposalId}`;
}

/**
 * `proposals` remains a compatibility aggregate. Its lifecycle fields are a
 * projection of the latest canonical immutable revision, never a second
 * source of truth for commercial state.
 */
export function projectLegacyProposalFromRevision(
  status: ProposalRevisionStatus,
): LegacyProposalProjection {
  switch (status) {
    case "DRAFT":
      return { status: "DRAFT", dispatchStatus: "PENDING_DISPATCH" };
    case "SENT":
    case "VIEWED":
      return {
        status: "AWAITING_CLIENT_SIGNATURE",
        dispatchStatus: "DISPATCHED",
      };
    case "ACCEPTED":
      return { status: "CLIENT_SIGNED_PENDING_REVIEW", dispatchStatus: "SIGNED" };
    case "SUPERSEDED":
      return { status: "REVISION_REQUIRED", dispatchStatus: "PENDING_DISPATCH" };
    case "VOID":
      return { status: "CANCELLED", dispatchStatus: "EXPIRED" };
  }
}
