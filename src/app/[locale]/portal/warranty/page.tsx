import { Suspense } from "react";
import WarrantyCardClient from "./WarrantyCardClient";


export default function WarrantyCardPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" aria-hidden="true" />}>
      <WarrantyCardClient />
    </Suspense>
  );
}
