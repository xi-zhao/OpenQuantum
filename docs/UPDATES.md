# OpenQuantum updates

**Settings → Updates** shows the installed OpenQuantum version, last check and release notes.
The OpenQuantum sidebar update button also opens this view. Reminders offer **Remind me tomorrow** and
**Skip this version** in the workbench's selected language. The Desktop title-bar **Check for updates**
command checks the original DSH Desktop client through its upstream service. Settings identifies the OpenQuantum product version separately from
the pinned Desktop dependency.

## Discovery and reminders

The Host checks after the first minute, then at most once every 24 hours across restarts. Manual
checks share one in-flight request and a one-minute cooldown. Offline checks time out without
interrupting tasks. A release is announced once per installation; snoozing permits another reminder
the next day, while skipping affects only that version. Preferences and the last verified manifest
live in `$DSH_HOME/updates/openquantum.json`, shared by Web and Desktop.

Turn automatic checking off in Settings to keep manual checks available. Administrators can set
`OPENQUANTUM_UPDATE_CHECK=0` to prevent background requests. `OPENQUANTUM_UPDATE_FEED_URL` selects an
operator-controlled HTTPS mirror with the same manifest contract; a remote browser cannot edit it.
Checks send no credentials, installation identifier, conversations or course content.

The default feed is the `openquantum-update.json` asset of the latest GitHub Release. A missing
asset, including a repository without releases, means no published update is available yet. A
temporary failure never erases the last verified manifest. The status distinguishes a failed check
from a confirmed current version; the timestamp remains visible.

## Upgrading

OpenQuantum content updates and original DSH Desktop updates are separate. OpenQuantum capability packages and the Codex plugin share one product version; the original client retains its upstream version.
The OpenQuantum service only offers release notes and upgrade instructions; it does not download, install or restart the client.

For an installed capability package, quit the Host, back up the OpenQuantum data directory, verify and extract the new capability archive, then run its installer. Keep the original DSH Desktop on the compatible version named in the release notes. See [installation and migration](DESKTOP_INSTALLERS.md).
Version 0.8.2 and later use capability archives with the original DSH Desktop client. The old private OpenQuantum DMG/EXE packages are no longer the installation path; their Git tags and source history remain available.

For a source installation:

1. Finish active tasks and stop the Host. Back up `.openquantum/dsh`, `.env` and learning data using
   the [deployment](DEPLOYMENT.md) and [learning](integrations/OPENMAIC.md) instructions.
2. Check `git status` and preserve local changes. Fetch tags with `git fetch origin --tags`; review
   the chosen release and its notes. Use a clean checkout of that tag, or integrate it into your
   maintained branch. Do not overwrite a dirty working tree.
3. Run `npm ci`. Desktop users also run `npm run desktop:setup` and `npm run desktop:verify-install`.
   Follow the release notes for additional capability or learning dependency setup.
4. Start OpenQuantum and verify its product version in **Settings → Updates**.

For hosted Web or Docker installations, the administrator updates the deployment from the selected
release and retains its data volumes. A browser user does not replace the server from Settings.
Switching between Web and Desktop continues to require stopping the other entry point first.

## Publishing a stable update

Starting with 0.8.1, Desktop, the Codex plugin and its installer share one OpenQuantum product version.
The root `package.json` is authoritative; the two distribution manifests and all three lockfiles
carry the same version. Pinned third-party dependencies retain their own version numbers.
The `vX.Y.Z` and `codex-vX.Y.Z` tags distinguish release channels, not product versions. Synchronized
releases point both tags at the same reviewed commit. A product version does not require both channels to be published.

Version 0.8.3 uses both `v0.8.3` and `codex-v0.8.3` at the same reviewed commit.
The exact source commit and package checksums are recorded in each Release's `release-validation.json`.
Once both releases are public, GitHub latest points to `v0.8.3`,
which carries the capability archives and `openquantum-update.json`; the Codex Release is not latest.
This keeps Desktop/Web update discovery on the capability-package channel. Git tags, source history
and previous `codex-v*` releases are retained. The steps below apply when both channels are published.
The shared release command and packaging guards currently accept plain stable `X.Y.Z` only,
without prerelease suffixes or build metadata, matching the supported synchronized release pipeline.

