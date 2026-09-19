# OpenQuantum Web Branding

An installable DeepSeek Harness Web plugin that applies the OpenQuantum name,
tagline, logo, browser metadata and PWA manifest through Harness-native host and
client extension seams. It does not replace the Harness Web application.

The Client Plugin fills `sidebar.brand.mark` and `sidebar.brand.name` in both
Web and Desktop, including the collapsed sidebar, and reuses the same mark in
`conversation.hero.brand.mark`. The Host Plugin supplies
the shared assets, styles, product copy and browser metadata through `tapIndex`.
Sidebar branding does not depend on the upstream SVG shape or DOM nesting.

```bash
dsh plugin --profile web add github:xi-zhao/OpenQuantum#path:/packages/openquantum-web-branding
```

The full OpenQuantum quantum-research distribution remains available from the
repository root. This package intentionally exposes only the independently
installable Web branding module.
