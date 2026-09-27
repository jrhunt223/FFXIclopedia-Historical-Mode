const CACHE_VERSION = "v1.0.4";

const DEFAULTS = {
  enabled: true,
  cutoff: "2007-11-19",
  showBadge: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(DEFAULTS);
  await chrome.storage.sync.set({
    enabled: current.enabled ?? DEFAULTS.enabled,
    cutoff: current.cutoff || DEFAULTS.cutoff,
    showBadge: current.showBadge ?? DEFAULTS.showBadge
  });
});

function cutoffStartTimestamp(cutoff) {
  const d = new Date(`${cutoff}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid cutoff date.");
  d.setUTCSeconds(d.getUTCSeconds() - 1);
  return d.toISOString().replace(".000Z", "Z");
}

function pagesFromResponse(data) {
  if (!data || !data.query || !data.query.pages) return [];
  return Array.isArray(data.query.pages)
    ? data.query.pages
    : Object.values(data.query.pages);
}

async function apiFetch(params) {
  const url = new URL("https://ffxiclopedia.fandom.com/api.php");
  const merged = {
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params
  };
  for (const [key, value] of Object.entries(merged)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`FFXIclopedia API returned HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.info || data.error.code || "FFXIclopedia API error");
  }
  return data;
}

async function resolveRevision(title, cutoff) {
  const cacheKey = `${CACHE_VERSION}|revision|${cutoff}|${title}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) return cached[cacheKey];

  const data = await apiFetch({
    action: "query",
    prop: "revisions",
    titles: title,
    rvprop: "ids|timestamp",
    rvlimit: "1",
    rvdir: "older",
    rvstart: cutoffStartTimestamp(cutoff)
  });

  const page = pagesFromResponse(data)[0];
  let result;

  if (!page || page.missing === true || page.missing === "") {
    result = {
      found: false,
      missing: true,
      requestedTitle: title,
      title: page?.title || title
    };
  } else {
    const revision = page.revisions?.[0];
    if (!revision) {
      // The page exists, but nothing exists before the selected era cutoff.
      // Resolve the oldest revision so modern/current retail content is never
      // silently shown as a fallback.
      const oldestData = await apiFetch({
        action: "query",
        prop: "revisions",
        titles: page.title || title,
        rvprop: "ids|timestamp",
        rvlimit: "1",
        rvdir: "newer",
        rvstart: "2001-01-01T00:00:00Z"
      });
      const oldestPage = pagesFromResponse(oldestData)[0];
      const oldestRevision = oldestPage?.revisions?.[0];

      if (oldestRevision) {
        result = {
          found: true,
          fallback: true,
          requestedTitle: title,
          title: oldestPage.title || page.title || title,
          revid: oldestRevision.revid,
          parentid: oldestRevision.parentid,
          timestamp: oldestRevision.timestamp
        };
      } else {
        result = {
          found: false,
          missing: false,
          requestedTitle: title,
          title: page.title || title
        };
      }
    } else {
      result = {
        found: true,
        fallback: false,
        requestedTitle: title,
        title: page.title || title,
        revid: revision.revid,
        parentid: revision.parentid,
        timestamp: revision.timestamp
      };
    }
  }

  await chrome.storage.local.set({ [cacheKey]: result });
  return result;
}

async function revisionInfo(revid) {
  const cacheKey = `revid|${revid}`;
  const cached = await chrome.storage.local.get(cacheKey);
  if (cached[cacheKey]) return cached[cacheKey];

  const data = await apiFetch({
    action: "query",
    prop: "revisions",
    revids: String(revid),
    rvprop: "ids|timestamp"
  });

  const page = pagesFromResponse(data)[0];
  const revision = page?.revisions?.[0];

  if (!page || !revision) {
    return { found: false, revid: Number(revid) };
  }

  const result = {
    found: true,
    title: page.title,
    revid: revision.revid,
    timestamp: revision.timestamp
  };
  await chrome.storage.local.set({ [cacheKey]: result });
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "getSettings") {
      const settings = await chrome.storage.sync.get(DEFAULTS);
      sendResponse({ ok: true, ...settings });
      return;
    }

    if (message?.type === "resolveRevision") {
      const result = await resolveRevision(message.title, message.cutoff);
      sendResponse({ ok: true, result });
      return;
    }

    if (message?.type === "revisionInfo") {
      const result = await revisionInfo(message.revid);
      sendResponse({ ok: true, result });
      return;
    }

    if (message?.type === "clearCache") {
      await chrome.storage.local.clear();
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message." });
  })().catch((error) => {
    sendResponse({ ok: false, error: error?.message || String(error) });
  });

  return true;
});
