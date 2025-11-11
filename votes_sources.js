// votes_sources.js
// Primary: Congress.gov API (House votes, date range + pagination).
// Output is a normalized array used by votes.js: [{...}, ...].

const CONGRESS_KEY =
  (window.CAPITOL_CFG && window.CAPITOL_CFG.CONGRESS_KEY) ||
  '';

const API_BASE = 'https://api.congress.gov/v3';
const PAGE_SIZE = 250;     // congress.gov max page size
const CONCURRENCY = 5;     // limit detail fetches so we don't hammer the API

export async function fetchHouseVotes({ from, to, cap = Infinity }) {
  if (!CONGRESS_KEY) throw new Error('Missing CONGRESS_KEY. Set it in config.js');

  // 1) List votes in the range (House only), newest first
  const listed = await listVotes({ from, to, cap });

  // 2) Hydrate each vote with detailed totals (yea/nay/present/not voting)
  const detailed = await hydrateDetails(listed, cap);

  // 3) Normalize into the shape the UI expects
  return detailed.map(normalizeVote).filter(Boolean);
}

/* --------------------------- helpers --------------------------- */

async function listVotes({ from, to, cap }) {
  let offset = 0;
  const out = [];

  while (out.length < cap) {
    const url = new URL(`${API_BASE}/vote`);
    url.searchParams.set('chamber', 'house');
    url.searchParams.set('fromDate', from);
    url.searchParams.set('toDate', to);
    url.searchParams.set('format', 'json');
    url.searchParams.set('pageSize', PAGE_SIZE);
    url.searchParams.set('offset', offset);
    url.searchParams.set('api_key', CONGRESS_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Congress.gov list failed (${res.status})`);
    const data = await res.json();

    const items = (data?.votes || []).filter(Boolean);
    if (items.length === 0) break;

    out.push(...items);
    if (items.length < PAGE_SIZE) break; // last page
    offset += PAGE_SIZE;

    if (out.length >= cap) break;
  }

  // trim if we overshot
  return out.slice(0, cap);
}

async function hydrateDetails(list, cap) {
  const out = [];
  let i = 0;

  while (i < list.length && out.length < cap) {
    const chunk = list.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      chunk.map(v => fetchVoteDetail(v))
    );
    results.forEach((r) => { if (r.status === 'fulfilled' && r.value) out.push(r.value); });
    i += CONCURRENCY;
  }
  return out.slice(0, cap);
}

async function fetchVoteDetail(listItem) {
  // list item fields vary slightly; try both sets
  const congress = Number(listItem.congress) || Number(listItem.congressNumber);
  const session  = Number(listItem.session)  || Number(listItem.sessionNumber);
  const chamber  = (listItem.chamber || 'House').toLowerCase();
  const roll     = Number(listItem.rollNumber || listItem.roll);

  if (!congress || !session || !roll) return null;

  const url = `${API_BASE}/vote/${congress}/${chamber}/${session}/${roll}?format=json&api_key=${CONGRESS_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    // If detail fails, return a minimal object so the row still shows
    return {
      congress, session, chamber, rollNumber: roll,
      voteDate: listItem.date || listItem.voteDate || listItem.updated,
      question: listItem.voteQuestionText || listItem.question,
      result: listItem.voteResultText || listItem.result,
      totals: {},
      bill: listItem.bill
    };
  }
  const data = await res.json();
  // Congress.gov nests the vote in vote object; find the first if array
  const vote = data?.vote || data;
  return { ...listItem, detail: vote, congress, session, chamber, rollNumber: roll };
}

function normalizeVote(v) {
  const d = v.detail || {};
  const meta = d?.meta || d?.voteMeta || {};
  const totals = d?.totals || d?.voteTotals || {};
  const actions = d?.actions || {};
  const question =
    v.voteQuestionText || d?.question || meta?.question || v.question || '';
  const result =
    v.voteResultText || d?.result || meta?.result || v.result || '';

  // date
  const dateStr =
    v.voteDate || v.date || meta?.date || meta?.dateTime || d?.date || d?.dateTime;
  const date = dateStr ? new Date(dateStr) : new Date();

  // bill info (best-effort)
  const bill =
    v.bill ||
    d?.bill?.number ||
    d?.billNumber ||
    actions?.billNumber ||
    '';

  // totals (best-effort keys)
  const yea = num(
    totals?.yea || totals?.Yeas || totals?.Yea || totals?.yeas || totals?.Aye || totals?.Ayes
  );
  const nay = num(
    totals?.nay || totals?.Nays || totals?.No || totals?.no || totals?.nays
  );
  const present = num(totals?.present || totals?.Present || totals?.presentVotes);
  const notVoting = num(
    totals?.not_voting || totals?.NotVoting || totals?.notVoting
  );

  const roll = v.rollNumber || v.roll || v.roll_call || 0;
  const congress = Number(v.congress);
  const session  = Number(v.session || v.sessionNumber || meta?.session);
  const chamber  = (v.chamber || 'House').charAt(0).toUpperCase() + (v.chamber || 'house').slice(1);

  // Clerk XML/source link (always valid)
  const year = date.getFullYear();
  const roll3 = String(roll).padStart(3, '0');
  const clerkXml = `https://clerk.house.gov/evs/${year}/roll${roll3}.xml`;

  return {
    title: buildTitle({ bill, question }),
    question,
    result,
    date: date.toISOString(),
    bill: bill || '',
    roll: Number(roll),
    congress,
    session,
    chamber,
    yea, nay, present, not_voting: notVoting,
    sources: {
      congress: `${API_BASE}/vote/${congress}/house/${session}/${roll}?format=json&api_key=${CONGRESS_KEY}`,
      clerk: clerkXml
    }
  };
}

function buildTitle({ bill, question }) {
  if (bill && question) return `${bill} — ${question}`;
  if (bill) return bill;
  if (question) return question;
  return 'House Roll Call Vote';
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}
