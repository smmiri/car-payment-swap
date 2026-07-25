import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_INPUTS, createScenario, VEHICLE_TYPES, FREQ_OPTIONS } from "../lib/defaults.js";
import { PROVINCE_CODES } from "../lib/vehicle-taxes.js";
import {
  clearInputsCookie,
  loadInputsFromCookie,
  writeInputsToCookie,
} from "../lib/persist-inputs.js";
import { compareScenarios } from "../lib/model.js";
import { defaultOperatingCosts } from "../lib/operating-costs.js";
import { defaultLicensing } from "../lib/vehicle-taxes.js";
import InputField from "./InputField.jsx";
import OverrideField from "./OverrideField.jsx";
import Switch from "./Switch.jsx";
import Warnings from "./Warnings.jsx";
import SummaryCards from "./SummaryCards.jsx";
import ComparisonTable from "./ComparisonTable.jsx";
import CostCharts from "./CostCharts.jsx";
import { useFieldMeta } from "../hooks/useFieldMeta.js";
import { useFormat } from "../hooks/useFormat.js";

const SAVE_DEBOUNCE_MS = 400;

function loadInitialInputs() {
  return loadInputsFromCookie() ?? structuredClone(DEFAULT_INPUTS);
}

export default function Calculator() {
  const { t } = useTranslation();
  const { t: tProvinces } = useTranslation("provinces");
  const FIELD_META = useFieldMeta();
  const fmt = useFormat();
  const [inputs, setInputs] = useState(loadInitialInputs);
  const results = useMemo(() => compareScenarios(inputs), [inputs]);

  useEffect(() => {
    const id = window.setTimeout(() => writeInputsToCookie(inputs), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [inputs]);

  const activeIndex = Math.max(
    0,
    inputs.scenarios.findIndex((s) => s.id === inputs.activeScenarioId),
  );
  const activeScenario = inputs.scenarios[activeIndex] || inputs.scenarios[0];
  const activeId = activeScenario?.id;
  const activeResult = results.scenarios[activeIndex];

  const updateGlobal = (patch) =>
    setInputs((prev) => ({ ...prev, global: { ...prev.global, ...patch } }));
  const updateCurrent = (patch) =>
    setInputs((prev) => ({ ...prev, current: { ...prev.current, ...patch } }));
  const updateScenario = (id, patch) =>
    setInputs((prev) => ({
      ...prev,
      scenarios: prev.scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const setModeField = (scope, key, mode, manual) => {
    if (scope === "current") {
      updateCurrent({
        [key]: {
          mode,
          manual: manual ?? inputs.current[key]?.manual ?? 0,
        },
      });
    } else if (activeScenario) {
      updateScenario(activeScenario.id, {
        [key]: {
          mode,
          manual: manual ?? activeScenario[key]?.manual ?? 0,
        },
      });
    }
  };

  const handleReset = () => {
    clearInputsCookie();
    setInputs(structuredClone(DEFAULT_INPUTS));
  };

  const addScenario = () => {
    const base = activeScenario || createScenario();
    const { id: _drop, ...rest } = structuredClone(base);
    const next = createScenario({
      ...rest,
      name: `${base.name} copy`,
    });
    setInputs((prev) => ({
      ...prev,
      scenarios: [...prev.scenarios, next],
      activeScenarioId: next.id,
    }));
  };

  const duplicateScenario = () => {
    if (!activeScenario) return;
    addScenario();
  };

  const deleteScenario = () => {
    if (inputs.scenarios.length <= 1 || !activeScenario) return;
    setInputs((prev) => {
      const scenarios = prev.scenarios.filter((s) => s.id !== activeScenario.id);
      return {
        ...prev,
        scenarios,
        activeScenarioId: scenarios[0]?.id,
      };
    });
  };

  const toggleAutoMaxBudget = (on) => {
    if (!activeScenario) return;
    updateScenario(activeScenario.id, { priceMode: on ? "solved" : "manual" });
  };

  const priceSolved = activeScenario?.priceMode === "solved";
  // When solved, the effective (solved) purchase price comes from the result.
  const displayedPurchasePrice = priceSolved
    ? activeResult?.purchasePrice ?? activeScenario?.purchasePrice
    : activeScenario?.purchasePrice;

  const opsPreview = activeScenario
    ? defaultOperatingCosts({
        province: inputs.global.province,
        vehicleType: activeScenario.vehicleType,
        annualKm: inputs.global.annualKm,
        currentInsurance: inputs.current.insurance?.manual || 180,
      })
    : null;

  return (
    <section id="calculator" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading">{t("calculator.assumptions")}</h2>
          <p className="text-sm text-muted">
            {t("calculator.assumptionsHint")}{" "}
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold dark:bg-slate-700">
              {t("calculator.helpIcon")}
            </span>{" "}
            {t("calculator.helpSuffix")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-default px-3 py-1.5 text-xs font-medium text-label hover:bg-surface-inset"
        >
          {t("calculator.reset")}
        </button>
      </header>

      <div className="space-y-4">
        {/* Global */}
        <Panel title={t("calculator.global")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label={t("fields.province")}
              value={inputs.global.province}
              onChange={(v) => updateGlobal({ province: v })}
              options={PROVINCE_CODES.map((c) => ({ value: c, label: tProvinces(c) }))}
            />
            <InputField
              name="targetAllInMonthly"
              value={inputs.global.targetAllInMonthly}
              meta={FIELD_META.targetAllInMonthly}
              onChange={(_, v) => updateGlobal({ targetAllInMonthly: v })}
            />
            <SelectField
              label={t("fields.targetFreq")}
              value={inputs.global.targetFreq}
              onChange={(v) => updateGlobal({ targetFreq: v })}
              options={FREQ_OPTIONS.map((f) => ({ value: f, label: t(`freq.${f}`) }))}
            />
            <InputField
              name="annualKm"
              value={inputs.global.annualKm}
              meta={FIELD_META.annualKm}
              onChange={(_, v) => updateGlobal({ annualKm: v })}
            />
          </div>
        </Panel>

        {/* Current car */}
        <Panel title={t("calculator.current")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InputField
              name="balance"
              value={inputs.current.balance}
              meta={FIELD_META.balance}
              onChange={(_, v) => updateCurrent({ balance: v })}
            />
            <InputField
              name="payment"
              value={inputs.current.payment}
              meta={FIELD_META.payment}
              onChange={(_, v) => updateCurrent({ payment: v })}
            />
            <SelectField
              label={t("fields.freq")}
              value={inputs.current.freq}
              onChange={(v) => updateCurrent({ freq: v })}
              options={FREQ_OPTIONS.map((f) => ({ value: f, label: t(`freq.${f}`) }))}
            />
            <div className="rounded-md border border-default bg-surface-muted px-3 py-2.5 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted">Current all-in</div>
              <div className="text-lg font-semibold tabular-nums text-heading">
                {fmt.formatCurrency(results.current.allInMonthly)}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <OverrideField
              label={t("fields.insurance")}
              mode={inputs.current.insurance.mode}
              manual={inputs.current.insurance.manual}
              computed={inputs.current.insurance.manual}
              onModeChange={(mode) => setModeField("current", "insurance", mode)}
              onManualChange={(manual) => setModeField("current", "insurance", "manual", manual)}
            />
            <OverrideField
              label={t("fields.mo")}
              mode={inputs.current.mo.mode}
              manual={inputs.current.mo.manual}
              computed={inputs.current.mo.manual}
              onModeChange={(mode) => setModeField("current", "mo", mode)}
              onManualChange={(manual) => setModeField("current", "mo", "manual", manual)}
            />
            <OverrideField
              label={t("fields.fuel")}
              mode={inputs.current.fuel.mode}
              manual={inputs.current.fuel.manual}
              computed={inputs.current.fuel.manual}
              onModeChange={(mode) => setModeField("current", "fuel", mode)}
              onManualChange={(manual) => setModeField("current", "fuel", "manual", manual)}
            />
          </div>
        </Panel>

        {/* Scenarios */}
        <Panel title={t("calculator.scenarios")}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {inputs.scenarios.map((s, i) => (
              <button
                key={s.id || `scenario-${i}`}
                type="button"
                onClick={() => setInputs((prev) => ({ ...prev, activeScenarioId: s.id }))}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  i === activeIndex
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-default text-label hover:bg-surface-inset"
                }`}
              >
                {s.name}
              </button>
            ))}
            <button
              type="button"
              onClick={addScenario}
              className="rounded-full border border-dashed border-default px-3 py-1 text-xs font-medium text-label hover:bg-surface-inset"
            >
              + {t("calculator.addScenario")}
            </button>
            <button type="button" onClick={duplicateScenario} className="text-xs text-muted hover:text-heading">
              {t("calculator.duplicate")}
            </button>
            <button
              type="button"
              onClick={deleteScenario}
              disabled={inputs.scenarios.length <= 1}
              className="text-xs text-muted hover:text-heading disabled:opacity-40"
            >
              {t("calculator.delete")}
            </button>
          </div>

          {activeScenario ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted">{t("calculator.rename")}</label>
                <input
                  type="text"
                  value={activeScenario.name}
                  onChange={(e) => updateScenario(activeScenario.id, { name: e.target.value })}
                  className="rounded-md border input-shell px-2 py-1 text-sm"
                />
                <div className="ms-auto flex items-center gap-2" title={t("calculator.autoMaxBudgetHint")}>
                  <Toggle
                    label={t("calculator.autoMaxBudget")}
                    checked={priceSolved}
                    onChange={toggleAutoMaxBudget}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField
                  label={t("fields.channel")}
                  value={activeScenario.channel}
                  onChange={(v) => updateScenario(activeScenario.id, { channel: v })}
                  options={[
                    { value: "dealer", label: t("channels.dealer") },
                    { value: "private", label: t("channels.private") },
                  ]}
                />
                <SelectField
                  label={t("fields.disposalMethod")}
                  value={activeScenario.disposalMethod || "trade_in"}
                  onChange={(v) => updateScenario(activeScenario.id, { disposalMethod: v })}
                  options={[
                    { value: "trade_in", label: t("disposalMethods.trade_in") },
                    { value: "private_sale", label: t("disposalMethods.private_sale") },
                  ]}
                />
                <SelectField
                  label={t("fields.vehicleType")}
                  value={activeScenario.vehicleType}
                  onChange={(v) => updateScenario(activeScenario.id, { vehicleType: v })}
                  options={VEHICLE_TYPES.map((v) => ({ value: v, label: t(`vehicleTypes.${v}`) }))}
                />
                <InputField
                  name="purchasePrice"
                  value={displayedPurchasePrice}
                  meta={FIELD_META.purchasePrice}
                  disabled={priceSolved}
                  hint={priceSolved ? t("calculator.autoMaxBudgetHint") : undefined}
                  onChange={(_, v) =>
                    updateScenario(activeScenario.id, {
                      purchasePrice: v,
                      priceMode: "manual",
                    })
                  }
                />
                <InputField
                  name="tradeInValue"
                  value={activeScenario.tradeInValue}
                  meta={FIELD_META.tradeInValue}
                  onChange={(_, v) => updateScenario(activeScenario.id, { tradeInValue: v })}
                />
                <InputField
                  name="downPayment"
                  value={activeScenario.downPayment}
                  meta={FIELD_META.downPayment}
                  onChange={(_, v) => updateScenario(activeScenario.id, { downPayment: v })}
                />
                <InputField
                  name="apr"
                  value={activeScenario.apr}
                  meta={FIELD_META.apr}
                  onChange={(_, v) => updateScenario(activeScenario.id, { apr: v })}
                />
                <InputField
                  name="termMonths"
                  value={activeScenario.termMonths}
                  meta={FIELD_META.termMonths}
                  onChange={(_, v) => updateScenario(activeScenario.id, { termMonths: v })}
                />
                <SelectField
                  label={t("fields.freq")}
                  value={activeScenario.paymentFreq}
                  onChange={(v) => updateScenario(activeScenario.id, { paymentFreq: v })}
                  options={FREQ_OPTIONS.map((f) => ({ value: f, label: t(`freq.${f}`) }))}
                />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <OverrideField
                  label={t("fields.insurance")}
                  mode={activeScenario.insurance.mode}
                  manual={activeScenario.insurance.manual}
                  computed={opsPreview?.insurance}
                  onModeChange={(mode) => setModeField("scenario", "insurance", mode)}
                  onManualChange={(manual) => setModeField("scenario", "insurance", "manual", manual)}
                />
                <OverrideField
                  label={t("fields.mo")}
                  mode={activeScenario.mo.mode}
                  manual={activeScenario.mo.manual}
                  computed={opsPreview?.mo}
                  onModeChange={(mode) => setModeField("scenario", "mo", mode)}
                  onManualChange={(manual) => setModeField("scenario", "mo", "manual", manual)}
                />
                <OverrideField
                  label={t("fields.fuel")}
                  mode={activeScenario.fuel.mode}
                  manual={activeScenario.fuel.manual}
                  computed={opsPreview?.fuel}
                  onModeChange={(mode) => setModeField("scenario", "fuel", mode)}
                  onManualChange={(manual) => setModeField("scenario", "fuel", "manual", manual)}
                />
                <OverrideField
                  label={t("fields.dealerFees")}
                  mode={activeScenario.dealerFees.mode}
                  manual={activeScenario.dealerFees.manual}
                  computed={499}
                  onModeChange={(mode) => setModeField("scenario", "dealerFees", mode)}
                  onManualChange={(manual) => setModeField("scenario", "dealerFees", "manual", manual)}
                />
                <OverrideField
                  label={t("fields.licensing")}
                  mode={activeScenario.licensing.mode}
                  manual={activeScenario.licensing.manual}
                  computed={defaultLicensing(inputs.global.province)}
                  onModeChange={(mode) => setModeField("scenario", "licensing", mode)}
                  onManualChange={(manual) => setModeField("scenario", "licensing", "manual", manual)}
                />
                <OverrideField
                  label="Taxes (total)"
                  mode={activeScenario.taxes.mode}
                  manual={activeScenario.taxes.manual}
                  computed={activeResult?.taxBreakdown?.total}
                  onModeChange={(mode) => setModeField("scenario", "taxes", mode)}
                  onManualChange={(manual) => setModeField("scenario", "taxes", "manual", manual)}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-4">
                <Toggle
                  label={t("fields.financeTaxes")}
                  checked={activeScenario.financeTaxes !== false}
                  onChange={(v) => updateScenario(activeScenario.id, { financeTaxes: v })}
                />
                <Toggle
                  label={t("fields.alreadyEvap")}
                  checked={Boolean(activeScenario.alreadyClaimedEvap)}
                  onChange={(v) => updateScenario(activeScenario.id, { alreadyClaimedEvap: v })}
                />
              </div>

              {activeResult ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
                  <MiniStat label="All-in / mo" value={fmt.formatCurrency(activeResult.allInMonthly)} />
                  <MiniStat label="Amount financed" value={fmt.formatCurrency(activeResult.amountFinanced)} />
                  <MiniStat label="Taxes" value={fmt.formatCurrency(activeResult.taxes)} />
                  <MiniStat
                    label="Rebates"
                    value={fmt.formatCurrency(activeResult.rebates?.total || 0)}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </Panel>
      </div>

      <div className="mt-10 space-y-6 border-t border-default pt-10">
        <header>
          <h2 className="text-lg font-semibold text-heading">{t("calculator.results")}</h2>
          <p className="text-sm text-muted">{t("calculator.resultsHint")}</p>
        </header>
        <Warnings items={results.warnings} />
        <SummaryCards results={results} />
        <div>
          <h3 className="mb-3 text-sm font-semibold text-heading">{t("calculator.compareTitle")}</h3>
          <ComparisonTable results={results} />
        </div>
        <CostCharts results={results} />
      </div>
    </section>
  );
}

function Panel({ title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-default bg-surface-muted shadow-sm">
      <header className="panel-header px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-heading">{title}</h3>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function SelectField({ label, value, onChange, options }) {
  const id = `select-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field w-full"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  const id = `toggle-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onChange={onChange} aria-label={label} />
      <label htmlFor={id} className="text-sm text-label">
        {label}
      </label>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-default bg-surface-card px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-semibold tabular-nums text-heading">{value}</div>
    </div>
  );
}
