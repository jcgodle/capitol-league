
(function(){
  const grid = document.getElementById('cardGrid');
  if(!grid) return;

  async function getJSON(path){
    try{ const r = await fetch(path, {cache:'no-store'}); if(!r.ok) throw new Error(r.status+' '+path); return await r.json(); }
    catch(e){ console.warn('Failed to load', path, e); return null; }
  }

  function cardHTML(m){
    const badges = (m.badges||[]).map(b=>`<span class="badge">${b}</span>`).join(' ');
    return `<article class="member-card">
        <div class="head">
          <div class="name">${m.name||'Unknown'}</div>
          <div class="meta">${m.chamber||''} • ${m.state||''} • ${m.party||''}</div>
        </div>
        <div class="badges">${badges}</div>
        <div class="pts ${m.points<0?'negative':''}">${(m.points??0) > 0 ? '+'+m.points : (m.points??0)}</div>
      </article>`;
  }

  function render(list){
    grid.innerHTML = list.map(cardHTML).join('');
  }

  async function init(){
    // Prefer project data/roster.json, fallback to /roster.json
    const roster = await getJSON('data/roster.json') || await getJSON('roster.json');
    if(Array.isArray(roster) && roster.length){
      render(roster);
    }else{
      console.warn('No roster.json found; rendering sample');
      render([
        {name:'Alex Rivera', chamber:'Senate', state:'MO', party:'R', badges:['Incumbent'], points:12},
        {name:'Brooke Chen', chamber:'House', state:'IL', party:'D', badges:['Freshman'], points:5},
        {name:'Carlos Patel', chamber:'Senate', state:'IA', party:'R', badges:['Whip'], points:-2}
      ]);
    }
  }
  if(document.readyState==='complete' || document.readyState==='interactive'){ init(); }
  else document.addEventListener('DOMContentLoaded', init);
})();
