import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeFederalEvap, computeEvIncentives } from "./ev-incentives.js";

describe("EVAP", () => {
  it("BEV under cap gets $5,000", () => {
    const r = computeFederalEvap({ vehicleType: "new_ev_bev", purchasePrice: 48_000 });
    assert.equal(r.eligible, true);
    assert.equal(r.amount, 5_000);
  });

  it("$52k purchase is ineligible (price cap)", () => {
    const r = computeFederalEvap({ vehicleType: "new_ev_bev", purchasePrice: 52_000 });
    assert.equal(r.eligible, false);
    assert.equal(r.amount, 0);
    assert.ok(r.reasons.includes("price_cap"));
  });

  it("used EV gets $0 federal", () => {
    const r = computeFederalEvap({ vehicleType: "used_ev", purchasePrice: 30_000 });
    assert.equal(r.amount, 0);
  });

  it("QC adds provincial Roulez vert for new EV under $65k", () => {
    const r = computeEvIncentives({
      province: "QC",
      vehicleType: "new_ev_bev",
      purchasePrice: 45_000,
    });
    assert.equal(r.federal.amount, 5_000);
    assert.equal(r.provincial.amount, 2_000);
    assert.equal(r.total, 7_000);
  });
});
