/* Scoreboard loader with AUTO-SKIN v4 (robust header targeting).
   - JSON-first (no CSV 404s)
   - Injects scoped CSS under body[data-cl-skin="scoreboard"]
   - Targets many common header classnames and the <header> tag
   - Dynamically sets --h to actual header height
*/
(function(){
  'use strict';

  const SKIN = {
    headerBg: 'rgba(11,13,18,0.80)',
    headerBorder: '#1b2030',
    headerBlur: '8px',
    headerHeightFallback: 72, // px
    brandWeight: 700,
    navColor: '#cfd7ec',
    navDim: '#8b93a7',
    navActive: '#ffffff',
    radiusPanel: 18,
    radiusCard: 14,
    border: '#1b2030',
    bgPanel: '#0f1420',
    bgCard: '#111522',
    bgPill: '#0b1020',
    textDim: '#afbbd4',
    good: '#2ecc71',
    bad:  '#ff5c5c',
    shadow: '0 12px 40px rgba(0,0,0,.35)',
    headerPad: '18px',
    tableFont: '14px',
  };

  const HEADER_SEL = [
    'header',
    '.header','.site-header','.app-header','.main-header','.global-header','.topbar','.top-bar','.appbar',
    '#header','#site-header','#app-header','#main-header','#global-header','#topbar'
  ].join(',');

  function injectSkin(){
    if (!document.body) return;
    document.body.setAttribute('data-cl-skin','scoreboard');

    const css = `
    /* ===== Header (broad target, but scoped) ===== */
    body[data-cl-skin="scoreboard"] ${HEADER_SEL}{
      position: sticky;
      top: 0;
      background: ${SKIN.headerBg};
      border-bottom: 1px solid ${SKIN.headerBorder};
      backdrop-filter: blur(${SKIN.headerBlur});
      -webkit-backdrop-filter: blur(${SKIN.headerBlur});
      z-index: 1000;
    }
    body[data-cl-skin="scoreboard"] ${HEADER_SEL} .wrap{
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      height: 100%;
      padding: 0 16px;
    }
    body[data-cl-skin="scoreboard"] ${HEADER_SEL} .brand{
      font-weight: ${SKIN.brandWeight};
      letter-spacing: .4px;
    }
    body[data-cl-skin="scoreboard"] ${HEADER_SEL} .nav a{
      color: ${SKIN.navDim};
      text-decoration: none;
      margin-left: 16px;
      font-weight: 600;
    }
    body[data-cl-skin="scoreboard"] ${HEADER_SEL} .nav a:hover{
      color: ${SKIN.navColor};
    }
    body[data-cl-skin="scoreboard"] ${HEADER_SEL} .nav a.active{
      color: ${SKIN.navActive};
    }

    /* ===== Panels / Cards / Tables ===== */
    body[data-cl-skin="scoreboard"] .panel{
      background: var(--panel, ${SKIN.bgPanel});
      border: 1px solid var(--border, ${SKIN.border});
      border-radius: ${SKIN.radiusPanel}px;
      box-shadow: ${SKIN.shadow};
    }
    body[data-cl-skin="scoreboard"] .panel-head{
      padding: ${SKIN.headerPad};
      border-bottom: 1px solid var(--border, ${SKIN.border});
    }
    body[data-cl-skin="scoreboard"] .totals{ gap: 10px; }
    body[data-cl-skin="scoreboard"] .totals .pill{
      background: var(--pill, ${SKIN.bgPill});
      border: 1px solid var(--border, ${SKIN.border});
      border-radius: 12px;
      padding: 10px 14px;
      min-width: 92px;
    }
    body[data-cl-skin="scoreboard"] .members-grid{ gap: 14px; padding: 18px; }
    body[data-cl-skin="scoreboard"] .member-card{
      background: var(--card, ${SKIN.bgCard});
      border: 1px solid var(--border, ${SKIN.border});
      border-radius: ${SKIN.radiusCard}px;
      display: grid;
      grid-template-columns: 56px 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 12px;
    }
    body[data-cl-skin="scoreboard"] .member-card img{
      width: 56px; height: 56px;
      border-radius: 10px; object-fit: cover;
      background: #0b0d12; border: 1px solid var(--border, ${SKIN.border});
    }
    body[data-cl-skin="scoreboard"] .member-card .meta .name{ font-weight: 700; letter-spacing: .1px; }
    body[data-cl-skin="scoreboard"] .member-card .meta .sub{ color: var(--muted, ${SKIN.textDim}); font-size: 12px; margin-top: 2px; }
    body[data-cl-skin="scoreboard"] .member-card .pts{ font-weight: 800; }
    body[data-cl-skin="scoreboard"] .member-card .pts.positive{ color: var(--good, ${SKIN.good}); }
    body[data-cl-skin="scoreboard"] .member-card .pts.negative{ color: var(--bad, ${SKIN.bad}); }

    body[data-cl-skin="scoreboard"] .table{ width: 100%; border-collapse: collapse; font-size: ${SKIN.tableFont}; }
    body[data-cl-skin="scoreboard"] .table th, 
    body[data-cl-skin="scoreboard"] .table td{ padding: 12px 14px; border-bottom: 1px solid var(--border, ${SKIN.border}); }
    body[data-cl-skin="scoreboard"] .table thead th{ color: var(--text-dim, ${SKIN.textDim}); font-weight: 600; text-align: left; letter-spacing:.2px; }
    body[data-cl-skin="scoreboard"] .yea{ color: var(--good, ${SKIN.good}); font-weight: 700; }
    body[data-cl-skin="scoreboard"] .nay{ color: var(--bad, ${SKIN.bad}); font-weight: 700; }
    `;

    let style = document.getElementById('cl-auto-skin');
    if (!style){
      style = document.createElement('style');
      style.id = 'cl-auto-skin';
      document.head.appendChild(style);
    }
    style.textContent = css;

    // Diagnostics + dynamic --h
    const headers = Array.from(document.querySelectorAll(HEADER_SEL));
    if (headers.length === 0){
      console.info('[CapLeague] Auto-skin: no header element matched any selector.');
      // fall back variable
      document.documentElement.style.setProperty('--h', SKIN.headerHeightFallback + 'px');
    } else {
      const h = headers[0];
      const setH = () => {
        const hh = Math.max(h.offsetHeight || 0, SKIN.headerHeightFallback);
        document.documentElement.style.setProperty('--h', hh + 'px');
      };
      setH();
      window.addEventListener('resize', setH);
      console.info('[CapLeague] Auto-skin: header matched "%s" with classes "%s"; --h set to %spx',
                   h.tagName.toLowerCase() + (h.id?('#'+h.id):''), h.className, getComputedStyle(document.documentElement).getPropertyValue('--h').trim());
    }
  }

  // ---- Data plumbing (same as v2) ----
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
