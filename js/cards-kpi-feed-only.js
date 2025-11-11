/* Feed-only KPI updater (GovTrack). No ProPublica. No kpis.json required.
   - Finds <article.thumb data-govtrack="...">
   - Fills Total / Missed / Attendance from GovTrack.
*/

(() => {
  const GT_ALL =
    "https://www.govtrack.us/api/v2/role?current=true&limit=600&fields=person__id,total_votes,missed_votes,missed_votes_pct";
  const GT_PERSON = (pid) =>
    `https://www.govtrack.us/api/v2/role?current=true&person=${pid}&fields=total_votes,missed_votes,missed_votes_pct`;

  // Fetch JSON with graceful fallbacks that preserve the raw body
  async function getJSON(url) {
    const tryFetch = async (u) => {
      const r = await fetch(u, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) return r.json();
      const txt = await r.text();              // some proxies return text
      return JSON.parse(txt);                  // but it's still JSON
    };
    // direct → AllOrigins → isomorphic-git CORS proxy
    try { return await tryFetch(url); } catch {}
    try { return await tryFetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url)); } catch {}
    try { return await tryFetch("https://cors.isomorphic-git.org/" + url); } catch {}
    throw new Error("all proxies failed");
  }

  function updateDomFor(pid, stats) {
    const els = document.querySelectorAll(`article.thumb[data-govtrack="${pid}"]`);
    for (const el of els) {
      const bubble = el.querySelector('[data-kpi="attendance"]');
      const t = el.querySelector('[data-kpi="total"]');
      const m = el.querySelector('[data-kpi="missed"]');
      const av = el.querySelector('[data-kpi="attendance-val"]');
      const pct = (stats.attendance * 100).toFixed(1) + "%";
      if (bubble) bubble.textContent = `Voted ${pct}`;
      if (t) t.textContent = (stats.total_votes || 0).toLocaleString();
      if (m) m.textContent = (stats.missed_votes || 0).toLocaleString();
      if (av) av.textContent = pct;
    }
  }

  async function loadAllKPIs() {
    const data = await getJSON(GT_ALL);
    const objs = Array.isArray(data?.objects) ? data.objects : [];
    const map = {};
    for (const o of objs) {
      const pid = o?.person?.id;
      if (!pid) continue;
      const total = +o.total_votes || 0;
      const missed = +o.missed_votes || 0;
      const attendance = total ? 1 - missed / total : 0;
      map[pid] = { total_votes: total, missed_votes: missed, attendance };
    }
    return map;
  }

  async function run() {
    const ids = [
      ...new Set(
        [...document.querySelectorAll("article.thumb[data-govtrack]")]
          .map((el) => el.getAttribute("data-govtrack"))
          .filter(Boolean)
      ),
    ];
    if (!ids.length) return;

    let bulk = {};
    try {
      bulk = await loadAllKPIs();
    } catch (e) {
      console.warn("[KPI] bulk path failed, falling back per-person", e);
    }

    for (const id of ids) {
      if (bulk[id]) {
        updateDomFor(id, bulk[id]);
        continue;
      }
      try {
        const data = await getJSON(GT_PERSON(id));
        const objs = Array.isArray(data?.objects) ? data.objects : [];
        let total = 0, missed = 0;
        for (const r of objs) {
          total += +r.total_votes || 0;
          missed += +r.missed_votes || 0;
        }
        const attendance = total ? 1 - missed / total : 0;
        updateDomFor(id, { total_votes: total, missed_votes: missed, attendance });
      } catch {
        /* leave zeros for this member */
      }
    }
  }

  window.addEventListener("DOMContentLoaded", run);
  window.addEventListener("cards:rendered", run);
})();
