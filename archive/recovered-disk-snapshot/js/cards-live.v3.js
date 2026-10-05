// Live Cards v3: roster + vote stats + "Career" drawer
const LEGIS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';
const ROLES_URL  = 'https://www.govtrack.us/api/v2/role?current=true&limit=1000';

let RAW=[], VIEW=[], ROLES_MAP={};

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

function yearsSince(iso){
  const a = new Date(iso), b = new Date();
  return Math.round(((b-a)/(365.25*24*3600*1000))*10)/10;
}

function isRookie(terms){
  if(!terms || !terms.length) return false;
  // Rookie: first term started within the last 2 years OR only one term so far
  const firstStart = terms[0]?.start || terms[0]?.startdate;
  return terms.length===1 || yearsSince(firstStart) < 2.1;
}

function adapt(list){
  const out=[];
  for(const r of list){
    const id=r.id||{}, terms=r.terms||[], last=terms[terms.length-1]||{};
    const chamber = last.type==='sen'?'Senate':(last.type==='rep'?'House':'');
    if(!chamber) continue;
    const bioguide = id.bioguide || '';
    const govtrack = id.govtrack || '';
    const personRole = govtrack ? ROLES_MAP[govtrack] : null;
    const total = personRole?.total_votes ?? personRole?.votes ?? 0;
    let missed = personRole?.missed_votes ?? 0;
    if(!missed && total && typeof personRole?.missed_votes_pct === 'number'){
      missed = Math.round(total * (personRole.missed_votes_pct/100));
    }
    const attendance = total ? Math.max(0, Math.min(1, 1 - (missed/total))) : 0;
    const score = Math.round(attendance*100);

    out.push({
      id: String(bioguide||govtrack),
      name: (r.name?.official_full || ((r.name?.first||'')+' '+(r.name?.last||''))).trim(),
      party: (last.party||'').slice(0,1).toUpperCase(),
      state: last.state || '',
      chamber,
      bioguide,
      govtrack,
      total_votes: total||0,
      missed_votes: missed||0,
      attendance,
      score,
      tenure: yearsSince(terms[0]?.start || terms[0]?.startdate || last?.start || last?.startdate || new Date().toISOString()),
      rookie: isRookie(terms),
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

function cardHTML(p){
  return `<article class="card" data-id="${p.id}">
    <div class="star" title="Active"></div>
    <div class="hdr">
      <div class="title">United States ${p.chamber}</div>
      <div class="statepill">${p.state}</div>
    </div>
    <div class="imgwrap">${imgHTML(p)}</div>
    <div class="name">${p.name}</div>
    <div class="muted">${p.chamber==='Senate' ? 'Since' : 'Since'} ${''}</div>
    <div class="voted">${p.total_votes ? ('Voted '+fmt(Math.round(p.attendance*100))+'%') : 'No score'}</div>
    <div class="drawer panel">
      <div class="muted" style="font-weight:700;margin-bottom:6px">Career</div>
      <div class="row"><span>Career Tenure</span><strong>${p.tenure.toFixed(1)} yrs</strong></div>
      <div class="row"><span>Total Votes</span><strong>${fmt(p.total_votes)}</strong></div>
      <div class="row"><span>Missed Votes</span><strong>${fmt(p.missed_votes)}</strong></div>
      <div class="row"><span>Attendance</span><strong>${(p.attendance*100).toFixed(1)}%</strong></div>
      <div class="badges">${p.rookie ? '<span class="badge">⭐ Rookie</span>' : ''}</div>
    </div>
    <button class="toggle" data-toggle>Details</button>
  </article>`;
}

function render(){
  const cont=document.getElementById('cards');
  if(!VIEW.length){ cont.innerHTML = '<div class="muted">No results.</div>'; return; }
  cont.innerHTML = VIEW.map(cardHTML).join('');
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

function wire(){
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-toggle]');
    if(t){
      const card = t.closest('.card');
      card.classList.toggle('open');
    }
  });
  document.getElementById('q').addEventListener('input', debounce(apply,100));
  document.getElementById('party').addEventListener('change', apply);
  document.getElementById('state').addEventListener('change', apply);
  document.getElementById('chamber').addEventListener('change', apply);
  document.getElementById('sort').addEventListener('change', apply);
}

async function init(){
  wire();
  try{
    const [legisRes, rolesRes] = await Promise.all([
      fetch(LEGIS_URL,{cache:'no-store'}),
      fetch(ROLES_URL,{cache:'no-store'}),
    ]);
    const [legis, roles] = [await legisRes.json(), await rolesRes.json()];
    // build roles map by person id
    if(roles && roles.objects){
      for(const r of roles.objects){
        const pid = r.person?.id;
        if(pid!=null){
          ROLES_MAP[pid] = {
            total_votes: r.total_votes ?? r.votes ?? 0,
            missed_votes: r.missed_votes ?? 0,
            missed_votes_pct: r.missed_votes_pct
          };
        }
      }
    }
    RAW = adapt(legis);
  }catch(err){
    console.error('Live cards error', err);
    RAW = [];
  }
  renderStates();
  apply();
}
init();
