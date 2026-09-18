import CartClient from "./CartClient";
import { RuntimeMetadataMarker } from "@/components/layout/RuntimeMetadataMarker";

export const instant = false;

export default function CartPage() {
  return (
    <>
      <CartClient />
      <RuntimeMetadataMarker />
    </>
  );
}
