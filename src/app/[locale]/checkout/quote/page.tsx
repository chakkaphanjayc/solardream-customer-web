import QuoteCheckoutClient from "./QuoteCheckoutClient";
import { RuntimeMetadataMarker } from "@/components/layout/RuntimeMetadataMarker";

export const instant = false;

export default function QuoteCheckoutPage() {
  return (
    <>
      <QuoteCheckoutClient />
      <RuntimeMetadataMarker />
    </>
  );
}
