import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle.jsx";

export default function Header({ repoUrl }) {
  const { t } = useTranslation();

  return (
    <header className="header-bar">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold text-heading">
          <Logo />
          <span className="text-sm sm:text-base">{t("header.title")}</span>
        </a>
        <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 text-sm">
          <ThemeToggle />
          <a href="#methodology" className="hidden text-body hover:text-heading sm:inline">
            {t("header.methodology")}
          </a>
          {repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-full border border-default px-3 py-1.5 text-xs font-medium text-label hover:border-slate-400 hover:text-heading dark:hover:border-slate-500"
            >
              <GitHubIcon />
              {t("header.source")}
            </a>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="1" y="8" width="20" height="10" rx="2" fill="#2563eb" />
      <rect x="4" y="5" width="8" height="4" rx="1" fill="#059669" />
      <circle cx="6" cy="18" r="2" fill="#0f172a" />
      <circle cx="16" cy="18" r="2" fill="#0f172a" />
      <path d="M12 11h5l1 3h-6v-3z" fill="#93c5fd" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}
