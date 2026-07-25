import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  gasMonthlyCost,
  evMonthlyCost,
  defaultOperatingCosts,
  sumOperatingMonthly,
} from "./operating-costs.js";

describe("operating costs", () => {
  it("computes gas monthly from km and efficiency", () => {
    const m = gasMonthlyCost({
      annualKm: 20_000,
      LPer100km: 8,
      gasPerLitre: 1.5,
    });
    // (200*8*1.5)/12 = 200
    assert.equal(m, 200);
  });

  it("EV monthly uses home charge share", () => {
    const m = evMonthlyCost({
      annualKm: 12_000,
      kWhPer100km: 18,
      elecPerKwh: 0.1,
      homeChargePct: 1,
    });
    assert.equal(m, (120 * 18 * 0.1) / 12);
  });

  it("EV defaults lower M&O and higher insurance uplift", () => {
    const gas = defaultOperatingCosts({ vehicleType: "used_gas", currentInsurance: 200 });
    const ev = defaultOperatingCosts({ vehicleType: "new_ev_bev", currentInsurance: 200 });
    assert.ok(ev.mo < gas.mo);
    assert.ok(ev.insurance > gas.insurance);
  });

  it("sums operating monthly", () => {
    assert.equal(sumOperatingMonthly({ insurance: 100, mo: 50, fuel: 75 }), 225);
  });
});
