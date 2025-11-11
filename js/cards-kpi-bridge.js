// cards-kpi-bridge.js
// Injects live KPIs into the page by intercepting fetch('kpis.json').
// Drop this <script> BEFORE your cards page code that requests kpis.json.

(function(){
  const BASE='https://www.govtrack.us/api/v2/role?current=true&limit=200';
  const originalFetch = window.fetch.bind(window);
  let built=null, building=null;

  async function fetchJSON(u){
    const r = await originalFetch(u, {cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  }
  async function getAllPages(){
    const first = await fetchJSON(BASE);
    const total = first?.meta?.total_count ?? (first?.objects?.length||0);
    const pageSize = first?.meta?.limit ?? 200;
    const out=[...first.objects||[]];
    for(let offset=pageSize; offset<total; offset+=pageSize){
      const url = BASE + '&offset=' + offset;
      const d = await fetchJSON(url);
      out.push(...(d.objects||[]));
    }
    return out;
  }
  function normalizeRole(r){
    const pid = r.person && r.person.id;
    const total = (("total_votes" in r)? r.total_votes : ("votes" in r? r.votes : 0)) || 0;
    let missed = ("missed_votes" in r)? r.missed_votes : null;
    const pct = ("missed_votes_pct" in r)? r.missed_votes_pct : null;
    if(missed==null && pct!=null && total){ missed = Math.round(total*pct/100); }
    return { pid, total, missed };
  }
  async function buildKPIs(){
    const roles = await getAllPages();
    const out = {};
    for(const r of roles){
      const n = normalizeRole(r);
      if(n.pid!=null) out[n.pid] = { total_votes: n.total, missed_votes: n.missed||0 };
    }
    return out;
  }

  async function ensureKPIs(){
    if(built) return built;
    if(building) return building;
    building = buildKPIs().then(m => (built=m, m));
    return building;
  }

  window.fetch = async function(resource, init){
    try{
      const url = (typeof resource==='string') ? resource : (resource && resource.url);
      if(url && /(^|\/)kpis\.json(\?|$)/i.test(url)){
        const map = await ensureKPIs();
        const blob = new Blob([JSON.stringify(map)], {type:'application/json'});
        return new Response(blob, {status:200, headers:{'Content-Type':'application/json'}});
      }
    }catch(e){ console.warn('KPI bridge failed, falling back to network', e); }
    return originalFetch(resource, init);
  };
})();
