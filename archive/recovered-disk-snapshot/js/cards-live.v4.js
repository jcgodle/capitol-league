// Live Cards v4: flip UI + GovTrack attendance (missed_votes_pct fallback)
const LEGIS_URL = 'https://unitedstates.github.io/congress-legislators/legislators-current.json';
const ROLES_URL  = 'https://www.govtrack.us/api/v2/role?current=true&limit=600';

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

function adapt(legislators){
  const out=[];
  for(const r of legislators){
    const id=r.id||{}, terms=r.terms||[], last=terms[terms.length-1]||{};
    const chamber = last.type==='sen'?'Senate':(last.type==='rep'?'House':'');
    if(!chamber) continue;
    const bioguide = id.bioguide || '';
    const govtrack = id.govtrack || '';
    const role = govtrack ? ROLES_MAP[govtrack] : null;

    const totalVotes = (role && (role.total_votes ?? role.votes)) || 0;
    let missedVotes = (role && role.missed_votes) || 0;
    const missedPct = (role && typeof role.missed_votes_pct === 'number') ? role.missed_votes_pct : null;
    const attendancePct = (totalVotes>0 && missedVotes>=0) ? (100 - (missedVotes/totalVotes)*100)
                          : (missedPct!=null ? (100 - missedPct) : null);

    out.push({
      id: String(bioguide||govtrack),
      name: (r.name?.official_full || ((r.name?.first||'')+' '+(r.name?.last||''))).trim(),
      party: (last.party||'').slice(0,1).toUpperCase(),
      state: last.state || '',
      chamber,
      bioguide,
      govtrack,
      tenure: yearsSince(terms[0]?.start || terms[0]?.startdate || last?.start || last?.startdate || new Date().toISOString()),
      total_votes: totalVotes || null,
      missed_votes: (missedVotes || (missedPct!=null && totalVotes ? Math.round(totalVotes*missedPct/100) : null)),
      attendance_pct: attendancePct,
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
  }catch{}
};

function frontHTML(p){
  const voted = (p.attendance_pct!=null) ? `Voted ${p.attendance_pct.toFixed(1)}%` : 'No score';
  return `<div class="side front">
    <div class="hdr"><div class="title">United States ${p.chamber}</div><div class="statepill">${p.state}</div></div>
    <div class="imgwrap">${imgHTML(p)}</div>
    <div class="name">${p.name}</div>
    <div class="muted">${p.chamber==='Senate'?'Since':'Since'} </div>
    <div class="voted">${voted}</div>
    <button class="flipbtn" data-flip>Details</button>
  </div>`;
}
function row(label, value){ return `<div class="row"><span>${label}</span><strong>${value}</strong></div>`; }
function backHTML(p){
  return `<div class="side back">
    <div class="hdr"><div class="title">Career</div><div class="statepill">${p.state}</div></div>
    ${row('Career Tenure', (p.tenure!=null? p.tenure.toFixed(1)+' yrs' : '—'))}
    ${row('Total Votes', (p.total_votes!=null? fmt(p.total_votes): '—'))}
    ${row('Missed Votes', (p.missed_votes!=null? fmt(p.missed_votes): '—'))}
    ${row('Attendance', (p.attendance_pct!=null? p.attendance_pct.toFixed(1)+'%':'—'))}
    <button class="flipbtn" data-flip>Back</button>
  </div>`;
}

function cardHTML(p){
  return `<article class="card3d" data-id="${p.id}">
    <div class="card">${frontHTML(p)}${backHTML(p)}</div>
  </article>`;
}

function renderStates(){
  const sel=document.getElementById('state');
  const states=uniq(RAW.map(x=>x.state)).filter(Boolean).sort();
  sel.innerHTML='<option value=\"\">All states</option>'+states.map(s=>`<option value=\"${s}\">${s}</option>`).join('');
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
  document.addEventListener('click',(e)=>{
    const flip = e.target.closest('[data-flip]');
    if(flip){
      const host = flip.closest('.card');
      host.classList.toggle('is-flipped');
    }
  });
  document.getElementById('q').addEventListener('input', debounce(apply,120));
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
    // roles map by person.id
    if(roles && roles.objects){
      for(const r of roles.objects){
        const pid = r.person && r.person.id;
        if(pid!=null){
          ROLES_MAP[pid] = {
            total_votes: (("total_votes" in r)? r.total_votes : ("votes" in r ? r.votes : null)),
            missed_votes: r.missed_votes ?? null,
            missed_votes_pct: r.missed_votes_pct ?? null
          };
        }
      }
    }
    RAW = adapt(legis);
  }catch(err){
    console.warn('Live cards error', err);
    RAW = [];
  }
  renderStates();
  apply();
}
init();
