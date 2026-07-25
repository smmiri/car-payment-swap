import { useTranslation } from "react-i18next";

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section id="top" className="hero-gradient">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          {t("hero.badge")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-heading sm:text-4xl">{t("hero.title")}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-body sm:text-lg">{t("hero.p1")}</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          <span className="font-medium text-label">{t("hero.modelLabel")}</span> {t("hero.p2")}
        </p>
      </div>
    </section>
  );
}
