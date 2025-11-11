// Draft wired to the same sources as cards.html
const TEAM_LIMIT = 12;
const STORAGE_KEY = "cl_my_team";
const LEGIS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';
const KPI_URL = 'kpis.json'; // optional, same as cards

let RAW = [];
let VIEW = [];
let TEAM = loadTeam();
let ACTIVE_CHAMBER = "";
let KPIS = {};

function fmt(n){ return Number(n||0).toLocaleString(); }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); } }
function uniq(arr){ return Array.from(new Set(arr)); }

async function loadKPIs(){
  try{
    const res = await fetch(KPI_URL,{cache:'no-store'});
    if(!res.ok) return {};
    const data = await res.json();
    return data || {};
  }catch{ return {}; }
}

function mapMembers(list){
  return list.map(r=>{
    const id=r.id||{}, terms=r.terms||[], last=terms[terms.length-1]||{};
    const chamber = last.type==='sen'?'Senate':(last.type==='rep'?'House':'');
    const govtrack = id.govtrack;
    const k = KPIS[govtrack] || { total_votes: 0, missed_votes: 0 };
    const total = +k.total_votes||0, missed = +k.missed_votes||0;
    const attendance = total>0 ? (1 - missed/total) : 0;
    const score = Math.round(attendance*100);           // 0–100 based on attendance (matches Cards logic baseline)
    const cost = Math.max(1, Math.round(score*0.7+10)); // simple cost curve
    return {
      id: String(id.bioguide||govtrack||Math.random()),
      name: (r.name?.official_full || ((r.name?.first||'')+' '+(r.name?.last||''))).trim(),
      party: (last.party||'').slice(0,1).toUpperCase(),
      state: last.state || '',
      chamber,
      score,
      cost
    };
  }).filter(m=> m.chamber && m.name);
}

function renderStates(){
  const sel = document.getElementById('state');
  const states = uniq(RAW.map(p=>p.state)).sort();
  sel.innerHTML = '<option value=\"\">All states</option>' + states.map(s=>`<option value=\"${s}\">${s}</option>`).join('');
}
function partyClass(p){ return p==='D' ? 'is-active' : ''; }

function renderPlayers(){
  const tbody = document.getElementById('player-rows');
  if(!VIEW.length){ tbody.innerHTML = `<tr><td colspan=\"7\" class=\"muted\">No players match your filters.</td></tr>`; return; }
  tbody.innerHTML = VIEW.map(p=>{
    const disabled = TEAM.some(t=>t.id===p.id) || (TEAM.length>=TEAM_LIMIT);
    return `<tr>
      <td>${p.name}</td>
      <td>${p.chamber}</td>
      <td>${p.state}</td>
      <td><span class=\"chip ${partyClass(p.party)}\">${p.party}</span></td>
      <td>${fmtNum(p.score)}</td>
      <td>${fmtNum(p.cost)}</td>
      <td style=\"text-align:right\"><button class=\"chip ${disabled?'':'is-active'}\" data-add=\"${p.id}\" ${disabled?'disabled':''}>Draft</button></td>
    </tr>`;
  }).join('');
}
function fmtNum(n){ return Number(n).toLocaleString(); }

function renderTeam(){
  const wrap = document.getElementById('team-list');
  const empty = document.getElementById('empty-team');
  const cap = document.getElementById('cap');
  empty.style.display = TEAM.length? 'none':'block';
  cap.textContent = `${TEAM.length} / ${TEAM_LIMIT}`;
  wrap.innerHTML = TEAM.map(p=>`<div style=\"display:flex;justify-content:space-between;align-items:center;padding:6px 0\">
    <div style=\"display:flex;gap:8px;align-items:center\">
      <span>${p.name}</span>
      <span class=\"chip ${partyClass(p.party)}\">${p.party||''}</span>
      <span class=\"chip\">${p.chamber||''}</span>
      <span class=\"chip\">${p.state||''}</span>
    </div>
    <div style=\"display:flex;gap:8px;align-items:center\">
      <strong>${fmtNum(p.cost)}</strong>
      <button class=\"chip\" data-remove=\"${p.id}\">✕</button>
    </div>
  </div>`).join('');
  document.getElementById('total-cost').textContent = fmtNum(TEAM.reduce((a,b)=>a+b.cost,0));
  const avg = TEAM.length? (TEAM.reduce((a,b)=>a+b.score,0)/TEAM.length):0;
  document.getElementById('avg-score').textContent = avg.toFixed(1);
}

