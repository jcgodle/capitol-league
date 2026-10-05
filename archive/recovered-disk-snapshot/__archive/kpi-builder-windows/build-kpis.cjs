// build-kpis.cjs — CommonJS (works even if your project is "type":"module")
// Node 18+ required (global fetch). Double‑click build-kpis.cmd to run.
//
// Change in v2: explicitly requests fields=person__id,total_votes,missed_votes,missed_votes_pct,votes
// to ensure we always receive a usable person id.

const fs = require('fs');
const path = require('path');

function log(...a){ console.log('[kpi-builder]', ...a); }

async function j(u){
  const r = await fetch(u, { cache: 'no-store' });
  if(!r.ok) throw new Error(`HTTP ${r.status} ${u}`);
  return r.json();
}

function getId(role){
  if (role && role.person__id != null) return role.person__id;
  if (role && typeof role.person === 'object' && role.person && role.person.id != null) return role.person.id;
  if (role && typeof role.person === 'number') return role.person;
  if (role && role.person_id != null) return role.person_id;
  return null;
}

function addRole(map, role){
  const pid = getId(role);
  if (pid==null) return false;
  const total = (('total_votes' in role) ? role.total_votes : (('votes' in role) ? role.votes : 0)) || 0;
  let missed = ('missed_votes' in role) ? role.missed_votes : null;
  const pct = ('missed_votes_pct' in role) ? role.missed_votes_pct : null;
  if (missed==null && pct!=null && total){
    missed = Math.round(total * pct / 100);
  }
  const prev = map.get(pid) || { total_votes: 0, missed_votes: 0 };
  if (total > prev.total_votes) {
    map.set(pid, { total_votes: total, missed_votes: missed || 0 });
  } else if (!map.has(pid)) {
    map.set(pid, { total_votes: total, missed_votes: missed || 0 });
  }
  return true;
}

(async () => {
  try{
    const fields = 'person__id,total_votes,missed_votes,missed_votes_pct,votes';
    const base = 'https://www.govtrack.us/api/v2/role?current=true&limit=200&fields=' + encodeURIComponent(fields);
    log('Fetching first page…');
    const first = await j(base);
    const total = first?.meta?.total_count ?? (first?.objects?.length || 0);
    const limit = first?.meta?.limit ?? 200;
    log('First page objects:', first?.objects?.length || 0, 'Total count:', total);

    const map = new Map();
    let added = 0, missingId = 0;
    (first.objects || []).forEach(r => added += addRole(map, r) ? 1 : 0);
    (first.objects || []).forEach(r => { if (!getId(r)) missingId++; });

    for (let offset = limit; offset < total; offset += limit){
      const pageUrl = base + '&offset=' + offset;
      log('Fetching', pageUrl);
      const page = await j(pageUrl);
      (page.objects || []).forEach(r => added += addRole(map, r) ? 1 : 0);
      (page.objects || []).forEach(r => { if (!getId(r)) missingId++; });
    }

    const out = {};
    for (const [pid, val] of map.entries()) out[pid] = val;

    const outPath = path.resolve(__dirname, '..', 'kpis.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    console.log('Wrote', Object.keys(out).length, 'unique people (from', added, 'roles; missingId:', missingId, ') to', outPath);
    console.log('Done. Close this window, then reload your cards page.');
  }catch(e){
    console.error('Build failed:', e?.message || e);
    process.exit(1);
  }
})();
