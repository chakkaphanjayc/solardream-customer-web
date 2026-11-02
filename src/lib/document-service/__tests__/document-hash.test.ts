import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { verifiedPdfSha256 } from "../document-hash";

const pdfBytes = Buffer.from("SolarDream signed quotation");
const expectedHash = createHash("sha256").update(pdfBytes).digest("hex");

assert.equal(verifiedPdfSha256(pdfBytes), expectedHash);
assert.equal(verifiedPdfSha256(pdfBytes, expectedHash.toUpperCase()), expectedHash);
assert.throws(() => verifiedPdfSha256(pdfBytes, "0".repeat(64)), /does not match/);
assert.throws(() => verifiedPdfSha256(pdfBytes, "not-a-sha256"), /does not match/);

console.log("Document SHA-256 verification assertions passed.");
