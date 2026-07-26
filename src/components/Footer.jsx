import { Trans, useTranslation } from "react-i18next";
import { RULES_AS_OF } from "../lib/site-meta.js";

const codeClass = "rounded bg-slate-100 px-1 dark:bg-slate-800";

const CV_SITE_URL = "https://smmiri.com";

export default function Footer({ repoUrl }) {
  const { t } = useTranslation("legal");

  return (
    <footer className="border-t border-default bg-surface-card">
      <div className="content-width space-y-8 py-8 text-xs text-muted">
        <p className="max-w-3xl leading-relaxed">
          <Trans
            ns="legal"
            i18nKey="disclaimer"
            components={{ strong: <strong className="font-semibold text-label" /> }}
          />
        </p>

        <nav aria-label={t("navLegal")} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label">
          <a href="#privacy" className="hover:text-heading">
            {t("privacy")}
          </a>
          <a href="#terms" className="hover:text-heading">
            {t("terms")}
          </a>
          {repoUrl ? (
            <a href={repoUrl} className="hover:text-heading" target="_blank" rel="noreferrer noopener">
              {t("github")}
            </a>
          ) : null}
          <a href={CV_SITE_URL} className="hover:text-heading" target="_blank" rel="noreferrer noopener">
            {t("author")}
          </a>
          <span aria-hidden>·</span>
          <span>{t("mit")}</span>
        </nav>

        <section id="privacy" className="max-w-3xl scroll-mt-20 space-y-2 leading-relaxed">
          <h2 className="text-sm font-semibold text-heading">{t("privacyTitle")}</h2>
          <p>
            <Trans
              ns="legal"
              i18nKey="privacyP1"
              components={{
                strong: <strong />,
                code: <code className={codeClass} />,
              }}
            />
          </p>
          <p>{t("privacyP2")}</p>
        </section>

        <section id="terms" className="max-w-3xl scroll-mt-20 space-y-2 leading-relaxed">
          <h2 className="text-sm font-semibold text-heading">{t("termsTitle")}</h2>
          <p>
            <Trans
              ns="legal"
              i18nKey="termsP1"
              values={{ rulesDate: RULES_AS_OF }}
              components={{ strong: <strong className="font-medium text-label" /> }}
            />
          </p>
          <p>{t("termsP2")}</p>
        </section>

        <p className="text-[11px] text-caption">
          <Trans
            ns="legal"
            i18nKey="footerMeta"
            values={{ rulesDate: RULES_AS_OF }}
            components={{ code: <code className={codeClass} /> }}
          />
        </p>
      </div>
    </footer>
  );
}
