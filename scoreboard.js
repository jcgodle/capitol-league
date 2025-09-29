// Sample data
const TEAM = [
  {id:"A1",name:"Alex Brewer",party:"D",state:"WI",initials:"AB",scores:{week:128,season:412,career:2011}},
  {id:"B2",name:"Casey Stone",party:"R",state:"TX",initials:"CS",scores:{week:96,season:305,career:1540}},
  {id:"C3",name:"Jordan Moss",party:"I",state:"VT",initials:"JM",scores:{week:77,season:221,career:1204}},
  {id:"D4",name:"Lena Kay",party:"D",state:"CA",initials:"LK",scores:{week:71,season:190,career:1002}},
  {id:"E5",name:"Ray Boone",party:"R",state:"OH",initials:"RB",scores:{week:64,season:178,career:954}}
];
const VOTES = {
  week:[
    {id:'s-575', bill_number:'S. 575', title:'Disaster Relief Supplemental', chamber:'Senate', date:'2025-08-22', result:'Passed', yes:70, no:28, summary:'Hurricane and wildfire aid.'},
    {id:'hr-1010', bill_number:'H.R. 1010', title:'Border Infrastructure Upgrade', chamber:'House', date:'2025-08-24', result:'Passed', yes:299, no:126, summary:'Ports of entry modernization.'},
    {id:'s-560', bill_number:'S. 560', title:'Student Loan Refinancing', chamber:'Senate', date:'2025-08-26', result:'Failed', yes:46, no:54, summary:'Rate caps and refinance window.'}
  ],
  season:[]
};

let SCOPE = "week";
const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);

document.addEventListener("DOMContentLoaded", () => {
  bindUI();
  setScope(SCOPE);
});

function bindUI(){
  const tabs = $('#scopeTabs');
  tabs.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-scope]'); if(!btn) return;
    SCOPE = btn.dataset.scope;
    [...tabs.querySelectorAll('button')].forEach(b=>b.classList.toggle('active', b===btn));
    setScope(SCOPE);
  });
  $('#partyBtn').onclick = () => alert('Party filter coming soon');
  $('#stateBtn').onclick  = () => alert('State filter coming soon');
  $('#badgesBtn').onclick = () => alert('Badges filter coming soon');
}

function setScope(scope){
  const total = TEAM.reduce((s,m)=> s + (m.scores?.[scope] ?? 0), 0);
  $('#scoreTotal').textContent = new Intl.NumberFormat().format(total);
  $('#scoreCaption').textContent = `Total points · ${cap(scope)}`;
  $('#votesSection').style.display = scope==="career" ? "none" : "block";
  renderVotes(scope);
}

function renderVotes(scope){
  const list = $('#votesList'); list.innerHTML='';
  const rows = VOTES[scope] || [];
  if(!rows.length){ list.innerHTML = '<div class="muted">No votes available.</div>'; return; }
  rows.forEach(v => list.appendChild(voteCard(v)));
}

function voteCard(v){
  const id = v.id || (v.bill_number||v.title||'bill').toLowerCase().replace(/\s+/g,'-');
  const passed = (v.result||'').toLowerCase()==='passed';
  const yeas = v.yes ?? v.yeas ?? 0, nays = v.no ?? v.nays ?? 0;
  const dateTxt = v.date ? new Date(v.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '';
  const chamber = (v.chamber||'').replace(/^[a-z]/,m=>m.toUpperCase());

  const el = document.createElement('article');
  el.className='vote'; el.id='vote-'+id;
  el.innerHTML = `
    <header>
      <div>
        <div class="bill">${esc(v.bill_number||v.title||'Bill')} — ${esc(v.title||'')}</div>
        <div class="meta">${esc(chamber)}${dateTxt?' · '+dateTxt:''}</div>
      </div>
      <div class="badges">
        <span class="badge ${passed?'pass':'fail'}">${passed?'Passed':'Failed'}</span>
        <span class="badge">Yeas ${yeas}</span>
        <span class="badge">Nays ${nays}</span>
      </div>
    </header>
    <div class="body">
      <div class="panel">
        <div style="margin-bottom:8px;color:var(--muted)">${esc(v.summary||'')}</div>
        <div class="grid">
          <div class="kv"><b>Bill Number</b><span>${esc(v.bill_number||'-')}</span></div>
          <div class="kv"><b>Result</b><span>${passed?'Passed':'Failed'} (${yeas}–${nays})</span></div>
          <div class="kv"><b>Chamber</b><span>${esc(chamber||'-')}</span></div>
          <div class="kv"><b>Date</b><span>${dateTxt||'-')}</span></div>
        </div>
        <div class="party-legend">
          <span><i style="background:#b24a4a"></i>R</span>
          <span><i style="background:#4a77d3"></i>D</span>
          <span><i style="background:#d3b84a"></i>I</span>
        </div>
        <div class="bar" aria-label="Party distribution">
          <i class="r" style="width:34%"></i>
          <i class="d" style="width:58%;left:34%"></i>
          <i class="i" style="width:8%;left:92%"></i>
        </div>
        <div class="statrow">
          <div class="kv"><b>R</b><span>Yeas 110 · Nays 120</span></div>
          <div class="kv"><b>D</b><span>Yeas 170 · Nays 25</span></div>
          <div class="kv"><b>I</b><span>Yeas 7 · Nays 0</span></div>
        </div>
      </div>
      <aside class="panel">
        <div class="btns">
          <button class="tool" data-copy>Copy link</button>
          <button class="tool" onclick="location.href='votes.html'">Open in Votes</button>
        </div>
      </aside>
    </div>
  `;
  el.querySelector('header').addEventListener('click', ()=>{
    document.querySelectorAll('.vote.open').forEach(n=>{ if(n!==el) n.classList.remove('open'); });
    el.classList.toggle('open');
  });
  el.addEventListener('click', e=>{
    if(e.target.matches('[data-copy]')){
      const h = location.href.split('#')[0] + '#' + el.id;
      navigator.clipboard?.writeText(h);
    }
  });
  return el;
}
