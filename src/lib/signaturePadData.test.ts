import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSignatureData, scaleNormalizedSignatureData } from "./signaturePadData";

test("signature strokes retain their relative position across canvas sizes", () => {
  const points = [[
    { x: 50, y: 44, time: 10, color: "#0F172A" },
    { x: 150, y: 132, time: 20, color: "#0F172A" },
  ]];

  const normalized = normalizeSignatureData(points, 200, 176);
  assert.deepEqual(normalized, [[
    { x: 0.25, y: 0.25, time: 10, color: "#0F172A" },
    { x: 0.75, y: 0.75, time: 20, color: "#0F172A" },
  ]]);
  assert.deepEqual(scaleNormalizedSignatureData(normalized, 400, 176), [[
    { x: 100, y: 44, time: 10, color: "#0F172A" },
    { x: 300, y: 132, time: 20, color: "#0F172A" },
  ]]);
});

test("signature coordinate conversion safely handles a zero-sized observation", () => {
  const points = [[{ x: 12, y: 18, time: 10 }]];
  assert.deepEqual(normalizeSignatureData(points, 0, 0), [[
    { x: 12, y: 18, time: 10 },
  ]]);
});
