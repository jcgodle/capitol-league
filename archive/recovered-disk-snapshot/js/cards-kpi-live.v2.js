/* Feed-only KPI updater (GovTrack). No ProPublica. No local kpis.json required.
   - Expects <article class="thumb" data-govtrack="..." data-bioguide="...">
   - Fills: [data-kpi="attendance"], [data-kpi="total"], [data-kpi="missed"], [data-kpi="attendance-val"]
*/
(() => {
  const ROLE_URL = (pid) =>
    `https://www.govtrack.us/api/v2/role?current=true&person=${pid}&limit=600&fields=total_votes,missed_votes,missed_votes_pct`;
  const viaProxy = (url) => `https://r.jina.ai/http/${url.replace(/^https?:\/\//, "")}`;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // simple per-page cache to prevent double hits when 'cards:rendered' fires again
  const cache = new Map();          // pid -> { total_votes, missed_votes, attendance }
  const inflight = new Map();       // pid -> Promise
  const processed = new Set();      // bioguide DOM nodes updated

  async function getJSONWithFallback(url, tries = 3) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        return await r.json();
      } catch (err) {
        lastErr = err;
        // small backoff between attempts
        await sleep(400 + i * 300);
      }
    }
    // final chance via CORS-friendly text proxy
    const r2 = await fetch(viaProxy(url), { cache: "no-store" });
    if (!r2.ok) throw new Error(`proxy ${r2.status}`);
    const txt = await r2.text();
    return JSON.parse(txt);
  }

  function updateDomFor(pid, stats) {
    const cards = document.querySelectorAll(`article.thumb[data-govtrack="${pid}"]`);
    for (const el of cards) {
      if (processed.has(el)) continue;
      const bubble = el.querySelector('[data-kpi="attendance"]');
      const t = el.querySelector('[data-kpi="total"]');
      const m = el.querySelector('[data-kpi="missed"]');
      const av = el.querySelector('[data-kpi="attendance-val"]');

      const pct = (stats.attendance * 100) || 0;
      if (bubble) bubble.textContent = `Voted ${pct.toFixed(1)}%`;
      if (t) t.textContent = (stats.total_votes || 0).toLocaleString();
      if (m) m.textContent = (stats.missed_votes || 0).toLocaleString();
      if (av) av.textContent = `${pct.toFixed(1)}%`;

      processed.add(el);
    }
  }

  async function fetchKPIs(pid) {
    // use cache / in-flight promise to dedupe
    if (cache.has(pid)) return cache.get(pid);
    if (inflight.has(pid)) return inflight.get(pid);

    const p = (async () => {
      try {
        const data = await getJSONWithFallback(ROLE_URL(pid));
        const roles = Array.isArray(data?.objects) ? data.objects : [];
        let total = 0, missed = 0;
        for (const r of roles) {
          total += +r.total_votes || 0;
          missed += +r.missed_votes || 0;
        }
        const attendance = total > 0 ? 1 - missed / total : 0;
        const stats = { total_votes: total, missed_votes: missed, attendance };
        cache.set(pid, stats);
        return stats;
      } finally {
        inflight.delete(pid);
      }
    })();

    inflight.set(pid, p);
    return p;
  }

  async function runQueued() {
    // gather unique GovTrack IDs in view
    const ids = [
      ...new Set(
        [...document.querySelectorAll("article.thumb[data-govtrack]")]
          .map((el) => el.getAttribute("data-govtrack"))
          .filter(Boolean)
      ),
    ];

    // sequential with a short delay to avoid GovTrack 429s
    for (const pid of ids) {
      try {
        const stats = await fetchKPIs(pid);
        updateDomFor(pid, stats);
      } catch {
        // fail-soft: leave zeros
      }
      await sleep(350); // tune 300–800ms as needed
    }
  }

  window.addEventListener("DOMContentLoaded", runQueued);
  window.addEventListener("cards:rendered", runQueued);
})();
