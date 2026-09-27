const DEFAULTS = {
  enabled: true,
  cutoff: "2007-11-19",
  showBadge: true
};

const enabled = document.getElementById("enabled");
const cutoff = document.getElementById("cutoff");
const showBadge = document.getElementById("showBadge");
const status = document.getElementById("status");

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  enabled.checked = settings.enabled ?? true;
  cutoff.value = settings.cutoff || DEFAULTS.cutoff;
  showBadge.checked = settings.showBadge ?? true;
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

document.getElementById("apply").addEventListener("click", async () => {
  if (!cutoff.value) {
    status.textContent = "Choose a cutoff date.";
    return;
  }

  await chrome.storage.sync.set({
    enabled: enabled.checked,
    cutoff: cutoff.value,
    showBadge: showBadge.checked
  });

  // A changed cutoff invalidates the meaning of cached page resolutions.
  await chrome.storage.local.clear();

  const tab = await activeTab();
  if (tab?.id) await chrome.tabs.reload(tab.id);
  status.textContent = "Saved.";
  setTimeout(() => window.close(), 250);
});

document.getElementById("resetDefault").addEventListener("click", async () => {
  cutoff.value = DEFAULTS.cutoff;
  enabled.checked = DEFAULTS.enabled;
  showBadge.checked = DEFAULTS.showBadge;

  await chrome.storage.sync.set(DEFAULTS);
  await chrome.storage.local.clear();

  const tab = await activeTab();
  if (tab?.id) await chrome.tabs.reload(tab.id);
  status.textContent = "Reset to FFXI historical wiki data (Phoenix XI): November 19, 2007.";
  setTimeout(() => window.close(), 500);
});

document.getElementById("current").addEventListener("click", async () => {
  const tab = await activeTab();
  if (!tab?.id || !tab.url) {
    status.textContent = "Open an FFXIclopedia page first.";
    return;
  }

  let url;
  try { url = new URL(tab.url); } catch {
    status.textContent = "Open an FFXIclopedia page first.";
    return;
  }

  if (url.hostname !== "ffxiclopedia.fandom.com" || !url.pathname.startsWith("/wiki/")) {
    status.textContent = "Open an FFXIclopedia page first.";
    return;
  }

  url.search = "";
  url.searchParams.set("ffxihm", "off");
  await chrome.tabs.update(tab.id, { url: url.toString() });
  window.close();
});

document.getElementById("clearCache").addEventListener("click", async () => {
  await chrome.storage.local.clear();
  status.textContent = "Revision cache cleared.";
});

load().catch(error => {
  status.textContent = error?.message || String(error);
});
