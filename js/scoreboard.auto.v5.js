/* Scoreboard loader with AUTO-SKIN v5
   - No HTML edits required
   - JSON-first data (no CSV 404s)
   - Aggressive header patch: finds likely header element and applies inline !important styles
   - Re-patches on DOM changes (MutationObserver)
*/
(function(){
  'use strict';

  // ---- DATA LOADER (unchanged from v4) ----
  const PREFERRED_PATHS = {
    roster:   ['data/roster.json','./data/roster.json','roster.json','./roster.json','/data/roster.json','/roster.json'],
    kpisCsv:  ['data/kpis.csv','./data/kpis.csv','kpis.csv','./kpis.csv','/data/kpis.csv','/kpis.csv'],
    kpisJson: ['data/kpis.json','./data/kpis.json','kpis.json','./kpis.json','/data/kpis.json','/kpis.json'],
    myteamIds:['data/myteam_ids.json','./data/myteam_ids.json','myteam_ids.json','./myteam_ids.json','/data/myteam_ids.json','/myteam_ids.json']
  };
  const TIMEOUT_MS = 8000;
  const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  async function fetchJSON(url){
    const res = await Promise.race([fetch(url, {cache:'no-store'}), timeout(TIMEOUT_MS)]);
    if (!res.ok) throw new Error('HTTP '+res.status+' for '+url);
    return res.json();
  }
  async function fetchText(url){
    const res = await Promise.race([fetch(url, {cache:'no-store'}), timeout(TIMEOUT_MS)]);
    if (!res.ok) throw new Error('HTTP '+res.status+' for '+url);
    return res.text();
  }
  async function firstHit(paths, fn){
    for (const p of paths){
      try { return await fn(p); } catch {}
    }
    return null;
  }
  function parseCSV(txt){
    if (!txt || typeof txt !== 'string') return [];
    const lines = txt.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h=>h.trim());
    const rows = [];
    for (let i=1;i<lines.length;i++){
      const cols = lines[i].split(',').map(c=>c.trim());
      const obj = {}; headers.forEach((h,idx)=>{ obj[h] = cols[idx]; });
      ['today','week','season'].forEach(k => { if (obj[k] != null && obj[k] !== '') obj[k] = Number(obj[k]); });
      rows.push(obj);
    }
    return rows;
  }
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s==null?'':s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  document.addEventListener('DOMContentLoaded', () => { 
    patchHeader();
    init().catch(err => console.error(err)); 
  });

  // ---- HEADER PATCH (inline !important) ----
  const HEADER_CANDIDATE_SEL = [
    'header',
    '[role="banner"]',
    '.header','.site-header','.app-header','.main-header','.global-header','.topbar','.top-bar','.appbar','.navbar','.nav-bar',
    '[class*="header"]','[id*="header"]','[class*="top"]'
  ].join(',');

  function pickHeader(){
    // Pick the first candidate near the top with decent height
    const candidates = Array.from(document.querySelectorAll(HEADER_CANDIDATE_SEL));
    let best = null, bestScore = -1;
    for (const el of candidates){
      const rect = el.getBoundingClientRect();
      const score = (rect.top < 180 ? 50 : 0) + (rect.height >= 48 && rect.height <= 120 ? 30 : 0) + (el.tagName.toLowerCase()==='header'?20:0);
      if (score > bestScore){ bestScore = score; best = el; }
    }
    // Fallback: find parent of the first nav list that contains "Scoreboard"
    if (!best){
      const links = Array.from(document.querySelectorAll('a'));
      const hit = links.find(a => /scoreboard/i.test(a.textContent||''));
      if (hit){
        let p = hit;
        for (let i=0;i<5 && p;i++){ p = p.parentElement; if (p && p.getBoundingClientRect().top < 200) { best = p; break; } }
      }
    }
    return best;
  }

  function setImportant(el, prop, val){
    try { el.style.setProperty(prop, val, 'important'); } catch {}
  }

  function applyHeaderStyles(h){
    if (!h) return false;
    setImportant(h, 'position', 'sticky');
    setImportant(h, 'top', '0px');
    setImportant(h, 'background', 'rgba(11,13,18,0.80)');
    setImportant(h, 'backdrop-filter', 'blur(8px)');
    setImportant(h, '-webkit-backdrop-filter', 'blur(8px)');
    setImportant(h, 'border-bottom', '1px solid #1b2030');
    setImportant(h, 'z-index', '1000');

    // Try to style nav links directly
    const links = h.querySelectorAll('a');
    links.forEach(a => {
      a.style.setProperty('color', '#cfd7ec', 'important');
      a.style.setProperty('text-decoration', 'none', 'important');
      a.style.setProperty('font-weight', '600', 'important');
      const label = (a.textContent||'').trim().toLowerCase();
      if (label === 'scoreboard'){
        a.style.setProperty('color', '#ffffff', 'important');
      }
    });

    // Update --h to actual header height
    const hh = Math.max(h.offsetHeight || 0, 64);
    document.documentElement.style.setProperty('--h', hh + 'px');

    console.info('[CapLeague] Patched header:', h.tagName.toLowerCase(), h.id ? ('#'+h.id) : '', h.className ? ('.'+h.className.split(' ').join('.')) : '', 'height:', hh);
    return true;
  }

  function patchHeader(){
    const h = pickHeader();
    if (!applyHeaderStyles(h)){
      console.info('[CapLeague] Header not found by auto-skin v5.');
    }
    // Re-apply if DOM mutates (frameworks replacing header)
    const mo = new MutationObserver(() => {
      const hh = pickHeader();
      if (hh) applyHeaderStyles(hh);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ---- RENDER ----
  async function init(){
    const busRoster = window.CapLeague?.read('roster');
    const busKpis   = window.CapLeague?.read('kpis');
    const busTeam   = window.CapLeague?.read('myTeam');

    const rosterFromFiles = busRoster || await firstHit(PREFERRED_PATHS.roster,   fetchJSON);
    const kpisJsonFile    = busKpis   ? null : await firstHit(PREFERRED_PATHS.kpisJson, fetchJSON);
    let   kpisCsvTxt      = null;
    if (!busKpis && !kpisJsonFile) {
      kpisCsvTxt = await firstHit(PREFERRED_PATHS.kpisCsv,  fetchText);
    }
    const myteamIdsFile   = busTeam   || await firstHit(PREFERRED_PATHS.myteamIds,fetchJSON);

    const roster   = busRoster || rosterFromFiles || [];
    const kpisList = busKpis || (kpisJsonFile || (kpisCsvTxt ? parseCSV(kpisCsvTxt) : [])) || [];
    const kpiMap   = new Map((Array.isArray(kpisList) ? kpisList : []).map(k=>[String(k.id), k]));

    let teamIds = Array.isArray(busTeam) && busTeam.length ? busTeam
               : (Array.isArray(myteamIdsFile) ? myteamIdsFile : []);

    if (!teamIds.length){
      try {
        const ls = JSON.parse(localStorage.getItem('myTeam') || '[]');
        if (Array.isArray(ls)) teamIds = ls;
      } catch {}
    }

    let items = [];
    if (Array.isArray(roster) && roster.length){
      const metaById = new Map(roster.map(m=>[String(m.id), m]));
      const pickIds = teamIds.length ? teamIds : (Array.from(kpiMap.keys()).slice(0,10));
      for (const id of pickIds){
        const meta = metaById.get(String(id)) || { id, name: id, chamber:'', state:'', photo:'' };
        const pts  = kpiMap.get(String(id))    || { today:0, week:0, season:0 };
        items.push({ id, ...meta, ...pts });
      }
    }

    if (!items.length){
      items = [
        {id:"S000033", name:"Rep. A. Smith", chamber:"House", state:"MO-03", photo:"https://www.govtrack.us/static/legislator-photos/S000033-200px.jpeg", today:6, week:18, season:212},
        {id:"B001288", name:"Sen. L. Nguyen", chamber:"Senate", state:"IL", photo:"https://www.govtrack.us/static/legislator-photos/B001288-200px.jpeg", today:4, week:12, season:198},
        {id:"C001098", name:"Rep. J. Doe", chamber:"House", state:"TX-07", photo:"https://www.govtrack.us/static/legislator-photos/C001098-200px.jpeg", today:-2, week:-6, season:154}
      ];
    }

    renderMyTeam(items);
    wireTotals(items);
    await wireLeaguePanels();

    ['liveVotes','movers','standings','feed','roster','kpis','myTeam'].forEach(key=>{
      window.CapLeague?.on(key, () => wireLeaguePanels());
    });
  }

  function renderMyTeam(items){
    const row = $('myTeamRow');
    if (!row) return;
    row.innerHTML = '';
    for (const m of items.slice(0,10)){
      const card = document.createElement('div');
      card.className = 'member-card';

      const img = document.createElement('img');
      img.src = m.photo || '';
      img.alt = m.name || m.id || '';

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<div class="name">${esc(m.name || m.id)}</div>
                        <div class="sub">${esc([m.chamber, m.state].filter(Boolean).join(' • '))}</div>`;

      const pts = document.createElement('div');
      pts.className = 'pts';
      const t = Number(m.today||0);
      if (t > 0) pts.classList.add('positive');
      else if (t < 0) pts.classList.add('negative');
      pts.textContent = `${t>0?'+':''}${t}`;

      card.append(img, meta, pts);
      row.append(card);
    }
  }

  function wireTotals(items){
    const t = items.reduce((acc, m)=>{
      acc.today += Number(m.today||0);
      acc.week  += Number(m.week||0);
      acc.season+= Number(m.season||0);
      return acc;
    }, {today:0, week:0, season:0});
    const a=$('kpiToday'), b=$('kpiWeek'), c=$('kpiSeason');
    if(a) a.textContent=t.today; if(b) b.textContent=t.week; if(c) c.textContent=t.season;
  }

  async function wireLeaguePanels(){
    const liveVotes = window.CapLeague?.read('liveVotes') || null;
    const movers    = window.CapLeague?.read('movers')    || null;
    const standings = window.CapLeague?.read('standings') || null;
    const feed      = window.CapLeague?.read('feed')      || null;

    if (Array.isArray(liveVotes)) renderLiveVotes(liveVotes);
    if (Array.isArray(movers))    renderMovers(movers);
    if (Array.isArray(standings)) renderStandings(standings);
    if (Array.isArray(feed))      renderFeed(feed);
  }

  function renderLiveVotes(rows){
    const tbody = $('liveVotes'); if (!tbody) return;
    tbody.innerHTML = rows.map(r => {
      const yea = typeof r.yea === 'number' ? r.yea : '';
      const nay = typeof r.nay === 'number' ? r.nay : '';
      const time = r.timeCT || r.time || '';
      return `<tr>
        <td>${esc(r.bill || r.title || '')}</td>
        <td>${esc(r.chamber || '')}</td>
        <td><span class="yea">Yea ${esc(yea)}</span> / <span class="nay">Nay ${esc(nay)}</span></td>
        <td>${esc(time)}</td>
      </tr>`;
    }).join('');
  }

  function renderMovers(rows){
    const tbody = $('movers'); if (!tbody) return;
    tbody.innerHTML = rows.map(m => (
      `<tr>
         <td>${esc(m.name)}</td>
         <td>${esc(m.chamber || '')}</td>
         <td class="${(m.delta||0)>=0?'yea':'nay'}">${(m.delta>0?'+':'')}${esc(m.delta||0)}</td>
       </tr>`
    )).join('');
  }

  function renderStandings(rows){
    const tbody = $('standingsBody'); if (!tbody) return;
    tbody.innerHTML = rows.map(s => (
      `<tr>
         <td>${esc(s.team)}</td>
         <td>${esc(s.w)}-${esc(s.l)}</td>
         <td>${esc(s.pts)}</td>
       </tr>`
    )).join('');
  }

  function renderFeed(rows){
    const root = $('feed'); if (!root) return;
    root.innerHTML = rows.map(f => (
      `<div class="feed-item">
         <span class="pill">${esc(f.type || 'Note')}</span>
         <div>${esc(f.text || '')}<div class="muted">${esc(f.when || '')}</div></div>
       </div>`
    )).join('');
  }
})();
