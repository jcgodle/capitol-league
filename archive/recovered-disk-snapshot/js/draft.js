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

// Badge catalog: key → icon + tooltip text
const BADGE_META = {
  ironman:   { icon: "⏰", label: "Iron Man",       desc: "High attendance in votes" },
  parttimer:{ icon: "🌙", label: "Part-Timer",     desc: "Low attendance or many missed votes" },
  workhorse:{ icon: "📚", label: "Workhorse",      desc: "Heavy workload / activity in Congress" },

  loyalist: { icon: "🧱", label: "Loyalist",       desc: "Usually votes with their party" },
  rebel:    { icon: "⚡", label: "Rebel",          desc: "Often breaks with their party" },
  moderate: { icon: "⚖️", label: "Moderate",      desc: "Mixed voting record between party and cross-party" },

  rookie:   { icon: "⭐", label: "Rookie",         desc: "First term in this chamber" },
  veteran:  { icon: "🏆", label: "Veteran",        desc: "Long-time member of this chamber" },
  power:    { icon: "🏛️", label: "Power Broker",  desc: "Leadership or key committee roles" }
};

function fmtNum(n){ return Number(n || 0).toLocaleString(); }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); } }
function uniq(arr){ return Array.from(new Set(arr)); }

async function loadKPIs(){
  try{
    const res = await fetch(KPI_URL,{cache:'no-store'});
    if(!res.ok) return {};
    const data = await res.json();
    return data || {};
  }catch{
    return {};
  }
}

