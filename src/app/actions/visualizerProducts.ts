"use server";

import { unstable_cache } from "next/cache";
import { listCatalogCategories, listCatalogProducts } from "@/lib/erpnextCatalog";
import {
  isPanelProduct,
  mapProductToVisualizerPanel,
  type VisualizerPanelProduct,
} from "@/lib/visualizerProducts";

const getCachedVisualizerPanelProducts = unstable_cache(
  async (): Promise<VisualizerPanelProduct[]> => {
    try {
      const [categories, generalCatalog] = await Promise.all([
        listCatalogCategories(),
        listCatalogProducts({ take: 1000, sort: "newest" }),
      ]);
      const panelCategories = categories.filter((category) => isPanelProduct({
        id: category.id,
        brand: "",
        model: "",
        price: 0,
        category: {
          name: category.name,
          slug: category.slug,
          parent: category.parent,
        },
      }));
      const categoryCatalogs = await Promise.all(
        panelCategories.map((category) => listCatalogProducts({
          categoryId: category.id,
          take: 1000,
          sort: "newest",
        })),
      );

      // Category-specific queries keep panels discoverable even when unrelated
      // catalog items occupy the first 1,000 general catalog rows.
      const productsById = new Map(generalCatalog.products.map((product) => [product.id, product]));
      for (const catalog of categoryCatalogs) {
        for (const product of catalog.products) productsById.set(product.id, product);
      }

      return [...productsById.values()]
        .filter(isPanelProduct)
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
        .map(mapProductToVisualizerPanel)
        .filter((product): product is VisualizerPanelProduct => product !== null);
    } catch (error) {
      console.error("[visualizer-products] Failed to load product catalog", error);
      return [];
    }
  },
  ["visualizer-panel-products-v1"],
  { revalidate: 300, tags: ["visualizer-products"] },
);

export async function getVisualizerPanelProducts(): Promise<VisualizerPanelProduct[]> {
  return getCachedVisualizerPanelProducts();
}