1. Run `npm run release:version -- X.Y.Z` to update all six manifests/lockfiles together, then update
   the shared release notes and current download links. Review dependency compatibility and migration
   notes, run `npm run release:check`, and merge the reviewed change. `npm run check` and both package
   builders reject mismatched product versions. The version command does not change dependencies.
2. Wait for CI and all three `DSH capability packages` jobs at that exact commit to pass. Download
   their capability archives and `SHA256SUMS` artifacts; verify each hash and combine the three checksum lines
   into one `SHA256SUMS`. Preserve the archive filenames, versions and bytes.
3. Create the matching `vX.Y.Z` tag at that commit. Prepare a draft Release with user-facing notes,
   all three capability archives and the combined checksum file, verify the uploaded assets, then publish it
   as a non-prerelease. Link the compatible original upstream client; do not relabel its version or signature.

   If local large-file transfers are unreliable, manually run `release-artifacts.yml` with the tag,
   successful push CI run ID and successful push installer run ID. It requires the same source commit,
   an existing draft Release, all seven successful jobs and the three exact capability-archive checksums. It
   uploads from GitHub runners, preserves matching existing assets and rejects mismatches. Upload the
   combined `SHA256SUMS` and any validation records separately, then verify all remote assets before
   publishing. This workflow does not create a Release, publish it or change `latest`.
4. `release-updates.yml` runs the same quality, macOS/Windows Desktop installation and container gates
   as CI against the release revision. Only after all gates pass does it attach `openquantum-update.json`.
   Ordinary pushes, draft releases and prereleases do not publish this stable update asset.
5. Verify the asset and a client check. Mark the intended Desktop release as latest on GitHub. Re-running
   the job regenerates the same manifest from the tag and publication date; it does not create another release.
6. From that same clean commit, build and verify the [Codex packages](integrations/CODEX_PLUGIN.md),
   then publish `codex-vX.Y.Z` with the shared release notes, checksums and its validation record.
   When publishing both channels, set the Codex Release to **not latest** so the Desktop update feed
   continues to resolve the Desktop Release. For a Codex-only release, mark that Release latest and
   omit the Desktop update manifest. Confirm every published package reports X.Y.Z and references
   the reviewed source commit.

To inspect a manifest locally without publishing:

```bash
node scripts/build-update-manifest.mjs --tag v0.6.0 --published-at 2026-09-29T00:00:00Z --output .openquantum/release/openquantum-update.json
```

Use the actual version and publication date. The generator rejects mismatched tags and prerelease
versions. It records the OpenQuantum version, pinned Harness/Desktop compatibility versions and
notes/upgrade URLs. `artifacts` remains empty for the current unsigned test builds; their downloads
and SHA-256 checksums are attached to the Release. The reserved manifest entries will describe
verified, signed installers; an entry alone cannot enable installation.

## Ownership and validation

- `src/updates/release.mjs`: bounded manifest, HTTPS redirects and semantic-version comparison,
  shared by the generator and reader. Unknown schema/product/channel and invalid metadata fail closed.
- `src/updates/service.mjs`: discovery, coalescing, caching, reminders and persistence; no Agent,
  Session, installer or restart operations.
- `runtime/openquantum/web-updates`: deployment-scoped Host routes and a Harness Client Plugin using
  the existing settings and sidebar slots. Browsers call only same-origin bounded routes.
- The original `desktop-updates` plugin and `/api/desktop/updates/check` route remain owned by DSH Desktop. OpenQuantum registers only `/openquantum/api/updates`; neither update channel impersonates the other.
- Copy uses `settings.openquantumUpdates` in the existing ten-language catalog and language preference.

Run `node --test tests/updates.test.mjs tests/update-client.test.mjs tests/desktop-integration.test.mjs`
and `npm run locales:check`. CI includes these through its normal test entry point. Capability installation checks must cover archive verification, configuration retention and the pinned original client. Native UI checks remain separate from content-install tests.
