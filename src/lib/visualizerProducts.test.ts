import assert from "node:assert/strict";
import test from "node:test";
import { isPanelProduct, mapProductToVisualizerPanel } from "./visualizerProducts";

const validPanel = {
  id: "TRINA-550",
  brand: "Trina",
  model: "Vertex Mono 550W",
  description: "Monocrystalline solar module",
  price: 4200,
  physicalWidth: 1.13,
  physicalLength: 2.28,
  wattageCapacity: 550,
  metadata: {},
  category: { name: "Solar Panels", slug: "solar-panels" },
};

test("visualizer catalog includes panel products and rejects unrelated solar equipment", () => {
  assert.equal(isPanelProduct(validPanel), true);
  assert.equal(isPanelProduct({
    id: "SOLAR-INVERTER-5KW",
    brand: "Sunrise",
    model: "PV Hybrid Inverter 5kW",
    price: 24000,
    description: "Solar energy conversion",
    category: { name: "Solar Equipment", slug: "solar-equipment" },
  }), false);
  assert.equal(isPanelProduct({
    id: "PV-MOUNT-KIT",
    brand: "MountCo",
    model: "PV Panel Mounting Kit",
    price: 3000,
  }), false);
  assert.equal(isPanelProduct({
    id: "THAI-PANEL-550",
    brand: "Solar",
    model: "แผงโซลาร์เซลล์ 550W",
    price: 4200,
  }), true);
});

test("visualizer mapping uses catalog specifications and leaves unknown technology unclassified", () => {
  assert.deepEqual(mapProductToVisualizerPanel(validPanel), {
    id: "TRINA-550",
    name: "Trina Vertex Mono 550W",
    brand: "Trina",
    model: "Vertex Mono 550W",
    type: "mono",
    width: 1.13,
    height: 2.28,
    power: 550,
    price: 4200,
    desc: "Monocrystalline solar module",
    source: "ERPNext",
  });

  const metadataPanel = mapProductToVisualizerPanel({
    ...validPanel,
    physicalWidth: null,
    physicalLength: null,
    wattageCapacity: null,
    metadata: { widthM: "1.12 m", lengthM: 2.25, wattage: "545 Wp" },
    description: null,
    model: "Module 545W",
  });
  assert.equal(metadataPanel?.width, 1.12);
  assert.equal(metadataPanel?.height, 2.25);
  assert.equal(metadataPanel?.power, 545);
  assert.equal(metadataPanel?.type, "unknown");
  assert.equal(metadataPanel?.desc, "");
});

test("visualizer mapping excludes catalog items with missing specifications or price", () => {
  assert.equal(mapProductToVisualizerPanel({
    ...validPanel,
    wattageCapacity: null,
    metadata: {},
  }), null);
  assert.equal(mapProductToVisualizerPanel({
    ...validPanel,
    physicalWidth: null,
    metadata: { width: 1.13 },
  }), null);
  assert.equal(mapProductToVisualizerPanel({
    ...validPanel,
    price: 0,
  }), null);
});
