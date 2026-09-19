import { dictionariesFor, languages } from "./catalog.mjs";

export const inject = ["locale"];
export function apply(ctx) {
  // The existing Language row, preference persistence and render subscriptions
  // remain owned by Harness. A language pack contributes only catalog entries.
  ctx.effect(() => {
    const dispose = [];
    for (const language of languages) {
      for (const [namespace, dictionary] of Object.entries(dictionariesFor(language.id))) {
        dispose.push(ctx.locale.register(namespace, language.id, dictionary));
      }
    }
    for (const language of languages.filter(({ id }) => !["zh", "en"].includes(id))) {
      dispose.push(ctx.locale.addLanguage({ id: language.id, label: language.label, fallback: "en" }));
    }
    const root = document.documentElement;
    const previousDirection = root.getAttribute("dir");
    const sync = () => {
      const language = languages.find(({ id }) => id === ctx.locale.getSnapshot().active);
      root.dir = language?.direction ?? "ltr";
    };
    sync();
    dispose.push(ctx.locale.subscribe(sync));
    return () => {
      for (const cleanup of dispose.reverse()) cleanup();
      if (previousDirection === null) root.removeAttribute("dir");
      else root.setAttribute("dir", previousDirection);
    };
  }, "openquantum: language packs and writing direction");
}
