// Live Cards (v2): photo fallback chain + live roster
const LEGIS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';
let RAW=[], VIEW=[];

function uniq(a){ return [...new Set(a)] }
function fmt(n){ return Number(n||0).toLocaleString(); }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); } }

function photoChain(bioguide, govtrack){
  const chain = [];
  if(bioguide){
    chain.push(`https://theunitedstates.io/images/congress/225x275/${bioguide}.jpg`);
    chain.push(`https://bioguide.congress.gov/bioguide/photo/${bioguide[0]}/${bioguide}.jpg`);
  }
  if(govtrack){ chain.push(`https://www.govtrack.us/static/legislator-photos/${govtrack}-200px.jpeg`); }
  return chain;
}

function adapt(list){
  const out=[];
  for(const r of list){
    const id=r.id||{}, terms=r.terms||[], last=terms[terms.length-1]||{};
    const chamber = last.type==='sen'?'Senate':(last.type==='rep'?'House':'');
    if(!chamber) continue;
    const bioguide = id.bioguide || '';
    const govtrack = id.govtrack || '';
    // naive score placeholder; real attendance can be added later from KPIs or GovTrack roles
    const score = 0;
    out.push({
      id: String(bioguide||govtrack),
      name: (r.name?.official_full || ((r.name?.first||'')+' '+(r.name?.last||''))).trim(),
      party: (last.party||'').slice(0,1).toUpperCase(),
      state: last.state || '',
      chamber,
      bioguide,
      govtrack,
      photos: photoChain(bioguide, govtrack)
    });
  }
  return out;
}

function imgHTML(p){
  if(!p.photos.length){ return `<span class="nop">No Photo</span>`; }
  const src = p.photos[0];
  return `<img src="${src}" alt="${p.name}" data-idx="0" data-a="${encodeURIComponent(p.photos.join('|'))}" onerror="window._clNextPhoto && window._clNextPhoto(this)" loading="lazy">`;
}

window._clNextPhoto = function(img){
  try{
    const idx = parseInt(img.getAttribute('data-idx')||'0',10);
    const all = decodeURIComponent(img.getAttribute('data-a')||'').split('|').filter(Boolean);
    const next = all[idx+1];
    if(next){
      img.setAttribute('data-idx', String(idx+1));
      img.src = next;
    }else{
      img.replaceWith(Object.assign(document.createElement('span'),{className:'nop',textContent:'No Photo'}));
    }
  }catch{ /* swallow */ }
};

function renderStates(){
  const sel=document.getElementById('state');
  const states=uniq(RAW.map(x=>x.state)).filter(Boolean).sort();
  sel.innerHTML='<option value=\"\">All states</option>'+states.map(s=>`<option value=\"${s}\">${s}</option>`).join('');
}

function render(){
  const cont=document.getElementById('cards');
  if(!VIEW.length){ cont.innerHTML = '<div class="muted">No results.</div>'; return; }
  cont.innerHTML = VIEW.map(p=>`<article class="card">
    <div class="imgwrap">${imgHTML(p)}</div>
    <div class="muted">${p.chamber} • ${p.state}</div>
    <div class="name">${p.name}</div>
    <div class="muted">${p.score ? `Voted ${fmt(p.score)}%` : `No score`}</div>
    <div style="margin-top:8px">
      <span class="chip">${p.party||''}</span>
      <span class="chip">${p.state||''}</span>
    </div>
  </article>`).join('');
}

function apply(){
  const q=document.getElementById('q').value.trim().toLowerCase();
  const party=document.getElementById('party').value;
  const st=document.getElementById('state').value;
  const ch=document.getElementById('chamber').value;
  const sort=document.getElementById('sort').value;
  VIEW = RAW.filter(p=>{
    if(ch && p.chamber!==ch) return false;
    if(party && p.party!==party) return false;
    if(st && p.state!==st) return false;
    if(q && !(p.name.toLowerCase().includes(q) || p.state.toLowerCase().includes(q))) return false;
    return true;
  });
  const dir = sort.startsWith('-')?-1:1;
  const key = sort.replace(/^-/,'');
  VIEW.sort((a,b)=>{
    const av=a[key], bv=b[key];
    if(key==='name') return String(av).localeCompare(String(bv))*dir;
    return (av-bv)*dir;
  });
  render();
}

async function init(){
  try{
    const res = await fetch(LEGIS_URL,{cache:'no-store'});
    const data = await res.json();
    RAW = adapt(data);
  }catch{ RAW = []; }
  renderStates();
  apply();
  document.getElementById('q').addEventListener('input', debounce(apply,100));
  document.getElementById('party').addEventListener('change', apply);
  document.getElementById('state').addEventListener('change', apply);
  document.getElementById('chamber').addEventListener('change', apply);
  document.getElementById('sort').addEventListener('change', apply);
}
init();
