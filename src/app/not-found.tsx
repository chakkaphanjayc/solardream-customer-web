import NotFoundView from "@/components/ui/NotFoundView";

export const metadata = {
  title: "Page not found | SolarDream",
};

export default function GlobalNotFound() {
  return (
    <html lang="th">
      <body data-solar-ui="customer" className="min-h-screen bg-[var(--sd-page)] text-[var(--sd-ink)] antialiased">
        <NotFoundView homeUrl="/" autoRedirectSeconds={5} as="main" />
      </body>
    </html>
  );
}
