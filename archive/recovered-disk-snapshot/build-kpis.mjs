// build-kpis.mjs
// Node 18+ required (has global fetch).
// Builds ../kpis.json relative to this script by default.

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
let out = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'kpis.json');
let verbose = true;
for (let i=0; i<args.length; i++){
  if (args[i]==='--out') { out = path.resolve(args[i+1]); i++; }
  else if (args[i]==='--quiet') { verbose = false; }
}
const log = (...a)=>{ if(verbose) console.log('[kpi-builder]', ...a); };

async function j(u){
  const r = await fetch(u, { cache: 'no-store' });
  if(!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  return r.json();
}

function getId(role){
  if (!role) return null;
  if (role.person && typeof role.person === 'object' && 'id' in role.person) return role.person.id;
  if (typeof role.person === 'number') return role.person;
  if ('person_id' in role && role.person_id != null) return role.person_id;
  if ('person__id' in role && role.person__id != null) return role.person__id;
  return null;
}

function addRoleToMap(map, role){
  const pid = getId(role);
  if (pid==null) return;
  const total = (('total_votes' in role) ? role.total_votes : (('votes' in role) ? role.votes : 0)) || 0;
  let missed = ('missed_votes' in role) ? role.missed_votes : null;
  const pct = ('missed_votes_pct' in role) ? role.missed_votes_pct : null;
  if (missed==null && pct!=null && total){
    missed = Math.round(total * pct / 100);
  }
  const existing = map.get(pid) || { total_votes: 0, missed_votes: 0 };
  if (total > existing.total_votes) {
    map.set(pid, { total_votes: total, missed_votes: missed || 0 });
  } else if (!map.has(pid)) {
    map.set(pid, { total_votes: total, missed_votes: missed || 0 });
  }
}

async function buildKPIs(){
  const base = 'https://www.govtrack.us/api/v2/role?current=true&limit=200';
  const first = await j(base);
  const total = first?.meta?.total_count ?? (first?.objects?.length||0);
  const limit = first?.meta?.limit ?? 200;
  const map = new Map();
  log('First page size:', first?.objects?.length || 0, 'Total count:', total);

  (first.objects || []).forEach(r => addRoleToMap(map, r));

  for (let offset = limit; offset < total; offset += limit){
    const page = await j(base + '&offset=' + offset);
    log('Fetched offset', offset, 'count', page?.objects?.length || 0);
    (page.objects || []).forEach(r => addRoleToMap(map, r));
  }

  // Convert to plain object keyed by govtrack person id
  const outMap = {};
  for (const [pid, val] of map.entries()){
    outMap[pid] = val;
  }
  return outMap;
}

(async () => {
  try{
    const data = await buildKPIs();
    const json = JSON.stringify(data, null, 2);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, json, 'utf8');
    console.log('Wrote', Object.keys(data).length, 'entries to', out);
    console.log('Done. Close this window, then reload your cards page.');
  }catch(e){
    console.error('Build failed:', e?.message || e);
    process.exit(1);
  }
})();
