/* Scoreboard loader with AUTO-SKIN injection (no HTML edits).
   - Prefers JSON (avoids kpis.csv 404s)
   - Injects a minimal, scoped CSS skin so visuals match other pages
   - Scope: body[data-cl-skin="scoreboard"] .*
*/
(function(){
  'use strict';

  // ---------- Auto-skin (scoped CSS) ----------
  function injectSkin(){
    document.body.setAttribute('data-cl-skin','scoreboard');
    const css = `
    body[data-cl-skin="scoreboard"] .panel{
      background: var(--panel, #0f1420);
      border: 1px solid var(--border, #1b2030);
      border-radius: var(--radius-lg, 16px);
      box-shadow: 0 8px 30px rgba(0,0,0,.35);
    }
    body[data-cl-skin="scoreboard"] .panel-head{
      padding: 16px;
      border-bottom: 1px solid var(--border, #1b2030);
    }
    body[data-cl-skin="scoreboard"] .totals .pill{
      background: var(--pill, #0b1020);
      border: 1px solid var(--border, #1b2030);
      border-radius: 12px;
      padding: 8px 12px;
      min-width: 92px;
    }
    body[data-cl-skin="scoreboard"] .members-grid{ gap: 12px; padding: 16px; }
    body[data-cl-skin="scoreboard"] .member-card{
      background: var(--card, #111522);
      border: 1px solid var(--border, #1b2030);
      border-radius: 14px;
      display: grid;
      grid-template-columns: 56px 1fr auto;
      align-items: center;
      gap: 10px;
      padding: 10px;
    }
    body[data-cl-skin="scoreboard"] .member-card img{
      width: 56px; height: 56px;
      border-radius: 10px; object-fit: cover;
      background: #0b0d12; border: 1px solid var(--border, #1b2030);
    }
    body[data-cl-skin="scoreboard"] .member-card .meta .name{ font-weight: 600; }
    body[data-cl-skin="scoreboard"] .member-card .meta .sub{ color: var(--muted, #8b93a7); font-size: 12px; margin-top: 2px; }
    body[data-cl-skin="scoreboard"] .member-card .pts{ font-weight: 700; }
    body[data-cl-skin="scoreboard"] .member-card .pts.positive{ color: var(--good, #2ecc71); }
    body[data-cl-skin="scoreboard"] .member-card .pts.negative{ color: var(--bad, #ff5c5c); }
    body[data-cl-skin="scoreboard"] .table{ width: 100%; border-collapse: collapse; font-size: 14px; }
    body[data-cl-skin="scoreboard"] .table th, 
    body[data-cl-skin="scoreboard"] .table td{ padding: 10px 12px; border-bottom: 1px solid var(--border, #1b2030); }
    body[data-cl-skin="scoreboard"] .table thead th{ color: var(--text-dim, #afbbd4); font-weight: 600; text-align: left; }
    body[data-cl-skin="scoreboard"] .yea{ color: var(--good, #2ecc71); font-weight: 600; }
    body[data-cl-skin="scoreboard"] .nay{ color: var(--bad, #ff5c5c); font-weight: 600; }
    `;
    const style = document.createElement('style');
    style.id = 'cl-auto-skin';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------- Data loading helpers ----------
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
    injectSkin();
    init().catch(err => console.error(err)); 
  });

  async function init(){
    const busRoster = window.CapLeague?.read('roster');
    const busKpis   = window.CapLeague?.read('kpis');
    const busTeam   = window.CapLeague?.read('myTeam');

    // JSON-first (CSV only if JSON missing)
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
