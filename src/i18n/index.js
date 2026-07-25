import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./en/common.json";
import enFields from "./en/fields.json";
import enWarnings from "./en/warnings.json";
import enLegal from "./en/legal.json";
import enProvinces from "./en/provinces.json";

const resources = {
  en: {
    common: enCommon,
    fields: enFields,
    warnings: enWarnings,
    legal: enLegal,
    provinces: enProvinces,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en"],
  ns: ["common", "fields", "warnings", "legal", "provinces"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = "en-CA";
  document.documentElement.dir = "ltr";
}

export default i18n;
