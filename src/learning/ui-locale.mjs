import languages from "../../runtime/openquantum/web-locales/languages.json" with { type: "json" };

export const LOCALE_CHANNEL = "openquantum.locale.v1";
export { languages };

export function languageFor(value) {
  return languages.find(({ id, learningLocale }) => value === id || value === learningLocale);
}

function fromPeer(event, source, origin, type) {
  return Boolean(source && event.source === source && event.origin === origin &&
    event.data?.channel === LOCALE_CHANNEL && event.data.type === type);
}

export function acceptsLocaleRequest(event, source, origin) {
  return fromPeer(event, source, origin, "ready");
}

export function createLocaleMessage(locale, type = "locale") {
  const language = languageFor(locale);
  return language ? { channel: LOCALE_CHANNEL, type, locale: language.id } : null;
}

export function readLocaleMessage(event, source, origin, type = "locale") {
  if (!fromPeer(event, source, origin, type)) return null;
  return languageFor(event.data.locale) ?? null;
}
