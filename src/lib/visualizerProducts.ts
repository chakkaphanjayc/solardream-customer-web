export interface VisualizerPanelProduct {
  id: string;
  name: string;
  brand: string;
  model: string;
  type: "mono" | "poly" | "thin-film" | "unknown";
  width: number;
  height: number;
  power: number;
  price: number;
  desc: string;
  source: "ERPNext";
}

interface ProductLike {
  id: string;
  brand: string;
  model: string;
  price: number;
  description?: string | null;
  physicalWidth?: number | null;
  physicalLength?: number | null;
  wattageCapacity?: number | null;
  metadata?: unknown;
  category?: {
    name?: string | null;
    slug?: string | null;
    parent?: { name?: string | null } | null;
  } | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.replace(/[^\d.]/g, ""))
      : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function numberFromMetadata(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parsed = positiveNumber(metadata[key]);
    if (parsed) return parsed;
  }
}

function inferPanelType(product: ProductLike): VisualizerPanelProduct["type"] {
  const text = `${product.brand} ${product.model} ${product.description ?? ""}`.toLowerCase();
  if (text.includes("thin") || text.includes("film") || text.includes("flex")) return "thin-film";
  if (text.includes("poly")) return "poly";
  if (text.includes("mono") || text.includes("monocrystalline")) return "mono";
  return "unknown";
}

export function isPanelProduct(product: ProductLike) {
  const categoryLabels = [
    product.category?.name,
    product.category?.slug,
    product.category?.parent?.name,
  ].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase().replace(/[-_]+/g, " "));
  const category = categoryLabels.join(" ");
  const label = `${product.id} ${product.brand} ${product.model} ${product.description ?? ""}`.toLowerCase();
  const identity = `${category} ${label}`;

  // Accessories and balance-of-system items can mention solar or PV in their
  // name; keep them out even when another field contains a panel keyword.
  if (/\b(?:inverters?|batter(?:y|ies)|mount(?:ing)?|racking|cables?|controllers?|optimizers?|accessor(?:y|ies)|kits?)\b|อินเวอร์เตอร์|แบตเตอรี|อุปกรณ์/.test(identity)) {
    return false;
  }

  const explicitPanelPhrase = /\b(?:solar(?:\s+(?:pv|solar))?|pv(?:\s+solar)?|photovoltaic)\s+(?:panels?|modules?)\b/;
  const thaiPanelPhrase = /(?:แผง\s*(?:โซลาร์|พลังงานแสงอาทิตย์|เซลล์แสงอาทิตย์)|โมดูล\s*(?:โซลาร์|พลังงานแสงอาทิตย์|เซลล์แสงอาทิตย์))/u;
  const solarCategory = /\b(?:solar|pv|photovoltaic)\b/.test(category);
  const panelCategory = /\bpanels?\b/.test(category);
  const simplePanelCategory = categoryLabels.some((value) => /^panels?$/.test(value));

  return explicitPanelPhrase.test(label)
    || explicitPanelPhrase.test(category)
    || thaiPanelPhrase.test(identity)
    || (solarCategory && panelCategory)
    || simplePanelCategory;
}

export function mapProductToVisualizerPanel(product: ProductLike): VisualizerPanelProduct | null {
  const metadata = asRecord(product.metadata);
  const power = positiveNumber(product.wattageCapacity)
    ?? numberFromMetadata(metadata, ["wattage", "watts", "power", "wp", "powerRating", "power_rating", "panel_power"]);
  const width = positiveNumber(product.physicalWidth)
    ?? numberFromMetadata(metadata, ["widthM", "width_m", "moduleWidthM", "module_width_m"]);
  const height = positiveNumber(product.physicalLength)
    ?? numberFromMetadata(metadata, ["heightM", "height_m", "lengthM", "length_m", "moduleLengthM", "module_length_m"]);
  const price = positiveNumber(product.price);

  // Planner counts, fit, and cost projections all depend on real catalog specs.
  // Hide incomplete records instead of silently fabricating panel dimensions,
  // wattage, or a zero price.
  if (!power || !width || !height || !price) return null;

  return {
    id: product.id,
    name: `${product.brand} ${product.model}`.trim(),
    brand: product.brand,
    model: product.model,
    type: inferPanelType(product),
    width,
    height,
    power,
    price,
    desc: product.description?.trim() ?? "",
    source: "ERPNext",
  };
}

// Kept as a compatibility export for older visualizer callers. It is empty by
// design: the visualizer must never present an application-owned product.
export const fallbackVisualizerPanels: VisualizerPanelProduct[] = [];
