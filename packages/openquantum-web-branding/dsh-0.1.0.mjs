// DSH Desktop 2.0.0 / Harness 0.1.0-rc.6 has no brand Slots. This
// version adapter owns the upstream decorative selectors. It is applied
// through tapIndex without removing React nodes or replacing native callbacks.
// Validate both selectors against the pinned client packages when upgrading.
export const legacyBrandStyles = `
  /* 2.0.0 has no brand slots. Style its two decorative marks through tapIndex;
     keep the original buttons, handlers and React-owned SVG nodes intact. */
  :root { --oq-lockup: url("/openquantum/lockup.svg"); --oq-mark: url("/openquantum/mark.svg"); }
  :root[style*="color-scheme: dark"] { --oq-lockup: url("/openquantum/lockup-inverse.svg"); --oq-mark: url("/openquantum/mark-inverse.svg"); }
  [data-slot="sidebar"] button:has(> svg[viewBox="0 0 182 24"]) { background-image: var(--oq-lockup); background-position: left center; background-repeat: no-repeat; background-size: contain; }
  [data-slot="sidebar"] button > svg[viewBox="0 0 182 24"] { visibility: hidden; }
  [data-slot="sidebar"] button:has(> svg[viewBox="0 0 23.16 17.04"]):not(:hover) { background-image: var(--oq-mark); background-position: center; background-repeat: no-repeat; background-size: 24px; }
  [data-slot="sidebar"] button > svg[viewBox="0 0 23.16 17.04"] { visibility: hidden; }
  [data-phase="hero"] span:has(> svg[viewBox="0 0 23.16 17.04"]) { background-image: var(--oq-mark); background-position: center; background-repeat: no-repeat; background-size: contain; }
  [data-phase="hero"] span > svg[viewBox="0 0 23.16 17.04"] { visibility: hidden; }

`;
