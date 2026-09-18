import { connection } from "next/server";
import { Suspense } from "react";

async function ConnectionBoundary() {
  await connection();
  return null;
}

/**
 * Signals that a route intentionally streams request-time metadata while its
 * interactive client island can still render inside the static shell.
 */
export function RuntimeMetadataMarker() {
  return (
    <Suspense fallback={null}>
      <ConnectionBoundary />
    </Suspense>
  );
}
