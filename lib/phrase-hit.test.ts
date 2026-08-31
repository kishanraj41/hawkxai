import assert from "node:assert/strict";
import { test } from "node:test";
import { tokenHits } from "./phrase-hit";
import { titleHits, titleScore } from "./query";

test("tokenHits keeps Camry a whole token", () => {
  assert.equal(tokenHits("New Camry hybrid", "Camry"), true);
  assert.equal(tokenHits("Toyota Camry, 2002 Thru 2006", "Camry"), true);
  assert.equal(tokenHits("camera sensor", "Camry"), false);
  assert.equal(tokenHits("GitHub: cmblum2/camryn-portfolio", "Camry"), false);
  assert.equal(tokenHits("https://github.com/mcfadyentheresa-lab/4Camryn", "Camry"), false);
  assert.equal(tokenHits("heat https://x.test/#HeatWaveFit", "#HeatWaveFit"), true);
});

test("titleScore does not boost camryn occupiers for Camry", () => {
  assert.ok(titleScore("Toyota Camry automotive repair manual", ["camry", "toyota camry"]) >= 1.6);
  assert.ok(titleHits("Toyota Camry automotive repair manual", ["camry"]));
  assert.equal(titleHits("GitHub: cmblum2/camryn-portfolio", ["camry"]), false);
  assert.ok(titleScore("GitHub: cmblum2/camryn-portfolio", ["camry"]) < 1.4);
});
