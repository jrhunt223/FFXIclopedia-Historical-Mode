const DEFAULTS = {
  enabled: true,
  cutoff: "2007-11-19",
  showBadge: true
};

const PRESETS = new Set([
  "2002-05-16",
  "2004-09-16",
  "2006-04-20",
  "2007-11-20",
  "2013-03-26",
  "2015-05-14"
]);

const enabled = document.getElementById("enabled");
const cutoff = document.getElementById("cutoff");
const showBadge = document.getElementById("showBadge");
const customPreset = document.getElementById("customPreset");
const presetInputs = [...document.querySelectorAll('input[name="preset"]')];
const status = document.getElementById("status");

function selectPresetForDate(value) {
  const match = presetInputs.find(input => input.value === value);
  if (match) {
    match.checked = true;
  } else {
    customPreset.checked = true;
  }
}

async function load() {
  const settings = await chrome.storage.sync.get(DEFAULTS);
  enabled.checked = settings.enabled ?? true;
  cutoff.value = settings.cutoff || DEFAULTS.cutoff;
  showBadge.checked = settings.showBadge ?? true;
  selectPresetForDate(cutoff.value);
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

presetInputs.forEach(input => {
  input.addEventListener("change", () => {
    if (!input.checked || input.value === "custom") return;
    cutoff.value = input.value;
  });
});

cutoff.addEventListener("input", () => {
  selectPresetForDate(cutoff.value);
});

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
  selectPresetForDate(DEFAULTS.cutoff);

  await chrome.storage.sync.set(DEFAULTS);
  await chrome.storage.local.clear();

  const tab = await activeTab();
  if (tab?.id) await chrome.tabs.reload(tab.id);
  status.textContent = "Reset to Phoenix XI default: November 19, 2007.";
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
