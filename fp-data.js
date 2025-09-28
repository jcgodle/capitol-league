
// v7.1.3-dev adaptive data loader
(function(){
  async function tryFetch(paths){
    for(const p of paths){
      try{
        const r = await fetch(`data/${p}`, {cache:'no-cache'});
        if(r.ok) return await r.json();
      }catch(e){/*continue*/}
    }
    return null;
  }

  // Normalize members -> array of people with {id, first, last, party, state, chamber, since}
  function normalizeMembers(raw){
    if(!raw) return [];
    const arr = Array.isArray(raw) ? raw : (raw.members || raw.data || raw.items || []);
    return arr.map(m => {
      const first = m.first || m.first_name || m.firstname || m.given_name || "";
      const last  = m.last || m.last_name || m.lastname || m.family_name || "";
      const party = m.party || m.party_code || m.p || m.Party || "";
      const state = (m.state || m.state_code || m.st || m.State || "").toString().toUpperCase();
      const chamber = (m.chamber || m.body || m.ch || m.office || "").toString().toUpperCase().includes("HOUSE") ? "HOUSE"
                      : (m.chamber || m.body || m.ch || m.office || "").toString().toUpperCase().includes("SEN") ? "SENATE"
                      : (m.role || "").toString().toUpperCase().includes("SEN") ? "SENATE"
                      : (m.role || "").toString().toUpperCase().includes("HOUSE") ? "HOUSE"
                      : "SENATE";
      const since = m.since || m.term_start || m.start_year || m.year || "";
      const id = m.id || m.bioguide_id || m.govtrack || [party,state,first,last].join("-");
      return { id, first, last, party, state, chamber, since };
    }).filter(p=>p.first && p.last);
  }

  function parseDate(s){
    if(!s) return null;
    const t = Date.parse(s);
    if(!isNaN(t)) return new Date(t);
    // try mm/dd/yyyy
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s));
    if(m) return new Date(+m[3], +m[1]-1, +m[2]);
    return null;
  }

  // Normalize votes -> array of {bill, chamber, result, yes, no, date}
  function normalizeVotes(raw){
    if(!raw) return [];
    const arr = Array.isArray(raw) ? raw
              : (raw.votes || raw.items || raw.data || raw.rolls || raw.roll_calls || []);
    return arr.map(v => {
      const bill = v.bill || v.title || v.measure || v.number || v.name || "";
      const chamber = (v.chamber || v.body || v.house || "").toString();
      const result = v.result || v.outcome || v.passed || v.status || "";
      const yes = v.yes ?? v.yea ?? v.ayes ?? v.for ?? v.Yeas ?? v.Ayes ?? null;
      const no  = v.no  ?? v.nay ?? v.nays ?? v.against ?? v.Nays ?? null;
      const date = v.date || v.roll_date || v.voted_at || v.datetime || v.day || "";
      return { bill, chamber, result, yes, no, date };
    });
  }

  async function loadMembers(){
    const raw = await tryFetch(["members.json","career_seed.json","boxscore_season.json"]);
    return normalizeMembers(raw);
  }

  async function loadVotes30d(){
    const raw = await tryFetch(["votes_last_30d.json","votes_recent.json","week_rolls.json","boxscore_week.json"]);
    const all = normalizeVotes(raw);
    // filter last 30 days from now (client clock)
    const now = Date.now();
    const days30 = 30*24*60*60*1000;
    return all.filter(v => {
      const d = parseDate(v.date);
      return d && (now - d.getTime() <= days30);
    });
  }

  window.fpData = {
    senators: async ()=> (await loadMembers()).filter(m=>m.chamber==="SENATE"),
    house:    async ()=> (await loadMembers()).filter(m=>m.chamber==="HOUSE"),
    members:  loadMembers,
    votesLast30d: loadVotes30d
  };
})();
