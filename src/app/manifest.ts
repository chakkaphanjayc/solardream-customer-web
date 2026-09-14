import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SolarDream - Smart Residential Solar Systems",
    short_name: "SolarDream",
    description: "Plan your smart residential solar system in Thailand.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F0EEE9",
    theme_color: "#0F172A",
    icons: [{ src: "/asset/sd-logo.png", sizes: "1254x1254", type: "image/png", purpose: "maskable" }],
  };
}
