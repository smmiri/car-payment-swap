import { useTranslation } from "react-i18next";
import { FIELD_META } from "../lib/defaults.js";

export function useFieldMeta() {
  const { t } = useTranslation("fields");
  const out = {};
  for (const [key, meta] of Object.entries(FIELD_META)) {
    out[key] = {
      ...meta,
      label: t(`${key}.label`, { defaultValue: meta.label }),
      help: t(`${key}.help`, { defaultValue: meta.help }),
    };
  }
  return out;
}
