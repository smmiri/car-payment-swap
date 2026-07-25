import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bcPstRate, computeVehicleTaxes, computeLuxuryTax } from "./vehicle-taxes.js";

describe("BC PST-116 golden cases", () => {
  it("rate from full price; tax on net after trade-in ($60k / $25k → PST $3,500)", () => {
    assert.equal(bcPstRate(60_000, { isZev: false }), 0.1);
    const t = computeVehicleTaxes({
      province: "BC",
      purchasePrice: 60_000,
      tradeInValue: 25_000,
      channel: "dealer",
      vehicleType: "new_gas",
    });
    assert.equal(t.pstRate, 0.1);
    assert.equal(t.netTaxableBase, 35_000);
    assert.equal(t.pst, 3_500);
    assert.equal(t.gst, 1_750);
  });

  it("private sale gets no trade-in credit", () => {
    const t = computeVehicleTaxes({
      province: "BC",
      purchasePrice: 60_000,
      tradeInValue: 25_000,
      channel: "private",
      vehicleType: "used_gas",
    });
    assert.equal(t.tradeInCredit, 0);
    assert.equal(t.pst, 6_000);
  });

  it("dealer purchase but current car sold privately gets no trade-in credit", () => {
    const t = computeVehicleTaxes({
      province: "BC",
      purchasePrice: 60_000,
      tradeInValue: 25_000,
      channel: "dealer",
      disposalMethod: "private_sale",
      vehicleType: "new_gas",
    });
    assert.equal(t.tradeInCredit, 0);
    assert.equal(t.netTaxableBase, 60_000);
    assert.equal(t.pst, 6_000); // 10% × 60k, no net reduction
    assert.equal(t.gst, 3_000);
  });
});

describe("Ontario HST trade-in", () => {
  it("$45k / $20k → HST on $25k; saves vs no trade-in", () => {
    const withTrade = computeVehicleTaxes({
      province: "ON",
      purchasePrice: 45_000,
      tradeInValue: 20_000,
      channel: "dealer",
      vehicleType: "used_gas",
    });
    assert.equal(withTrade.netTaxableBase, 25_000);
    assert.equal(withTrade.hst, 3_250);
    assert.ok(Math.abs(withTrade.tradeInTaxSaved - 2_600) < 0.01); // 13% × 20k
  });
});

describe("luxury tax", () => {
  it("applies above $100k and is not reduced by trade-in", () => {
    const lux = computeLuxuryTax(120_000, { isNew: true });
    assert.equal(lux, Math.min(12_000, 4_000)); // min(10% of 120k, 20% of 20k) = 4000
    const t = computeVehicleTaxes({
      province: "ON",
      purchasePrice: 120_000,
      tradeInValue: 30_000,
      channel: "dealer",
      vehicleType: "new_gas",
    });
    assert.equal(t.luxuryTax, 4_000);
  });
});
