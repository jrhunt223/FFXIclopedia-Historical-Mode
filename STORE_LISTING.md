# Store Listing Draft

## Name
FFXIclopedia Historical Mode

## Short description
Browse FFXIclopedia using the newest article revision that existed before a date you choose.

## Detailed description
FFXIclopedia Historical Mode turns normal FFXIclopedia browsing into a historical snapshot.

Choose a cutoff date and the extension automatically resolves each article to the newest revision that existed before that date. It is useful for researching older Final Fantasy XI eras without repeatedly opening each article's History page and manually selecting a revision.

Features:
- configurable exclusive cutoff date
- historical navigation across FFXIclopedia articles
- revision date/cutoff indicator
- one-click current-page bypass
- local revision cache
- fail-closed behavior when no historical revision exists
- no analytics or tracking

Default preset: **FFXI historical wiki data (Phoenix XI)** — before November 19, 2007. Users can select any other cutoff date.

This is an unofficial community utility and is not affiliated with Fandom, Square Enix, or the FFXIclopedia operators.

## Single purpose
Automatically display FFXIclopedia article revisions from before a user-selected historical cutoff date.

## Permission justification
storage:
Stores the cutoff date, enabled state, badge preference, and locally cached revision lookup results.

activeTab:
Used only when the user clicks the popup controls to reload the current page or request a one-time current-page bypass.

ffxiclopedia.fandom.com host permission:
Required to inspect FFXIclopedia pages and query FFXIclopedia's MediaWiki API for historical revision IDs.

## Firefox / AMO notes

- Manifest V3 extension ID: `ffxiclopedia-historical-mode@jrhunt223.github.io`
- Declared data collection: `none`
- Uses `background.scripts` in Firefox and `background.service_worker` in Chromium.
- No remote code, analytics, advertising, or telemetry.
