
// js/cards-roster-live.js
// Real roster from the public congress-legislators JSON (no API key required).
// Source documented here: https://github.com/unitedstates/congress-legislators (JSON link on gh-pages).
(function(){
  const grid = document.getElementById('cardGrid');
  if(!grid) return;

  const SRC = "https://unitedstates.github.io/congress-legislators/legislators-current.json";

  function activeRole(roles){
    const today = new Date();
    // pick the current role whose end date is in the future
    return (roles||[]).find(r => r.end && new Date(r.end) > today);
  }

  function cardHTML(m){
    const id = m.id||{};
    const nm = m.name||{};
    const role = activeRole(m.terms||m.roles||m.roles_current||m["terms"]); // be liberal
    const party = role?.party || m.party || "";
    const state = role?.state || m.state || "";
    const chamber = role?.type === "rep" ? "House" : role?.type === "sen" ? "Senate" : (role?.chamber || "");
    const govtrack = id.govtrack;
    const photo = govtrack ? `https://www.govtrack.us/static/legislator-photos/${govtrack}-200px.jpeg` : "";
    const display = [nm.first, nm.middle, nm.last, nm.suffix].filter(Boolean).join(" ").trim() || "Unknown";

    return `<article class="member-card">
      <div class="head">
        <div class="name">${display}</div>
        <div class="meta">${chamber} • ${state} • ${party}</div>
      </div>
      ${photo ? `<img alt="${display}" src="${photo}" style="width:100%;border-radius:12px;margin-top:8px">` : ""}
      <div class="badges">
        ${party?`<span class="badge">${party}</span>`:""}
        ${chamber?`<span class="badge">${chamber}</span>`:""}
        ${state?`<span class="badge">${state}</span>`:""}
      </div>
    </article>`;
  }

  async function init(){
    try{
      const res = await fetch(SRC, {cache:'no-store'});
      if(!res.ok) throw new Error(res.status+" fetching legislators-current.json");
      const list = await res.json();
      // The gh-pages JSON uses one object per member with ids, name, and terms (roles). Normalize.
      const items = list
        .map(x => {
          // Normalize to name/id and most recent/current role
          const roles = x.terms || x.roles || [];
          const r = activeRole(roles) || roles[roles.length-1] || {};
          return {
            id: x.id, name: x.name,
            party: r.party, state: r.state,
            chamber: r.type === "rep" ? "House" : (r.type === "sen" ? "Senate" : ""),
            govtrack: x.id?.govtrack
          };
        })
        .filter(x => x.chamber); // only current members
      grid.innerHTML = items.map(cardHTML).join("");
    }catch(e){
      console.error(e);
      grid.innerHTML = `<div class="page-sub">Could not load roster. Check your network or try again.</div>`;
    }
  }

  if(document.readyState==='complete' || document.readyState==='interactive'){ init(); }
  else document.addEventListener('DOMContentLoaded', init);
})();
