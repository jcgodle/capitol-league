
(function(){
  function $(id){ return document.getElementById(id); }
  async function getJSON(path){
    try{ const r = await fetch(path, {cache:'no-store'}); if(!r.ok) throw new Error(r.status+' '+path); return await r.json(); }
    catch(e){ console.warn('Failed to load', path, e); return null; }
  }

  async function init(){
    const weekEl = $('kpiWeek');
    const seasonEl = $('kpiSeason');
    const standingsBody = $('standingsBody');
    const myTeamRow = $('myTeamRow');
    const myTeamTitle = $('myTeamTitle');

    const kpis = await getJSON('kpis.json') || await getJSON('data/kpis.json');
    if(kpis){
      if(weekEl && typeof kpis.week_total !== 'undefined') weekEl.textContent = kpis.week_total;
      if(seasonEl && typeof kpis.season_total !== 'undefined') seasonEl.textContent = kpis.season_total;

      if(standingsBody && Array.isArray(kpis.teams)){
        standingsBody.innerHTML = '';
        kpis.teams.forEach(t=>{
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${t.name||'—'}</td>
                          <td>${t.count ?? '—'}</td>
                          <td>${t.week ?? '—'}</td>
                          <td>${t.season ?? '—'}</td>
                          <td>${t.missed ?? '—'}</td>`;
          standingsBody.appendChild(tr);
        });
      }
      if(myTeamRow && Array.isArray(kpis.my_team)){
        myTeamRow.innerHTML='';
        kpis.my_team.forEach(m=>{
          const div = document.createElement('div');
          div.className='chip';
          div.textContent = m.name || m;
          myTeamRow.appendChild(div);
        });
        if(myTeamTitle){ myTeamTitle.textContent = `My Team — ${kpis.my_team.length}`; }
      }
    }
  }
  if(document.readyState==='complete' || document.readyState==='interactive'){ init(); }
  else document.addEventListener('DOMContentLoaded', init);
})();
