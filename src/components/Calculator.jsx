import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_INPUTS, createScenario, VEHICLE_TYPES, FREQ_OPTIONS } from "../lib/defaults.js";
import { PROVINCE_CODES, defaultLicensing } from "../lib/vehicle-taxes.js";
import {
  clearInputsCookie,
  loadInputsFromCookie,
  writeInputsToCookie,
} from "../lib/persist-inputs.js";
import {
  buildShareUrl,
  consumeShareFromLocation,
  SHARE_URL_SOFT_MAX,
} from "../lib/share-inputs.js";
import {
  compareScenarios,
  suggestedRetainedPercent,
  isUsedVehicleType,
} from "../lib/model.js";
import { defaultOperatingCosts } from "../lib/operating-costs.js";
import InputField from "./InputField.jsx";
import OverrideField from "./OverrideField.jsx";
import SelectField from "./SelectField.jsx";
import FieldGroup from "./FieldGroup.jsx";
import Panel from "./Panel.jsx";
import Switch from "./Switch.jsx";
import Warnings from "./Warnings.jsx";
import VerdictCard from "./VerdictCard.jsx";
import SummaryCards from "./SummaryCards.jsx";
import ComparisonTable from "./ComparisonTable.jsx";
import CostCharts from "./CostCharts.jsx";
import { useFieldMeta } from "../hooks/useFieldMeta.js";
import { useFormat } from "../hooks/useFormat.js";

const SAVE_DEBOUNCE_MS = 400;

function loadBootState() {
  const shared = consumeShareFromLocation();
  if (shared) {
    return { inputs: shared, fromShare: true };
  }
  return {
    inputs: loadInputsFromCookie() ?? structuredClone(DEFAULT_INPUTS),
    fromShare: false,
  };
}

