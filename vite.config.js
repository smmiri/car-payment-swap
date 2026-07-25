import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const PLACEHOLDER_HOST = "https://swapmycar.smmiri.com";

/**
 * Replace the placeholder canonical URL in index.html, robots.txt, and
 * sitemap.xml with the value of `VITE_SITE_URL` at build time.
 */
function siteUrlSubstitution(siteUrl) {
  if (!siteUrl || siteUrl === PLACEHOLDER_HOST) return null;
  const trimmed = siteUrl.replace(/\/$/, "");
  const replace = (s) => s.split(PLACEHOLDER_HOST).join(trimmed);
  return {
    name: "site-url-substitution",
    apply: "build",
    transformIndexHtml: (html) => replace(html),
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === "asset" && typeof file.source === "string") {
          file.source = replace(file.source);
        }
      }
    },
    closeBundle() {},
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE || "/";
  return {
    base,
    plugins: [react(), tailwindcss(), siteUrlSubstitution(env.VITE_SITE_URL)].filter(Boolean),
  };
});
