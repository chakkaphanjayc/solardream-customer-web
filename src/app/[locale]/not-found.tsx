import NotFoundView from "@/components/ui/NotFoundView";

export const metadata = {
  title: "Page not found | SolarDream",
};

export default function LocaleNotFound() {
  return <NotFoundView homeUrl="/" autoRedirectSeconds={5} />;
}
