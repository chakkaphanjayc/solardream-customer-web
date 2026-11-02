import { createHash } from "node:crypto";

export function verifiedPdfSha256(
  pdfBytes: Uint8Array,
  declaredHash?: string | null,
): string {
  const computedHash = createHash("sha256").update(pdfBytes).digest("hex");
  if (declaredHash !== undefined && declaredHash !== null) {
    if (!/^[0-9a-f]{64}$/i.test(declaredHash) || declaredHash.toLowerCase() !== computedHash) {
      throw new Error("The downloaded PDF does not match its declared SHA-256 hash.");
    }
  }
  return computedHash;
}
