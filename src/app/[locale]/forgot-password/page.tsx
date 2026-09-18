import ForgotPasswordClient from "./ForgotPasswordClient";
import { RuntimeMetadataMarker } from "@/components/layout/RuntimeMetadataMarker";

export const instant = false;

export default function ForgotPasswordPage() {
  return (
    <>
      <ForgotPasswordClient />
      <RuntimeMetadataMarker />
    </>
  );
}
