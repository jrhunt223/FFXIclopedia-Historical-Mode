# FFXIclopedia Historical Mode

A small cross-browser WebExtension for browsing **FFXIclopedia as it existed before a chosen date**.

Default preset: **FFXI historical wiki data (Phoenix XI)** — cutoff **before November 19, 2007**.

For example, if the current page is:

`https://ffxiclopedia.fandom.com/wiki/Sororo`

the extension asks FFXIclopedia's MediaWiki API for the newest revision strictly before the configured cutoff. With the default cutoff, that resolves Sororo to the October 15, 2007 revision (`oldid=362000`) rather than any November 19+ revision.

## What it does

- Automatically resolves normal FFXIclopedia article pages to their historical revision.
- Keeps internal FFXIclopedia navigation in historical mode.
- Uses an **exclusive** cutoff: "2007-11-19" means all edits on Nov 19 are excluded.
- Blocks current/newer article content when no pre-cutoff revision exists instead of silently showing modern data.
- Shows a small revision/cutoff badge on historical pages.
- Lets you view the current version of a single page as a one-time bypass.
- Caches revision lookups locally for faster browsing.
- Does not collect browsing data or send anything to a third-party service. It only calls FFXIclopedia's own MediaWiki API.

## Install locally (Chrome)

1. Unzip the release.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Pin **FFXIclopedia Historical Mode** if you want quick access to the cutoff controls.

## Install locally (Firefox)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `manifest.json` from the extracted release folder.
4. For permanent installation, install the Mozilla-signed release from addons.mozilla.org once published.

## Install locally (Microsoft Edge)

1. Unzip the release.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.

## Change the cutoff

Click the extension icon and set:

**Show revisions strictly before:** `YYYY-MM-DD`

Then click **Save & reload page**.

The default preset is **FFXI historical wiki data (Phoenix XI)** using `2007-11-19`, which means the latest revision from Nov 18, 2007 or earlier. Use **Reset to Phoenix XI default** at any time to restore the default date and settings.

## Distribution

The release ZIP has `manifest.json` at its root and is suitable as source for:

- Chrome/Chromium "Load unpacked" after extraction.
- Microsoft Edge "Load unpacked" after extraction.
- Firefox temporary loading through `about:debugging`.
- Store submission packaging for Chrome Web Store, Microsoft Edge Add-ons, and Mozilla Add-ons (AMO), subject to each store's review requirements.

Chrome/Edge do not generally install arbitrary unsigned ZIP files directly for ordinary users, and Firefox release builds require Mozilla signing for permanent installation. For easy public installation, publish the same release through the Chrome Web Store, Microsoft Edge Add-ons, and Mozilla Add-ons (AMO).

## Permissions

- `storage` — saves enabled state, cutoff date, badge preference, and the revision lookup cache.
- `activeTab` — lets the popup reload or temporarily bypass historical mode on the page you are viewing.
- Host access to `https://ffxiclopedia.fandom.com/*` — needed to resolve revision IDs and operate on FFXIclopedia pages.

No broad web access is requested.

## Technical behavior

The extension uses the MediaWiki Action API `prop=revisions` query with:

- `rvdir=older`
- `rvlimit=1`
- `rvstart=<one second before the cutoff date>`

It then navigates to the returned `oldid`.

## Notes / limitations

- This reproduces the practical workflow of selecting an old page revision. MediaWiki/Fandom may still render some transcluded templates or site chrome using newer versions.
- Search and special pages are not time-locked. Search normally, then click a result; the article result will be resolved to the historical revision.
- History/diff/edit utility views are left alone intentionally.
- A page that did not exist before the cutoff is blocked with a "No historical page shown" screen, with an explicit one-time option to view the modern page.

## Browser compatibility

The manifest includes both Chromium Manifest V3 `background.service_worker` and Firefox `background.scripts` declarations. It also includes the Mozilla extension ID and a `data_collection_permissions` declaration of `none` for AMO signing.

## License

MIT. See `LICENSE`.
