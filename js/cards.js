const FEED = window.CARDS_FEED_URL || 'data/roster.json';
let RAW = [], VIEW = [];

function uniq(a){ return [...new Set(a)]; }
function fmt(n){ return Number(n||0).toLocaleString(); }

function adapt(payload){
  const arr = Array.isArray(payload) ? payload : (payload.players||payload.data||payload.members||[]);
  return arr.map((it, i)=>{
    const id = String(it.id||it.bioguide_id||it.member_id||i);
    const name = (it.name_full || it.display_name || [(it.first_name||''),(it.last_name||'')].join(' ')).trim();
    let chamber = (it.chamber||it.body||it.office||'').toString();
    chamber = /sen/i.test(chamber) ? 'Senate' : /house|rep/i.test(chamber) ? 'House' : '';
    const state = (it.state||it.state_code||'').toString().toUpperCase();
    let party = (it.party||it.party_code||'').toString().toUpperCase();
    if(party.length>1){ party = {DEMOCRATIC:'D',DEMOCRAT:'D',REPUBLICAN:'R',INDEPENDENT:'I'}[party.toUpperCase()] || party[0]; }
    const score = Number(it.score ?? it.rating ?? 0) || 0;
    return {id,name,chamber,state,party,score};
  }).filter(x=>x.name);
}

function renderStates(){
  const sel = document.getElementById('state');
  const states = uniq(RAW.map(p=>p.state)).filter(Boolean).sort();
  sel.innerHTML = '<option value=\"\">All states</option>' + states.map(s=>`<option value=\"${s}\">${s}</option>`).join('');
}

function render(){
  const cont = document.getElementById('cards');
  if(!VIEW.length){ cont.innerHTML = '<div class="muted">No results.</div>'; return; }
  cont.innerHTML = VIEW.map(p=>`<article class="card">
    <div class="muted">${p.chamber} • ${p.state}</div>
    <div class="name">${p.name}</div>
    <div class="muted">Voted ${fmt(p.score)}%</div>
    <div style="margin-top:8px">
      <span class="chip">${p.party||''}</span>
      <span class="chip">${p.state||''}</span>
    </div>
  </article>`).join('');
}

function apply(){
  const q = document.getElementById('q').value.trim().toLowerCase();
  const party = document.getElementById('party').value;
  const st = document.getElementById('state').value;
  const ch = document.getElementById('chamber').value;
  VIEW = RAW.filter(p=>{
    if(ch && p.chamber!==ch) return false;
    if(party && p.party!==party) return false;
    if(st && p.state!==st) return false;
    if(q){
      if(!(p.name.toLowerCase().includes(q) || p.state.toLowerCase().includes(q))) return false;
    }
    return true;
  });
  render();
}

async function init(){
  try{
    const res = await fetch(FEED,{cache:'no-store'});
    const data = await res.json();
    RAW = adapt(data);
  }catch(e){
    RAW = [];
  }
  renderStates();
  apply();
  document.getElementById('q').addEventListener('input', apply);
  document.getElementById('party').addEventListener('change', apply);
  document.getElementById('state').addEventListener('change', apply);
  document.getElementById('chamber').addEventListener('change', apply);
}
init();
