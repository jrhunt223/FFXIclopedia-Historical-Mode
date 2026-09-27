(() => {
  const HOST = "ffxiclopedia.fandom.com";
  const DEFAULTS = {
    enabled: true,
    cutoff: "2007-11-19",
    showBadge: true
  };

  let settings = { ...DEFAULTS };
  let historicalModeActive = false;
  let resolverBusy = false;
  let hiddenStyle = null;

  function parseTitle(url = new URL(location.href)) {
    if (url.hostname !== HOST || !url.pathname.startsWith("/wiki/")) return null;
    try {
      return decodeURIComponent(url.pathname.slice("/wiki/".length)).replaceAll("_", " ");
    } catch {
      return url.pathname.slice("/wiki/".length).replaceAll("_", " ");
    }
  }

  function isSpecialTitle(title) {
    return !title || /^Special:/i.test(title);
  }

  function isUtilityView(url) {
    const action = url.searchParams.get("action");
    if (action && action !== "view") return true;
    if (url.searchParams.has("diff")) return true;
    return false;
  }

  function cutoffMs(cutoff) {
    return new Date(`${cutoff}T00:00:00Z`).getTime();
  }

  function encodeTitle(title) {
    return title
      .replaceAll(" ", "_")
      .split("/")
      .map(segment => encodeURIComponent(segment))
      .join("/");
  }

  function historicalUrl(title, revid, hash = "", fallback = false) {
    const url = new URL(`https://${HOST}/wiki/${encodeTitle(title)}`);
    url.searchParams.set("oldid", String(revid));
    if (fallback) url.searchParams.set("ffxihm", "fallback");
    url.hash = hash || "";
    return url.toString();
  }

  function currentUrlForPage(url = new URL(location.href)) {
    const clean = new URL(url.toString());
    clean.search = "";
    clean.searchParams.set("ffxihm", "off");
    return clean.toString();
  }

  function hideCurrentPage() {
    if (hiddenStyle || !document.documentElement) return;
    hiddenStyle = document.createElement("style");
    hiddenStyle.id = "ffxihm-hide";
    hiddenStyle.textContent = `
      html { visibility: hidden !important; }
      #ffxihm-blocker { visibility: visible !important; }
    `;
    document.documentElement.appendChild(hiddenStyle);
  }

  function revealPage() {
    if (hiddenStyle) {
      hiddenStyle.remove();
      hiddenStyle = null;
    }
    if (document.documentElement) {
      document.documentElement.style.removeProperty("visibility");
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return "unknown";
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return timestamp;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short"
    });
  }

  function formatCutoff(cutoff) {
    const d = new Date(`${cutoff}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return cutoff;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
  }

  async function send(message) {
    return await chrome.runtime.sendMessage(message);
  }

  async function getSettings() {
    const response = await send({ type: "getSettings" });
    if (!response?.ok) throw new Error(response?.error || "Could not load extension settings.");
    return {
      enabled: response.enabled ?? DEFAULTS.enabled,
      cutoff: response.cutoff || DEFAULTS.cutoff,
      showBadge: response.showBadge ?? DEFAULTS.showBadge
    };
  }

  function createBadge(info, status = "historical") {
    if (!settings.showBadge) return;
    const install = () => {
      if (!document.body || document.getElementById("ffxihm-badge")) return;

      const badge = document.createElement("div");
      badge.id = "ffxihm-badge";
      badge.style.cssText = `
        position: fixed;
        left: 16px;
        bottom: 16px;
        z-index: 2147483647;
        max-width: 420px;
        padding: 10px 12px;
        border: 1px solid rgba(255, 204, 77, .9);
        border-radius: 9px;
        background: rgba(20, 20, 24, .96);
        color: #fff;
        font: 13px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif;
        box-shadow: 0 4px 18px rgba(0,0,0,.35);
      `;

      const heading = document.createElement("div");
      heading.style.cssText = "font-weight:700;margin-bottom:3px;";
      heading.textContent = status === "bypass"
        ? "FFXIclopedia Historical Viewer — bypassed"
        : status === "fallback"
          ? "FFXIclopedia Historical Viewer — outside selected era"
          : "FFXIclopedia Historical Viewer";
      badge.appendChild(heading);

      const details = document.createElement("div");
      details.style.cssText = "opacity:.92;";
      if (status === "historical") {
        details.textContent =
          `Revision: ${formatDate(info?.timestamp)} • cutoff: before ${formatCutoff(settings.cutoff)}`;
      } else if (status === "fallback") {
        details.textContent =
          `No revision exists before ${formatCutoff(settings.cutoff)}. Showing the oldest available revision instead: ${formatDate(info?.timestamp)}. This page is outside the selected era.`;
        badge.style.borderColor = "rgba(255, 149, 0, .95)";
      } else {
        details.textContent = `Cutoff remains before ${formatCutoff(settings.cutoff)}.`;
      }
      badge.appendChild(details);

      if (status === "historical") {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "View current page once";
        button.style.cssText = `
          margin-top:8px;padding:5px 8px;border:0;border-radius:6px;
          cursor:pointer;background:#fff;color:#111;font:inherit;
        `;
        button.addEventListener("click", () => {
          location.href = currentUrlForPage();
        });
        badge.appendChild(button);
      }

      document.body.appendChild(badge);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
      install();
    }
  }

  function blockPage(title, reason) {
    const install = () => {
      revealPage();
      if (!document.body) return;

      const style = document.createElement("style");
      style.textContent = `
        body > *:not(#ffxihm-blocker) { display: none !important; }
        #ffxihm-blocker {
          display:flex !important;
          visibility:visible !important;
          min-height:100vh;
          align-items:center;
          justify-content:center;
          box-sizing:border-box;
          padding:32px;
          background:#111318;
          color:#f5f5f5;
          font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        }
        #ffxihm-blocker .card {
          width:min(680px, 100%);
          padding:28px;
          border-radius:14px;
          background:#1b1e25;
          border:1px solid #454a57;
          box-shadow:0 12px 40px rgba(0,0,0,.35);
        }
        #ffxihm-blocker h1 { margin:0 0 12px; font-size:22px; }
        #ffxihm-blocker p { line-height:1.55; }
        #ffxihm-blocker button {
          margin-top:12px;padding:9px 12px;border:0;border-radius:7px;
          cursor:pointer;background:#fff;color:#111;font:inherit;font-weight:600;
        }
      `;
      document.documentElement.appendChild(style);

      const blocker = document.createElement("div");
      blocker.id = "ffxihm-blocker";

      const card = document.createElement("div");
      card.className = "card";

      const h1 = document.createElement("h1");
      h1.textContent = "No historical page shown";
      card.appendChild(h1);

      const p1 = document.createElement("p");
      p1.textContent = title
        ? `“${title}” cannot be displayed under the current historical cutoff.`
        : "This page cannot be displayed under the current historical cutoff.";
      card.appendChild(p1);

      const p2 = document.createElement("p");
      p2.textContent = reason;
      card.appendChild(p2);

      const p3 = document.createElement("p");
      p3.textContent = `Historical Viewer is configured to show only revisions from before ${formatCutoff(settings.cutoff)}.`;
      card.appendChild(p3);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "View current page once";
      button.addEventListener("click", () => {
        location.href = currentUrlForPage();
      });
      card.appendChild(button);

      blocker.appendChild(card);
      document.body.appendChild(blocker);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
      install();
    }
  }

  async function resolveAndNavigate(title, hash = "") {
    const response = await send({
      type: "resolveRevision",
      title,
      cutoff: settings.cutoff
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Could not resolve historical revision.");
    }

    const result = response.result;
    if (!result?.found) {
      blockPage(
        result?.title || title,
        result?.missing
          ? "FFXIclopedia reports that this page does not exist."
          : "No revision of this page exists before the selected cutoff date."
      );
      return false;
    }

    const target = historicalUrl(result.title || title, result.revid, hash, Boolean(result.fallback));
    if (target !== location.href) {
      location.replace(target);
      return true;
    }
    return false;
  }

  async function handleHistoricalPage(url, title) {
    const oldid = url.searchParams.get("oldid");
    if (!oldid) return false;

    const response = await send({ type: "revisionInfo", revid: oldid });
    if (!response?.ok) throw new Error(response?.error || "Could not inspect historical revision.");

    const info = response.result;
    if (!info?.found) {
      blockPage(title, `Revision ${oldid} could not be found.`);
      return true;
    }

    if (new Date(info.timestamp).getTime() >= cutoffMs(settings.cutoff)) {
      await resolveAndNavigate(info.title || title, url.hash);
      return true;
    }

    historicalModeActive = true;
    revealPage();
    createBadge(info, "historical");
    return true;
  }

  function shouldInterceptLink(anchor) {
    if (!anchor?.href) return false;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return false; }
    if (url.hostname !== HOST || !url.pathname.startsWith("/wiki/")) return false;
    const title = parseTitle(url);
    if (isSpecialTitle(title) || isUtilityView(url)) return false;
    if (url.searchParams.get("ffxihm") === "off") return false;
    if (url.searchParams.has("oldid")) return false;
    return true;
  }

  function installLinkInterceptor() {
    document.addEventListener("click", async (event) => {
      if (!settings.enabled || resolverBusy) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = event.target?.closest?.("a[href]");
      if (!shouldInterceptLink(anchor)) return;

      const url = new URL(anchor.href, location.href);
      const title = parseTitle(url);
      if (!title) return;

      event.preventDefault();
      resolverBusy = true;
      try {
        const response = await send({
          type: "resolveRevision",
          title,
          cutoff: settings.cutoff
        });

        if (!response?.ok) throw new Error(response?.error || "Could not resolve historical revision.");

        const result = response.result;
        if (result?.found) {
          location.href = historicalUrl(result.title || title, result.revid, url.hash, Boolean(result.fallback));
        } else {
          location.href = url.toString();
        }
      } catch (error) {
        location.href = url.toString();
      } finally {
        resolverBusy = false;
      }
    }, true);
  }

  async function main() {
    const url = new URL(location.href);
    const title = parseTitle(url);

    if (isSpecialTitle(title) || isUtilityView(url)) {
      revealPage();
      return;
    }

    if (url.searchParams.get("ffxihm") === "off") {
      settings = await getSettings();
      revealPage();
      if (settings.enabled) {
        createBadge(null, "bypass");
        installLinkInterceptor();
      }
      return;
    }

    hideCurrentPage();
    settings = await getSettings();

    if (!settings.enabled) {
      revealPage();
      return;
    }

    installLinkInterceptor();

    if (url.searchParams.has("oldid")) {
      await handleHistoricalPage(url, title);
      return;
    }

    await resolveAndNavigate(title, url.hash);
  }

  main().catch((error) => {
    settings = settings || { ...DEFAULTS };
    blockPage(
      parseTitle() || "This page",
      `Historical revision lookup failed: ${error?.message || String(error)}`
    );
  });
})();
