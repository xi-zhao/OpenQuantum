import languages from "./languages.json" with { type: "json" };
import source from "./harness-source.json" with { type: "json" };
import own from "./openquantum-source.json" with { type: "json" };
import ja from "./locales/ja.json" with { type: "json" };
import ko from "./locales/ko.json" with { type: "json" };
import es from "./locales/es.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import de from "./locales/de.json" with { type: "json" };
import pt from "./locales/pt.json" with { type: "json" };
import ru from "./locales/ru.json" with { type: "json" };
import ar from "./locales/ar.json" with { type: "json" };
import reviewed from "./reviewed.json" with { type: "json" };
import { OPENQUANTUM_BRAND } from "../../../packages/openquantum-web-branding/identity.mjs";

export { languages };
export const translations = { ja, ko, es, fr, de, pt, ru, ar };
export const sources = { ...source, ...own };

/** Dictionaries enter the existing Harness LocaleRuntime, with English fallback. */
export function dictionariesFor(id) {
  const dictionaries = Object.fromEntries(Object.entries(sources).filter(([, entry]) => id !== "en" && id !== "zh" || entry.package === "openquantum")
    .map(([namespace, entry]) => [namespace, id === "zh" ? entry.zh : Object.fromEntries(Object.entries(entry.en)
      .map(([key, value]) => [key, reviewed[value]?.[id] ?? translations[id]?.[value] ?? value]))]));
  if (dictionaries.conversation) {
    dictionaries.conversation["hero.headline"] = OPENQUANTUM_BRAND.tagline[id] ?? OPENQUANTUM_BRAND.tagline.en;
    dictionaries.conversation["hero.preview"] = "";
  }
  return dictionaries;
}