function applyFilters(){
  const q = document.getElementById('q').value.trim().toLowerCase();
  const party = document.getElementById('party').value;
  const st = document.getElementById('state').value;
  const sort = document.getElementById('sort').value;
  VIEW = RAW.filter(p=>{
    if(ACTIVE_CHAMBER && p.chamber!==ACTIVE_CHAMBER) return false;
    if(party && p.party!==party) return false;
    if(st && p.state!==st) return false;
    if(q){
      const hay = `${p.name} ${p.state}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const dir = sort.startsWith('-')?-1:1;
  const key = sort.replace(/^-/,'');
  VIEW.sort((a,b)=>{
    const av = (a[key]??'');
    const bv = (b[key]??'');
    if(typeof av === 'number' && typeof bv === 'number') return (av-bv)*dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
  renderPlayers();
}

function loadTeam(){ try{ return JSON.parse(localStorage.getItem('cl_my_team')||'[]'); }catch{ return []; } }
function saveTeam(){ localStorage.setItem('cl_my_team', JSON.stringify(TEAM)); }

function addToTeam(id){
  if(TEAM.length>=TEAM_LIMIT) return;
  const p = RAW.find(x=>x.id===id);
  if(!p) return;
  if(TEAM.some(x=>x.id===id)) return;
  TEAM.push(p);
  saveTeam();
  renderTeam();
  applyFilters();
}
function removeFromTeam(id){
  TEAM = TEAM.filter(x=>x.id!==id);
  saveTeam();
  renderTeam();
  applyFilters();
}

function wire(){
  document.getElementById('players').addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-add]');
    if(btn){ addToTeam(btn.getAttribute('data-add')); }
  });
  document.getElementById('team').addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-remove]');
    if(btn){ removeFromTeam(btn.getAttribute('data-remove')); }
  });
  document.getElementById('export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify({ team: TEAM }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'),{href:url,download:'capitol-league-team.json'});
    a.click(); URL.revokeObjectURL(url);
  });
  document.getElementById('clear').addEventListener('click', ()=>{
    if(confirm('Clear your roster?')){ TEAM = []; saveTeam(); renderTeam(); applyFilters(); }
  });
  document.getElementById('reset').addEventListener('click', ()=>{
    document.getElementById('q').value='';
    document.getElementById('party').value='';
    document.getElementById('state').value='';
    document.getElementById('sort').value='-score';
    setActiveTab('');
    applyFilters();
  });
  document.getElementById('q').addEventListener('input', debounce(applyFilters, 80));
  document.getElementById('party').addEventListener('change', applyFilters);
  document.getElementById('state').addEventListener('change', applyFilters);
  document.getElementById('sort').addEventListener('change', applyFilters);
  document.getElementById('tabs').addEventListener('click', (e)=>{
    const t = e.target.closest('.chip');
    if(!t) return;
    setActiveTab(t.getAttribute('data-chamber'));
    applyFilters();
  });
}

function setActiveTab(ch){
  ACTIVE_CHAMBER = ch||'';
  document.querySelectorAll('#tabs .chip').forEach(el=>{
    el.classList.toggle('is-active', el.getAttribute('data-chamber')===ACTIVE_CHAMBER);
    if(!ACTIVE_CHAMBER && el.getAttribute('data-chamber')==='') el.classList.add('is-active');
  });
}

async function init(){
  wire();
  renderTeam();
  KPIS = await loadKPIs();
  try{
    const res = await fetch(LEGIS_URL,{cache:'no-store'});
    const data = await res.json();
    RAW = mapMembers(data);
  }catch{ RAW = []; }
  renderStates();
  applyFilters();
}
init();
