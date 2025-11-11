// votes.js
import { fetchHouseVotes } from './votes_sources.js';

const $ = (s) => document.querySelector(s);
const results   = $('#results');
const fromInput = $('#fromDate');
const toInput   = $('#toDate');
const limitSel  = $('#limit');
const loadBtn   = $('#loadBtn');

// default dates: Jan 1 -> today
const today = new Date();
const firstOfYear = new Date(today.getFullYear(), 0, 1);
fromInput.value = firstOfYear.toISOString().slice(0,10);
toInput.value   = today.toISOString().slice(0,10);

loadBtn.addEventListener('click', load);
window.addEventListener('DOMContentLoaded', load);

async function load() {
  loadBtn.disabled = true;
  results.innerHTML = 'Loading…';
  try {
    const cap = limitSel.value === 'all' ? Infinity : Number(limitSel.value);
    const votes = await fetchHouseVotes({
      from: fromInput.value,
      to:   toInput.value,
      cap
    });
    render(votes);
  } catch (err) {
    console.error(err);
    results.innerHTML = `<div class="section"><div class="section__body">Error loading votes: ${err.message}</div></div>`;
  } finally {
    loadBtn.disabled = false;
  }
}

function render(votes) {
  // group by Year -> Month
  const byYear = new Map();
  for (const v of votes) {
    const d = new Date(v.date);
    const y = d.getFullYear();
    const m = d.toLocaleString(undefined, { month: 'long' });
    if (!byYear.has(y)) byYear.set(y, new Map());
    const ym = byYear.get(y);
    if (!ym.has(m)) ym.set(m, []);
    ym.get(m).push(v);
  }

  // sort years/months desc
  const years = [...byYear.keys()].sort((a,b)=>b-a);

  const tmpl = document.getElementById('vote-row');
  results.innerHTML = '';

  let shown = 0;

  for (const y of years) {
    const yearWrap = document.createElement('div');
    yearWrap.className = 'section';
    const isCurrent = y === (new Date()).getFullYear();

    const head = document.createElement('div');
    head.className = 'section__header';
    head.innerHTML = `<div class="section__title">${y}</div><div class="section__caret">▸</div>`;

    const body = document.createElement('div');
    body.className = 'section__body';
    body.hidden = !isCurrent;

    head.addEventListener('click', ()=>{
      body.hidden = !body.hidden;
      yearWrap.toggleAttribute('open');
    });

    // months desc
    const months = [...byYear.get(y).keys()].sort((a,b)=>{
      const da = new Date(`${a} 1, ${y}`);
      const db = new Date(`${b} 1, ${y}`);
      return db - da;
    });

    for (const m of months) {
      const list = byYear.get(y).get(m);

      const monthSec = document.createElement('details');
      monthSec.className = 'section';
      monthSec.open = shown < 20; // open until we've shown ~20 total

      const mhead = document.createElement('summary');
      mhead.className = 'section__header';
      mhead.innerHTML = `<div class="section__title">${m} ${y} — ${list.length} vote(s)</div><div class="section__caret">▸</div>`;

      const mbody = document.createElement('div');
      mbody.className = 'section__body';

      for (const v of list) {
        const node = tmpl.content.cloneNode(true);

        node.querySelector('.vote-row__title').textContent =
          v.title ?? v.question ?? v.description ?? 'House Vote';

        node.querySelector('.vote-row__meta').innerHTML =
          `Roll ${v.roll} · ${v.result || '—'} · <span class="badge-yea">Yea ${v.yea}</span> · <span class="badge-nay">Nay ${v.nay}</span>`;

        node.querySelector('.q').textContent      = v.question || '';
        node.querySelector('.result').textContent = v.result || '';
        node.querySelector('.roll').textContent   = `${v.congress}-${v.session}/${v.roll}`;
        node.querySelector('.bill').textContent   = v.bill || '—';
        node.querySelector('.date').textContent   = new Date(v.date).toLocaleString();
        node.querySelector('.totals').textContent =
          `Yea ${v.yea} · Nay ${v.nay} · Present ${v.present ?? 0} · Not Voting ${v.not_voting ?? 0}`;

        const src = node.querySelector('.source');
        src.href = v.sources?.congress || v.sources?.clerk || '#';

        const details = node.querySelector('.vote-row__details');
        const toggle  = node.querySelector('.details-toggle');
        toggle.addEventListener('click', ()=>{
          const expanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!expanded));
          details.hidden = expanded;
        });

        mbody.appendChild(node);
        shown++;
      }

      monthSec.appendChild(mhead);
      monthSec.appendChild(mbody);
      body.appendChild(monthSec);
    }

    yearWrap.appendChild(head);
    yearWrap.appendChild(body);
    results.appendChild(yearWrap);

    if (!isCurrent) {
      // collapse non-current years by default
      yearWrap.removeAttribute('open');
      body.hidden = true;
    }
  }

  if (votes.length === 0) {
    results.innerHTML = `<div class="section"><div class="section__body">No votes found for that range.</div></div>`;
  }
}
