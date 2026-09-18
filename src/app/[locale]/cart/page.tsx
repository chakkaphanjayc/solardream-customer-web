import CartClient from "./CartClient";
import { RuntimeMetadataMarker } from "@/components/layout/RuntimeMetadataMarker";


export default function CartPage() {
  return (
    <>
      <CartClient />
      <RuntimeMetadataMarker />
    </>
  );
}
