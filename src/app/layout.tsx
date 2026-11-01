import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./[locale]/globals.css";
import "./[locale]/solar-atelier.css";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/asset/sd-logo.png", type: "image/png", sizes: "1254x1254" }],
    apple: [{ url: "/asset/sd-logo.png", type: "image/png", sizes: "1254x1254" }],
  },
};

export default function CustomerRootLayout({ children }: { children: ReactNode }) {
  return children;
}
