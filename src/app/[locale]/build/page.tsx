import ConfiguratorClient from "./ConfiguratorClient";
import FeatureGuard from "@/components/features/FeatureGuard";
import { getCachedPublicBuildConfig } from "@/lib/public-build-config-cache";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";

// The route receives locale params and runs a feature gate before rendering
// the interactive configurator. Its backing configuration is cached below,
// but the route itself should remain request-time.
export const instant = false;

export default async function BuildPage({
  params,
}: {
  params: Promise<{ locale: "en" | "th" }>;
}) {
  const { locale } = await params;
  const buildConfig = await getCachedPublicBuildConfig(locale);

  return (
    <SolarRouteShell className="solar-build-page">
      <FeatureGuard
        featureKey="build_configurator"
        featureName="Build Configurator"
      >
        <ConfiguratorClient initialBuildConfig={buildConfig} />
      </FeatureGuard>
    </SolarRouteShell>
  );
}
