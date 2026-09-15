import { connection } from "next/server";
import ExternalAccessClient from "./ExternalAccessClient";


export default async function ExternalAccessPage({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  return <ExternalAccessClient token={token} />;
}
