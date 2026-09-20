# OpenQuantum updates

**Settings → Updates** shows the installed OpenQuantum version, last check and release notes.
The sidebar update button also opens this view. Reminders offer **Remind me tomorrow** and
**Skip this version** in the workbench's selected language. The Desktop title-bar **Check for updates**
command uses the same service; its frame version still identifies the Desktop dependency.

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

This edition provides discovery and reminders. Native installers are not yet published; it does not
download, install or restart applications. **View release notes** and **Upgrade guide** link to the
selected release, keeping instructions tied to the version being offered.

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

1. Bump the OpenQuantum version in `package.json` and `package-lock.json`, review dependency compatibility
   and migration notes, then merge the reviewed release change.
2. Create the matching `vX.Y.Z` tag and publish a non-prerelease GitHub Release with user-facing notes.
3. `release-updates.yml` runs the same quality, macOS/Windows Desktop installation and container gates
   as CI against the release revision. Only after all gates pass does it attach `openquantum-update.json`.
   Ordinary pushes, draft releases and prereleases do not publish this stable update asset.
4. Verify the asset and a client check. Mark the intended release as latest on GitHub. Re-running the
   job regenerates the same manifest from the tag and publication date; it does not create another release.

To inspect a manifest locally without publishing:

```bash
node scripts/build-update-manifest.mjs --tag v0.4.0 --published-at 2026-09-20T00:00:00Z --output .openquantum/release/openquantum-update.json
```

Use the actual version and publication date. The generator rejects mismatched tags and prerelease
versions. It records the OpenQuantum version, pinned Harness/Desktop compatibility versions and
notes/upgrade URLs. `artifacts` stays empty until verified native installers exist. Future entries
carry platform, architecture, HTTPS URL and SHA-256; an entry alone cannot enable installation.

## Ownership and validation

- `src/updates/release.mjs`: bounded manifest, HTTPS redirects and semantic-version comparison,
  shared by the generator and reader. Unknown schema/product/channel and invalid metadata fail closed.
- `src/updates/service.mjs`: discovery, coalescing, caching, reminders and persistence; no Agent,
  Session, installer or restart operations.
- `runtime/openquantum/web-updates`: deployment-scoped Host routes and a Harness Client Plugin using
  the existing settings and sidebar slots. Browsers call only same-origin bounded routes.
- The deployment disables the upstream `desktop-updates` plugin, whose feed distributes DSH installers.
  Its public `/api/desktop/updates/check` route becomes a tested adapter into the OpenQuantum service,
  retaining the pinned Desktop's `{accepted:true}` contract. No private Electron-runtime access or
  upstream edits are needed. Recheck this public contract when upgrading Desktop.
- Copy uses `settings.openquantumUpdates` in the existing ten-language catalog and language preference.

Run `node --test tests/updates.test.mjs tests/update-client.test.mjs tests/desktop-integration.test.mjs`
and `npm run locales:check`. CI includes these through its normal test entry point. Future native
installation must add signed packaging, artifact verification and data migration tests, and wait
for the user's restart choice after active tasks finish.
