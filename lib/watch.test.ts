import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeWatchStores, type TapeSnapshot, type TapeWatchStore } from "./watch";

function snap(id: string, at: string, receipts: number): TapeSnapshot {
  return {
    topicId: id,
    label: id,
    velocity: "rising",
    lean: "thin",
    pos: 0,
    neg: 0,
    receiptCount: receipts,
    firstAt: null,
    at,
  };
}

test("mergeWatchStores unions ids and keeps the later snap", () => {
  const local: TapeWatchStore = {
    ids: ["camry"],
    snaps: { camry: snap("camry", "2026-08-26T08:00:00Z", 4) },
  };
  const remote: TapeWatchStore = {
    ids: ["camry", "tesla"],
    snaps: {
      camry: snap("camry", "2026-08-26T09:00:00Z", 7),
      tesla: snap("tesla", "2026-08-26T07:00:00Z", 2),
    },
  };
  const merged = mergeWatchStores(local, remote);
  assert.deepEqual(merged.ids.toSorted(), ["camry", "tesla"]);
  assert.equal(merged.snaps.camry.receiptCount, 7);
  assert.equal(merged.snaps.tesla.receiptCount, 2);
});
