import { useTranslation } from "react-i18next";
import Calculator from "./components/Calculator.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Methodology from "./components/Methodology.jsx";

const REPO_URL = import.meta.env.VITE_REPO_URL ?? "https://github.com/smmiri/car-payment-swap";

export default function App() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen surface-page antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        {t("skipToContent")}
      </a>
      <Header repoUrl={REPO_URL} />
      <main id="main">
        <Hero />
        <Calculator />
        <section id="methodology" className="content-width pb-12" aria-label="Methodology">
          <Methodology repoUrl={REPO_URL} />
        </section>
      </main>
      <Footer repoUrl={REPO_URL} />
    </div>
  );
}
