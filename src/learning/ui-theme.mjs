// Presentation-only channel; it grants no library, model or settings commands.
export const THEME_CHANNEL = "openquantum.learning.theme.v1";
export const THEME_TOKENS = Object.freeze({
  "--oq-bg": "--dsw-alias-bg-base",
  "--oq-surface": "--dsw-alias-bg-layer-1",
  "--oq-popover": "--dsw-alias-bg-layer-3",
  "--oq-module": "--dsw-alias-bg-module-platform",
  "--oq-fg": "--dsw-alias-label-primary",
  "--oq-text-secondary": "--dsw-alias-label-secondary",
  "--oq-text-muted": "--dsw-alias-label-tertiary",
  "--oq-caption": "--dsw-alias-label-caption",
  "--oq-border": "--dsw-alias-border-l2",
  "--oq-border-soft": "--dsw-alias-border-l1",
  "--oq-primary": "--dsw-alias-button-primary-fill",
  "--oq-on-primary": "--dsw-alias-label-primary-foreground",
  "--oq-primary-hover": "--dsw-alias-button-primary-hover",
  "--oq-hover": "--dsw-alias-interactive-bg-hover-solid",
  "--oq-selected": "--dsw-specific-sidebar-nav-item-active",
  "--oq-sidebar": "--dsw-specific-sidebar-fill",
  "--oq-accent": "--dsw-alias-brand-primary-new-colorprimary-new-color",
  "--oq-danger": "--dsw-alias-state-error-primary",
  "--oq-font": "--dsw-font-family",
  "--oq-code-font": "--ds-font-family-code",
});

function fromPeer(event, source, origin, type) {
  return Boolean(source && event.source === source && event.origin === origin &&
    event.data?.channel === THEME_CHANNEL && event.data.type === type);
}

export function acceptsThemeRequest(event, source, origin) {
  return fromPeer(event, source, origin, "ready");
}

function tokensFrom(values) {
  return Object.fromEntries(Object.keys(THEME_TOKENS).flatMap((name) => {
    const value = values?.[name];
    // Only scalar theme values, never arbitrary selectors, URLs or declarations.
    return typeof value === "string" && value.length <= 512 && value.trim() &&
      !/[;{}<>\\]|url\s*\(/i.test(value) ? [[name, value.trim()]] : [];
  }));
}

export function createThemeMessage(colorScheme, readToken) {
  return {
    channel: THEME_CHANNEL, type: "theme", colorScheme,
    tokens: tokensFrom(Object.fromEntries(Object.entries(THEME_TOKENS).map(([name, source]) => [name, readToken(source)]))),
  };
}

export function readThemeMessage(event, source, origin) {
  if (!fromPeer(event, source, origin, "theme") || !["light", "dark"].includes(event.data.colorScheme)) return null;
  return { colorScheme: event.data.colorScheme, tokens: tokensFrom(event.data.tokens) };
}
