import { Trans, useTranslation } from "react-i18next";
import { RULES_AS_OF } from "../lib/site-meta.js";

export default function Methodology({ repoUrl = "https://github.com/smmiri/car-payment-swap" }) {
  const { t } = useTranslation();
  const readmeUrl = `${repoUrl.replace(/\/$/, "")}/blob/main/README.md`;

  return (
    <section className="rounded-2xl border border-default bg-surface-card p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-heading">{t("methodology.title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-body">{t("methodology.p1")}</p>
      <p className="mt-2 text-sm leading-relaxed text-body">
        <Trans
          ns="common"
          i18nKey="methodology.p2"
          values={{ rulesDate: RULES_AS_OF }}
          components={{ strong: <strong className="font-medium text-label" /> }}
        />
      </p>

      <div className="mt-6 space-y-4 text-sm text-body">
        <div>
          <h3 className="font-semibold text-heading">{t("methodology.taxTitle")}</h3>
          <p className="mt-1 leading-relaxed">{t("methodology.taxBody")}</p>
        </div>
        <div>
          <h3 className="font-semibold text-heading">{t("methodology.maxTitle")}</h3>
          <p className="mt-1 leading-relaxed">{t("methodology.maxBody")}</p>
        </div>
        <div>
          <h3 className="font-semibold text-heading">{t("methodology.sourcesTitle")}</h3>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            <li>
              <a
                className="link-accent"
                href="https://www2.gov.bc.ca/assets/gov/taxes/sales-taxes/publications/pst-116-motor-vehicle-dealers-leasing-companies.pdf"
                target="_blank"
                rel="noreferrer noopener"
              >
                BC PST-116 Motor Vehicle Dealers
              </a>
            </li>
            <li>
              <a
                className="link-accent"
                href="https://www2.gov.bc.ca/assets/gov/taxes/sales-taxes/publications/pst-308-vehicles.pdf"
                target="_blank"
                rel="noreferrer noopener"
              >
                BC PST-308 PST on Vehicles
              </a>
            </li>
            <li>
              <a
                className="link-accent"
                href="https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-specific-situations/motor-vehicles.html"
                target="_blank"
                rel="noreferrer noopener"
              >
                CRA GST/HST on motor vehicles (trade-in)
              </a>
            </li>
            <li>
              <a className="link-accent" href={readmeUrl} target="_blank" rel="noreferrer noopener">
                README on GitHub
              </a>
            </li>
          </ul>
        </div>
        <p className="text-muted">{t("methodology.disclaimer")}</p>
      </div>
    </section>
  );
}