export default function Calculator() {
  const { t } = useTranslation();
  const { t: tProvinces } = useTranslation("provinces");
  const FIELD_META = useFieldMeta();
  const fmt = useFormat();
  const [boot] = useState(loadBootState);
  const [inputs, setInputs] = useState(boot.inputs);
  const [shareBanner, setShareBanner] = useState(boot.fromShare);
  const [shareStatus, setShareStatus] = useState(null);
  const results = useMemo(() => compareScenarios(inputs), [inputs]);

  useEffect(() => {
    const id = window.setTimeout(() => writeInputsToCookie(inputs), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [inputs]);

  useEffect(() => {
    if (!shareBanner) return undefined;
    const id = window.setTimeout(() => setShareBanner(false), 8_000);
    return () => window.clearTimeout(id);
  }, [shareBanner]);

  useEffect(() => {
    if (!shareStatus) return undefined;
    const id = window.setTimeout(() => setShareStatus(null), 4_000);
    return () => window.clearTimeout(id);
  }, [shareStatus]);

  const activeIndex = Math.max(
    0,
    inputs.scenarios.findIndex((s) => s.id === inputs.activeScenarioId),
  );
  const activeScenario = inputs.scenarios[activeIndex] || inputs.scenarios[0];
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
    setShareBanner(false);
  };

  const handleShare = async () => {
    const url = buildShareUrl(inputs, `${window.location.origin}${window.location.pathname}`);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt(t("calculator.shareCopyPrompt"), url);
      }
      setShareStatus(url.length > SHARE_URL_SOFT_MAX ? "copiedLong" : "copied");
    } catch {
      window.prompt(t("calculator.shareCopyPrompt"), url);
      setShareStatus("copied");
    }
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

  const horizonMonths =
    activeScenario?.ownershipHorizonMonths || results.ownershipHorizonMonths || 60;

  return (
    <section id="calculator" className="content-width py-10 sm:py-12">
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
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleShare} className="btn-secondary">
            {t("calculator.share")}
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            {t("calculator.reset")}
          </button>
        </div>
      </header>

      {shareBanner ? (
        <div
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          {t("calculator.shareLoaded")}
        </div>
      ) : null}
      {shareStatus ? (
        <div
          className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100"
          role="status"
        >
          {t(`calculator.shareStatus.${shareStatus}`)}
        </div>
      ) : null}

      <div className="space-y-8">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* Results first on mobile; sticky beside inputs only on desktop */}
          <aside className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2 lg:col-span-5 lg:self-start">
          <div>
            <h2 className="text-lg font-semibold text-heading">{t("calculator.results")}</h2>
            <p className="text-sm text-muted">{t("calculator.resultsHint")}</p>
          </div>
          <VerdictCard results={results} />
          <SummaryCards results={results} />
          <Warnings items={results.warnings} />
          {activeResult ? (
            <div className="panel-shell p-4">
              <p className="section-label">{t("calculator.activeSnapshot")}</p>
              <p className="mt-1 text-sm font-medium text-heading">{activeScenario?.name}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <SnapshotRow
                  label={t("summary.cashAllIn")}
                  value={fmt.formatCurrency(activeResult.cashAllInMonthly)}
                />
    <SnapshotRow
                  label={t("summary.ownershipMonthly")}
                  value={fmt.formatCurrency(activeResult.ownershipMonthly)}
                />
                <SnapshotRow
                  label={t("summary.economicMonthly")}
                  value={fmt.formatCurrency(activeResult.economicMonthly)}
                />
                <SnapshotRow
                  label={t("table.terminalEquity")}
                  value={fmt.formatSignedCurrency(activeResult.terminalEquity)}
                />
                <SnapshotRow
                  label={t("summary.amountFinanced")}
                  value={fmt.formatCurrency(activeResult.amountFinanced)}
                />
                <SnapshotRow
                  label={t("summary.taxes")}
                  value={fmt.formatCurrency(activeResult.taxes)}
                />
                <SnapshotRow
                  label={t("table.cashToClose")}
                  value={fmt.formatCurrency(activeResult.cashToClose)}
                />
              </dl>
            </div>
          ) : null}
        </aside>

        {/* Inputs */}
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-7">
          <Panel title={t("calculator.global")}>
            <FieldGroup cols={3}>
              <SelectField
                label={t("fields.province")}
                value={inputs.global.province}
                onChange={(v) => updateGlobal({ province: v })}
                options={PROVINCE_CODES.map((c) => ({ value: c, label: tProvinces(c) }))}
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
            </FieldGroup>
          </Panel>

          <Panel title={t("calculator.current")}>
            <FieldGroup title={t("calculator.groups.loanAndValue")}>
              <InputField
                name="balance"
                value={inputs.current.balance}
                meta={FIELD_META.balance}
                onChange={(_, v) => updateCurrent({ balance: v })}
              />
              <InputField
                name="marketValue"
                value={inputs.current.marketValue}
                meta={FIELD_META.marketValue}
                onChange={(_, v) => updateCurrent({ marketValue: v })}
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
            </FieldGroup>

            <FieldGroup title={t("calculator.groups.horizon")}>
              <InputField
                name="vehicleAgeYears"
                value={inputs.current.vehicleAgeYears}
                meta={FIELD_META.vehicleAgeYears}
                hint={
                  inputs.current.retainedValuePercent?.mode === "manual"
                    ? t("calculator.ageIgnoredManual")
                    : t("calculator.ageDrivesRetained")
                }
                onChange={(_, v) => updateCurrent({ vehicleAgeYears: v })}
              />
              <OverrideField
                label={t("fields.retainedValuePercent")}
                help={FIELD_META.retainedValuePercent?.help}
                mode={inputs.current.retainedValuePercent?.mode || "auto"}
                manual={inputs.current.retainedValuePercent?.manual ?? 50}
                computed={suggestedRetainedPercent({
                  vehicleAgeYears: inputs.current.vehicleAgeYears,
                  horizonMonths,
                  isUsed: true,
                })}
                suffix="%"
                step={5}
                min={0}
                onModeChange={(mode) => setModeField("current", "retainedValuePercent", mode)}
                onManualChange={(manual) =>
                  setModeField("current", "retainedValuePercent", "manual", manual)
                }
              />
            </FieldGroup>

            <FieldGroup title={t("calculator.groups.operating")}>
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
            </FieldGroup>
          </Panel>

          <Panel title={t("calculator.scenarios")}>
            <div className="flex flex-wrap gap-2">
              {inputs.scenarios.map((s, i) => (
                <button
                  key={s.id || `scenario-${i}`}
                  type="button"
                  onClick={() => setInputs((prev) => ({ ...prev, activeScenarioId: s.id }))}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
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
                className="rounded-lg border border-dashed border-default px-3 py-1.5 text-xs font-medium text-label hover:bg-surface-inset"
              >
                + {t("calculator.addScenario")}
              </button>
            </div>

            {activeScenario ? (
              <>
                <div className="flex flex-col gap-3 border-t border-subtle pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <label className="shrink-0 text-xs text-muted">{t("calculator.rename")}</label>
                    <input
                      type="text"
                      value={activeScenario.name}
                      onChange={(e) => updateScenario(activeScenario.id, { name: e.target.value })}
                      className="control-shell min-w-0 flex-1 px-3 text-sm text-heading"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={duplicateScenario}
                      className="text-xs font-medium text-muted hover:text-heading"
                    >
                      {t("calculator.duplicate")}
                    </button>
                    <button
                      type="button"
                      onClick={deleteScenario}
                      disabled={inputs.scenarios.length <= 1}
                      className="text-xs font-medium text-muted hover:text-heading disabled:opacity-40"
                    >
                      {t("calculator.delete")}
                    </button>
                    <Toggle
                      label={t("calculator.autoMaxBudget")}
                      checked={priceSolved}
                      onChange={toggleAutoMaxBudget}
                    />
                  </div>
                </div>

                <FieldGroup title={t("calculator.groups.deal")}>
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
                    onChange={(v) =>
                      updateScenario(activeScenario.id, {
                        vehicleType: v,
                        ...(isUsedVehicleType(v) && !(activeScenario.vehicleAgeYears > 0)
                          ? { vehicleAgeYears: 4 }
                          : {}),
                      })
                    }
                    options={VEHICLE_TYPES.map((v) => ({
                      value: v,
                      label: t(`vehicleTypes.${v}`),
                    }))}
                  />
                  {isUsedVehicleType(activeScenario.vehicleType) ? (
                    <InputField
                      name="vehicleAgeYears"
                      value={activeScenario.vehicleAgeYears ?? 0}
                      meta={FIELD_META.vehicleAgeYears}
                      hint={
                        activeScenario.retainedValuePercent?.mode === "manual"
                          ? t("calculator.ageIgnoredManual")
                          : t("calculator.ageDrivesRetained")
                      }
                      onChange={(_, v) =>
                        updateScenario(activeScenario.id, { vehicleAgeYears: v })
                      }
                    />
                  ) : null}
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
                </FieldGroup>

                <FieldGroup title={t("calculator.groups.targets")}>
                  <InputField
                    name="targetCashAllInMonthly"
                    value={activeScenario.targetCashAllInMonthly}
                    meta={FIELD_META.targetCashAllInMonthly}
                    onChange={(_, v) =>
                      updateScenario(activeScenario.id, { targetCashAllInMonthly: v })
                    }
                  />
                  <InputField
                    name="ownershipHorizonMonths"
                    value={activeScenario.ownershipHorizonMonths}
                    meta={FIELD_META.ownershipHorizonMonths}
                    onChange={(_, v) =>
                      updateScenario(activeScenario.id, { ownershipHorizonMonths: v })
                    }
                  />
                  <OverrideField
                    label={t("fields.retainedValuePercent")}
                    help={FIELD_META.retainedValuePercent?.help}
                    mode={activeScenario.retainedValuePercent?.mode || "auto"}
                    manual={activeScenario.retainedValuePercent?.manual ?? 50}
                    computed={suggestedRetainedPercent({
                      vehicleAgeYears: isUsedVehicleType(activeScenario.vehicleType)
                        ? activeScenario.vehicleAgeYears
                        : 0,
                      horizonMonths: activeScenario.ownershipHorizonMonths || 60,
                      isUsed: isUsedVehicleType(activeScenario.vehicleType),
                    })}
                    suffix="%"
                    step={5}
                    min={0}
                    onModeChange={(mode) => setModeField("scenario", "retainedValuePercent", mode)}
                    onManualChange={(manual) =>
                      setModeField("scenario", "retainedValuePercent", "manual", manual)
                    }
                  />
                </FieldGroup>

                <FieldGroup title={t("calculator.groups.financing")}>
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
                </FieldGroup>

                <FieldGroup title={t("calculator.groups.operatingFees")} cols={3}>
                  <OverrideField
                    label={t("fields.insurance")}
                    mode={activeScenario.insurance.mode}
                    manual={activeScenario.insurance.manual}
                    computed={opsPreview?.insurance}
                    onModeChange={(mode) => setModeField("scenario", "insurance", mode)}
                    onManualChange={(manual) =>
                      setModeField("scenario", "insurance", "manual", manual)
                    }
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
                    onManualChange={(manual) =>
                      setModeField("scenario", "dealerFees", "manual", manual)
                    }
                  />
                  <OverrideField
                    label={t("fields.licensing")}
                    mode={activeScenario.licensing.mode}
                    manual={activeScenario.licensing.manual}
                    computed={defaultLicensing(inputs.global.province)}
                    onModeChange={(mode) => setModeField("scenario", "licensing", mode)}
                    onManualChange={(manual) =>
                      setModeField("scenario", "licensing", "manual", manual)
                    }
                  />
                  <OverrideField
                    label={t("fields.taxes")}
                    mode={activeScenario.taxes.mode}
                    manual={activeScenario.taxes.manual}
                    computed={activeResult?.taxBreakdown?.total}
                    onModeChange={(mode) => setModeField("scenario", "taxes", mode)}
                    onManualChange={(manual) => setModeField("scenario", "taxes", "manual", manual)}
                  />
                </FieldGroup>

                <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-subtle pt-4">
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
              </>
            ) : null}
          </Panel>
        </div>
        </div>

        {/* Full-width detail — outside sticky grid so results never overlap */}
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-heading">{t("calculator.compareTitle")}</h3>
            <ComparisonTable results={results} />
          </div>
          <CostCharts results={results} />
        </div>
      </div>
    </section>
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

function SnapshotRow({ label, value }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-heading">{value}</dd>
    </div>
  );
}