function initials(name){
  const parts = String(name || "").split(/\s+/).filter(Boolean);
  if(!parts.length) return "";
  const first = parts[0][0] || "";
  const last  = parts.length > 1 ? parts[parts.length-1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Map raw legislators-current.json into our shape.
 * If KPIs include badges or scores, we pull them in.
 */
function mapMembers(list){
  return list.map(r=>{
    const id    = r.id || {};
    const terms = r.terms || [];
    const last  = terms[terms.length-1] || {};

    const chamber =
      last.type === 'sen' ? 'Senate' :
      last.type === 'rep' ? 'House'  : '';

    const govtrack = id.govtrack;
    const bioguide = id.bioguide || "";

    const k = KPIS[govtrack] || {};
    const totalVotes  = Number(k.total_votes || 0);
    const missedVotes = Number(k.missed_votes || 0);
    const attendance  = totalVotes > 0 ? (1 - missedVotes / totalVotes) : 0;

    let score = typeof k.score === "number"
      ? k.score
      : Math.round(attendance * 100);

    if (Number.isNaN(score)) score = 0;

    // cost kept internally only, in case we ever want snake/cap hybrids
    const cost = Math.max(1, Math.round(score * 0.7 + 10));

    // Local-first avatars: images/members/BIOSID.jpg
    const avatarLocal  = bioguide ? `images/members/${bioguide}.jpg` : "";
    // Remote fallback only if local is missing
    const avatarRemote = bioguide ? `https://theunitedstates.io/images/congress/225x275/${bioguide}.jpg` : "";

    const badges = Array.isArray(k.badges) ? k.badges : [];

    return {
      id: String(bioguide || govtrack || Math.random()),
      name: (r.name?.official_full || ((r.name?.first || '') + ' ' + (r.name?.last || ''))).trim(),
      party: (last.party || "").slice(0,1).toUpperCase(),
      state: last.state || "",
      chamber,
      score,
      cost,
      bioguide,
      avatarLocal,
      avatarRemote,
      badges
    };
  }).filter(m => m.chamber && m.name);
}

function renderStates(){
  const sel = document.getElementById('state');
  const states = uniq(RAW.map(p=>p.state)).sort();
  sel.innerHTML = '<option value="">All states</option>' +
    states.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function partyClass(p){ return p === 'D' ? 'is-active' : ''; }

function renderAvatar(p){
  const init = initials(p.name);
  if (p.avatarLocal || p.avatarRemote){
    const primary  = p.avatarLocal || p.avatarRemote;
    const fallback = p.avatarLocal && p.avatarRemote ? p.avatarRemote : "";
    const fallbackAttr = fallback ? ` data-fallback="${fallback}"` : "";
    return `
      <div class="player-avatar">
        <img src="${primary}" alt="${p.name}" class="player-avatar-img"${fallbackAttr}
             onerror="if(this.dataset.fallback && !this.dataset.tried){this.dataset.tried='1';this.src=this.dataset.fallback;}else{this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.style.display='flex';}}">
        <div class="player-avatar-fallback">${init}</div>
      </div>
    `;
  }
  return `
    <div class="player-avatar">
      <div class="player-avatar-fallback">${init}</div>
    </div>
  `;
}

function renderBadges(p){
  if (!p.badges || !p.badges.length) return "";
  const items = p.badges.map(key=>{
    const meta = BADGE_META[key];
    if (!meta) return "";
    const title = `${meta.label} – ${meta.desc}`;
    return `<span class="badge-icon" title="${title}">${meta.icon}</span>`;
  }).filter(Boolean);
  if (!items.length) return "";
  return `<div class="player-badges">${items.join('')}</div>`;
}

function renderPlayers(){
  const tbody = document.getElementById('player-rows');
  if(!VIEW.length){
    tbody.innerHTML = `<tr><td colspan="4" class="muted">No players match your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = VIEW.map(p=>{
    const disabled = TEAM.some(t=>t.id === p.id) || (TEAM.length >= TEAM_LIMIT);
    return `<tr>
      <td>
        <div class="player-cell">
          <div class="player-name-row">
            ${renderAvatar(p)}
            <div class="player-name-block">
              <div class="player-name">${p.name}</div>
              <div class="player-sub">${p.state} • ${p.chamber}</div>
              ${renderBadges(p)}
            </div>
          </div>
        </div>
      </td>
      <td><span class="chip ${partyClass(p.party)}">${p.party}</span></td>
      <td>${fmtNum(p.score)}</td>
      <td style="text-align:right">
        <button class="chip ${disabled ? '' : 'is-active'}" data-add="${p.id}" ${disabled ? 'disabled' : ''}>Draft</button>
      </td>
    </tr>`;
  }).join('');
}

function renderTeam(){
  const wrap  = document.getElementById('team-list');
  const empty = document.getElementById('empty-team');
  const cap   = document.getElementById('cap');

  empty.style.display = TEAM.length ? 'none' : 'block';
  cap.textContent = `${TEAM.length} / TEAM_LIMIT`.replace('TEAM_LIMIT', TEAM_LIMIT);

  wrap.innerHTML = TEAM.map(p => `
    <div class="team-card">
      <div class="team-card-main">
        <div style="display:flex;gap:8px;align-items:center;min-width:0;">
          ${renderAvatar(p)}
          <div style="min-width:0;">
            <div class="team-card-title">${p.name}</div>
            <div class="team-card-meta">
              <span>${p.chamber}</span>
              <span>${p.state}</span>
              ${p.party ? `<span>${p.party}</span>` : ''}
            </div>
            ${renderBadges(p)}
          </div>
        </div>
        <div style="text-align:right;">
          <div class="team-card-meta">Score</div>
          <div class="team-card-title">${fmtNum(p.score)}</div>
        </div>
      </div>
      <div class="team-card-actions">
        <button class="btn-small" data-remove="${p.id}">Remove</button>
      </div>
    </div>
  `).join('');

  const rosterSizeEl = document.getElementById('roster-size');
  if (rosterSizeEl) rosterSizeEl.textContent = TEAM.length;

  const avg = TEAM.length
    ? (TEAM.reduce((a,b)=>a + (b.score || 0), 0) / TEAM.length)
    : 0;
  document.getElementById('avg-score').textContent = avg.toFixed(1);
}

function applyFilters(){
  const q     = document.getElementById('q').value.trim().toLowerCase();
  const party = document.getElementById('party').value;
  const st    = document.getElementById('state').value;
  const sort  = document.getElementById('sort').value;

  VIEW = RAW.filter(p=>{
    if (ACTIVE_CHAMBER && p.chamber !== ACTIVE_CHAMBER) return false;
    if (party && p.party !== party) return false;
    if (st && p.state !== st) return false;
    if (q){
      const hay = `${p.name} ${p.state}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const dir = sort.startsWith('-') ? -1 : 1;
  const key = sort.replace(/^-/,'');
  VIEW.sort((a,b)=>{
    const av = (a[key] ?? '');
    const bv = (b[key] ?? '');
    if (typeof av === 'number' && typeof bv === 'number') return (av-bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  renderPlayers();
}

// storage helpers
function loadTeam(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }catch{
    return [];
  }
}

function saveTeam(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(TEAM));
}

function addToTeam(id){
  if (TEAM.length >= TEAM_LIMIT) return;
  const p = RAW.find(x=>x.id === id);
  if (!p) return;
  if (TEAM.some(x=>x.id === id)) return;
  TEAM.push(p);
  saveTeam();
  renderTeam();
  applyFilters();
}

function removeFromTeam(id){
  TEAM = TEAM.filter(x=>x.id !== id);
  saveTeam();
  renderTeam();
  applyFilters();
}

function wire(){
  document.getElementById('players').addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-add]');
    if (btn){ addToTeam(btn.getAttribute('data-add')); }
  });

  document.getElementById('team').addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-remove]');
    if (btn){ removeFromTeam(btn.getAttribute('data-remove')); }
  });

  document.getElementById('export').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify({ team: TEAM }, null, 2)], {type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: 'capitol-league-team.json'
    });
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('clear').addEventListener('click', ()=>{
    if (confirm('Clear your roster?')){
      TEAM = [];
      saveTeam();
      renderTeam();
      applyFilters();
    }
  });

  document.getElementById('reset').addEventListener('click', ()=>{
    document.getElementById('q').value = '';
    document.getElementById('party').value = '';
    document.getElementById('state').value = '';
    document.getElementById('sort').value = '-score';
    setActiveTab('');
    applyFilters();
  });

  document.getElementById('q').addEventListener('input', debounce(applyFilters, 80));
  document.getElementById('party').addEventListener('change', applyFilters);
  document.getElementById('state').addEventListener('change', applyFilters);
  document.getElementById('sort').addEventListener('change', applyFilters);

  document.getElementById('tabs').addEventListener('click', (e)=>{
    const t = e.target.closest('.chip');
    if (!t) return;
    setActiveTab(t.getAttribute('data-chamber'));
    applyFilters();
  });
}

function setActiveTab(ch){
  ACTIVE_CHAMBER = ch || '';
  document.querySelectorAll('#tabs .chip').forEach(el=>{
    const val = el.getAttribute('data-chamber') || '';
    el.classList.toggle('is-active', val === ACTIVE_CHAMBER);
    if (!ACTIVE_CHAMBER && val === '') el.classList.add('is-active');
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
  }catch{
    RAW = [];
  }
  renderStates();
  applyFilters();
}
init();
