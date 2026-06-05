(function attachOpenFormsMetrics(global) {
  "use strict";

  const defaults = {
    endpoint: "",
    entries: {},
    debug: false,
    transport: null,
    pageviewDelayMs: 250,
    sessionStorageKey: "openforms_metrics_session"
  };

  let config = { ...defaults };
  let initialized = false;
  let pageStartedAt = 0;
  let durationSent = false;

  function getSessionId() {
    try {
      const existing = global.sessionStorage.getItem(config.sessionStorageKey);
      if (existing) return existing;

      const next = global.crypto && global.crypto.randomUUID
        ? global.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      global.sessionStorage.setItem(config.sessionStorageKey, next);
      return next;
    } catch (_error) {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  }

  function getScreenInfo() {
    const s = global.screen || {};
    return {
      screenW: s.width,
      screenH: s.height,
      viewportW: global.innerWidth,
      viewportH: global.innerHeight,
      devicePixelRatio: global.devicePixelRatio || 1,
      colorDepth: s.colorDepth
    };
  }

  function getConnectionInfo() {
    const nav = global.navigator || {};
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (!conn) return {};
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }

  function getTimingInfo() {
    try {
      const nav = global.performance && global.performance.getEntriesByType
        ? global.performance.getEntriesByType("navigation")[0]
        : null;
      if (!nav) return {};
      return {
        domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
        loadEventMs: Math.round(nav.loadEventEnd),
        transferSizeBytes: nav.transferSize,
        encodedBodySizeBytes: nav.encodedBodySize,
        navigationType: nav.type
      };
    } catch (_) {
      return {};
    }
  }

  function normalizePayload(eventName, extra) {
    const autoExtra = {
      ...getScreenInfo(),
      ...getConnectionInfo(),
      ...getTimingInfo(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: global.navigator.language,
      languages: (global.navigator.languages || []).join(","),
      platform: global.navigator.platform,
      hardwareConcurrency: global.navigator.hardwareConcurrency,
      deviceMemoryGb: global.navigator.deviceMemory,
      cookiesEnabled: global.navigator.cookieEnabled,
      doNotTrack: global.navigator.doNotTrack,
      touchPoints: global.navigator.maxTouchPoints,
      hash: global.location.hash || "",
      historyLength: global.history.length,
      ...extra
    };

    return {
      event: eventName,
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
      url: global.location.href,
      path: `${global.location.pathname}${global.location.search}`,
      title: global.document.title,
      referrer: global.document.referrer || "",
      durationMs: eventName === "duration" ? Math.round(performance.now() - pageStartedAt) : 0,
      userAgent: global.navigator.userAgent,
      extra: JSON.stringify(autoExtra)
    };
  }

  function toFormData(payload) {
    const formData = new FormData();

    Object.entries(config.entries).forEach(([payloadKey, entryId]) => {
      if (!entryId) return;
      formData.append(entryId, payload[payloadKey] == null ? "" : String(payload[payloadKey]));
    });

    return formData;
  }

  function toUrlEncoded(payload) {
    const params = new URLSearchParams();

    Object.entries(config.entries).forEach(([payloadKey, entryId]) => {
      if (!entryId) return;
      params.append(entryId, payload[payloadKey] == null ? "" : String(payload[payloadKey]));
    });

    return params;
  }

  function submit(payload) {
    if (typeof config.transport === "function") {
      return config.transport(payload);
    }

    if (!config.endpoint) {
      if (config.debug) console.warn("OpenFormsMetrics: missing endpoint", payload);
      return Promise.resolve(false);
    }

    if (config.debug) console.info("OpenFormsMetrics submit", payload);

    const encoded = toUrlEncoded(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([encoded.toString()], {
        type: "application/x-www-form-urlencoded;charset=UTF-8"
      });
      if (navigator.sendBeacon(config.endpoint, blob)) {
        return Promise.resolve(true);
      }
    }

    return fetch(config.endpoint, {
      method: "POST",
      mode: "no-cors",
      body: toFormData(payload)
    }).then(() => true).catch((error) => {
      if (config.debug) console.warn("OpenFormsMetrics failed", error);
      return false;
    });
  }

  function track(eventName, extra) {
    const payload = normalizePayload(eventName || "event", extra || {});
    return submit(payload);
  }

  function sendDuration() {
    if (durationSent || !initialized) return;
    durationSent = true;
    track("duration");
  }

  function init(options) {
    config = {
      ...defaults,
      ...(options || {}),
      entries: {
        ...(options && options.entries ? options.entries : {})
      }
    };

    initialized = true;
    durationSent = false;
    pageStartedAt = performance.now();

    global.setTimeout(() => track("pageview"), config.pageviewDelayMs);
    global.addEventListener("pagehide", sendDuration, { once: true });
    global.document.addEventListener("visibilitychange", () => {
      if (global.document.visibilityState === "hidden") sendDuration();
    });

    return {
      track
    };
  }

  global.OpenFormsMetrics = {
    init,
    track
  };
})(window);
