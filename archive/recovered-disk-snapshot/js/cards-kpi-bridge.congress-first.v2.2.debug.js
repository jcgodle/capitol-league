// cards-kpi-bridge.congress-first.v2.2.debug.js
// Congress.gov → GovTrack KPI bridge with verbose logging and strong fallbacks.
(function(){
  const originalFetch = window.fetch.bind(window);
  const log = (...a)=>console.log('[KPI Bridge]', ...a);
  const warn = (...a)=>console.warn('[KPI Bridge]', ...a);

  // --- Key discovery
  function getApiKey(){
    if (window.CONGRESS_API_KEY){ log('Key from window.CONGRESS_API_KEY'); return String(window.CONGRESS_API_KEY); }
    try{
      if (window.CAPITOL_CFG && window.CAPITOL_CFG.CONGRESS_KEY){ log('Key from window.CAPITOL_CFG.CONGRESS_KEY'); return String(window.CAPITOL_CFG.CONGRESS_KEY); }
    }catch{}
    try{
      const meta = document.querySelector('meta[name="congress-api-key"]');
      if (meta && meta.content){ log('Key from <meta>'); return String(meta.content); }
    }catch{}
    try{
      const ls = localStorage.getItem('CONGRESS_API_KEY');
      if (ls){ log('Key from localStorage'); return String(ls); }
    }catch{}
    warn('No Congress.gov key found.');
    return null;
  }

  async function j(u, opt){
    const r = await originalFetch(u, opt||{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status+' '+u);
    return r.json();
  }
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  function timeout(promise, ms, label){
    return Promise.race([ promise, new Promise((_,rej)=>setTimeout(()=>rej(new Error('Timeout '+(label||''))), ms)) ]);
  }
  async function throttleAll(items, limit, worker){
    const out=[]; let i=0, active=0;
    return new Promise((resolve)=>{
      const next=()=>{
        if(i>=items.length && active===0) return resolve(out);
        while(active<limit && i<items.length){
          const idx=i++, item=items[idx]; active++;
          Promise.resolve(worker(item, idx)).then(res=>{ out[idx]=res; }).catch(e=>{ out[idx]=null; warn('worker error', e); })
          .finally(()=>{ active--; next(); });
        }
      };
      next();
    });
  }

  function currentCongress(){
    const now=new Date(); const y=now.getUTCFullYear(); const startOdd = y%2 ? y : y-1;
    return Math.floor((startOdd-1789)/2)+1;
  }
  function pluckVoteArray(data){
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.votes)) return data.votes;
    if (Array.isArray(data?.objects)) return data.objects;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.votes?.items)) return data.votes.items;
    return [];
  }
  function readPosition(v){
    return String(
      v.position ?? v.member_position ?? v.memberPosition ?? v.vote_position ?? v.MemberPosition ?? ''
    ).toLowerCase();
  }

  // --- Load US Roster
  async function loadUSRoster(){
    try{
      const r = await timeout(j('https://unitedstates.github.io/congress-legislators/legislators-current.json'), 10000, 'roster');
      if (Array.isArray(r)){ log('Roster loaded:', r.length); return r; }
    }catch(e){ warn('Roster failed', e); }
    return [];
  }

  // --- Congress.gov aggregation
  async function buildFromCongress(roster){
    const key = getApiKey();
    if(!key) throw new Error('No Congress API key');
    const congress = currentCongress();
    log('Building from Congress.gov — congress', congress, 'members', roster.length);

    async function memberKPI(m){
      const bioguide = m?.id?.bioguide;
      if(!bioguide) return null;
      let total=0, missed=0, offset=0, page=0, more=true, limit=250, maxPages=3;
      while(more && page<maxPages){
        const url = `https://api.congress.gov/v3/member/${bioguide}/votes?api_key=${encodeURIComponent(key)}&congress=${congress}&limit=${limit}&offset=${offset}`;
        let data;
        try{ data = await timeout(j(url), 8000, 'member '+bioguide); }catch(e){ return null; }
        const arr = pluckVoteArray(data);
        for(const v of arr){
          const pos = readPosition(v);
          total += 1;
          if(pos.includes('not') && pos.includes('vot')) missed += 1;
        }
        const count = arr.length;
        more = !!count && count===limit;
        offset += count; page++;
        if(more) await sleep(60);
      }
      return { id: m?.id?.govtrack ?? null, total_votes: total, missed_votes: missed };
    }

    const results = await throttleAll(roster, 5, memberKPI);
    const out = {};
    let hits = 0;
    for(const r of results){
      if(r && (r.total_votes || r.missed_votes!=null) && r.id!=null){
        out[r.id] = { total_votes: r.total_votes||0, missed_votes: r.missed_votes||0 };
        hits++;
      }
    }
    log('Congress.gov built entries:', hits);
    if(hits===0) throw new Error('Congress.gov returned no KPIs');
    return out;
  }

  // --- GovTrack fallback
  async function buildFromGovTrack(){
    const base='https://www.govtrack.us/api/v2/role?current=true&limit=200';
    log('Building from GovTrack…');
    const out = {};
    function add(r){
      const pid = r.person && r.person.id;
      const total = (("total_votes" in r)? r.total_votes : ("votes" in r? r.votes : 0)) || 0;
      let missed = ("missed_votes" in r)? r.missed_votes : null;
      const pct = ("missed_votes_pct" in r)? r.missed_votes_pct : null;
      if(missed==null && pct!=null && total){ missed = Math.round(total*pct/100); }
      if(pid!=null) out[pid] = { total_votes: total, missed_votes: missed||0 };
    }
    const first = await timeout(j(base), 8000, 'govtrack first');
    const total = first?.meta?.total_count ?? (first?.objects?.length||0);
    const limit = first?.meta?.limit ?? 200;
    (first.objects||[]).forEach(add);
    for(let offset=limit; offset<total; offset+=limit){
      const data = await timeout(j(base + '&offset=' + offset), 8000, 'govtrack page');
      (data.objects||[]).forEach(add);
    }
    log('GovTrack built entries:', Object.keys(out).length);
    return out;
  }

  let built=null, building=null;
  async function ensureKPIs(){
    if(built) return built;
    if(building) return building;
    building = (async ()=>{
      log('KPI build start');
      const roster = await loadUSRoster();
      try{
        const primary = await buildFromCongress(roster);
        try{
          const fallback = await buildFromGovTrack();
          // fill holes
          let added=0;
          for(const k in fallback){ if(!primary[k]){ primary[k]=fallback[k]; added++; } }
          log('Filled holes from GovTrack:', added);
        }catch(e){ warn('GovTrack merge skipped:', e.message||e); }
        built = primary;
      }catch(e){
        warn('Congress.gov path failed:', e.message||e);
        try{
          built = await buildFromGovTrack();
        }catch(e2){
          warn('GovTrack fallback also failed:', e2.message||e2);
          built = {}; // last resort
        }
      }
      log('KPI build done:', Object.keys(built).length, 'entries');
      return built;
    })();
    return building;
  }

  // Expose a small debug handle
  window.__KPI_BRIDGE = {
    rebuild: async ()=>{ built=null; building=null; return ensureKPIs(); },
    size: ()=> built ? Object.keys(built).length : 0
  };

  // Intercept fetch('kpis.json')
  window.fetch = async function(resource, init){
    try{
      const url = (typeof resource==='string') ? resource : (resource && resource.url);
      if(url && /(^|\/)kpis\.json(\?|$)/i.test(url)){
        const map = await ensureKPIs();
        const blob = new Blob([JSON.stringify(map)], {type:'application/json'});
        return new Response(blob, {status:200, headers:{'Content-Type':'application/json'}});
      }
    }catch(e){ warn('Bridge failed, using network', e); }
    return originalFetch(resource, init);
  };
  log('Bridge installed.');
})();
