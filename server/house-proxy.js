import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

const app = express();
const PORT = process.env.PORT || 5050;
app.use(cors());
app.use(morgan("tiny"));

/** ──────────────────────────────────────────────────────────────
 * Simple in-memory cache (per process)
 * cache.get(key) -> { t, ttl, data }
 * ─────────────────────────────────────────────────────────────*/
const cache = new Map();
function setCache(key, data, ttlMs = 10 * 60 * 1000) {
  cache.set(key, { t: Date.now(), ttl: ttlMs, data });
}
function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > hit.ttl) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

/** ──────────────────────────────────────────────────────────────
 * Utilities
 * ─────────────────────────────────────────────────────────────*/
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true
});

function zeroPad3(n) {
  const s = String(Number(n) || 0);
  return s.length < 3 ? s.padStart(3, "0") : s;
}
function clerkXmlUrl(year, roll) {
  // Clerk XML supports /evs/YYYY/rollNNN.xml (NNN is 3-digit zero-padded for < 100)
  const n = Number(roll);
  const pad = n < 100 ? zeroPad3(n) : String(n);
  return `https://clerk.house.gov/evs/${year}/roll${pad}.xml`;
}

function normalizeFromClerkXML(xmlObj) {
  // Shape notes:
  // root: rollcall-vote
  // vote-metadata.{rollcall-num, legis-num, vote-question, vote-result, action-date, action-time}
  // totals-by-vote: {yeas, nays, present, not-voting}
  const meta = xmlObj?.["rollcall-vote"]?.["vote-metadata"] || {};
  const totals = xmlObj?.["rollcall-vote"]?.["totals-by-vote"] || {};
  const roll = meta["rollcall-num"] || null;
  const yeas = Number(totals["yeas"] || 0);
  const nays = Number(totals["nays"] || 0);
  const present = Number(totals["present"] || 0);
  const notvoting = Number(totals["not-voting"] || 0);

  const actionDate = meta["action-date"] || null;
  const actionTime = meta["action-time"] || null;
  const created = actionDate && actionTime
    ? new Date(`${actionDate}T${actionTime}:00Z`).toISOString()
    : (actionDate ? new Date(actionDate).toISOString() : null);

  return {
    id: `house-${actionDate || ""}-${roll || ""}`,
    roll,
    created,
    chamber: "House",
    billNum: meta["legis-num"] || "",
    billTitle: "", // Clerk XML doesn’t carry full title; we keep empty (your UI shows question/summary anyway)
    summary: "",   // same here; prefer question for display
    question: meta["vote-question"] || "",
    voteType: "",  // not explicit in Clerk XML
    required: "",  // not explicit in Clerk XML
    present,
    notvoting,
    result: meta["vote-result"] || "—",
    link: "",      // backup (not needed if we have .gov primary)
    yeas,
    nays
  };
}

/** ──────────────────────────────────────────────────────────────
 * Fetch & parse Clerk Index for a year (returns DESC roll numbers)
 * https://clerk.house.gov/evs/2025/index.asp
 * ─────────────────────────────────────────────────────────────*/
async function fetchClerkIndex(year) {
  const key = `IDX:${year}`;
  const cached = getCache(key);
  if (cached) return cached;

  const url = `https://clerk.house.gov/evs/${year}/index.asp`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Index fetch failed ${res.status} ${res.statusText}`);
  const html = await res.text();

  // Extract roll numbers; the page lists “Roll Calls X Thru Y” and individual rows
  // We’ll grab all patterns that look like roll numbers near those sections.
  const rolls = new Set();
  // Common patterns: “roll 282”, “Roll Calls 200 Thru 282”, links to /Votes/2025282 etc.
  const numberMatches = html.matchAll(/\b(?:Roll\s*Calls\s+)?(\d{1,3})\b/gi);
  for (const m of numberMatches) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= 999) rolls.add(n);
  }
  // Also try to pull explicit XML hints if present:
  const xmlMatches = html.matchAll(/\/evs\/\d{4}\/roll(\d{1,3})\.xml/gi);
  for (const m of xmlMatches) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) rolls.add(n);
  }

  // Convert to array & sort desc (newest first)
  const list = Array.from(rolls).sort((a, b) => b - a);
  setCache(key, list, 5 * 60 * 1000); // cache for 5 minutes
  return list;
}

/** ──────────────────────────────────────────────────────────────
 * Fetch a single Clerk XML & return normalized JSON
 * ─────────────────────────────────────────────────────────────*/
async function fetchClerkVote(year, roll) {
  const key = `XML:${year}:${roll}`;
  const cached = getCache(key);
  if (cached) return cached;

  const url = clerkXmlUrl(year, roll);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`XML fetch failed ${res.status} ${res.statusText}`);
  const xml = await res.text();
  const json = parser.parse(xml);
  const norm = normalizeFromClerkXML(json);
  setCache(key, norm, 60 * 60 * 1000); // cache 60 min per roll
  return norm;
}

/** ──────────────────────────────────────────────────────────────
 * API: list roll numbers for a year
 * GET /api/house/index?year=2025
 * ─────────────────────────────────────────────────────────────*/
app.get("/api/house/index", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const list = await fetchClerkIndex(year);
    res.json({ year, count: list.length, rolls: list });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

/** ──────────────────────────────────────────────────────────────
 * API: single roll normalized
 * GET /api/house/roll?year=2025&roll=145
 * ─────────────────────────────────────────────────────────────*/
app.get("/api/house/roll", async (req, res) => {
  try {
    const year = Number(req.query.year);
    const roll = Number(req.query.roll);
    if (!year || !roll) return res.status(400).json({ error: "year and roll are required" });
    const data = await fetchClerkVote(year, roll);
    res.json({ year, data, primary: clerkXmlUrl(year, roll) });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

/** ──────────────────────────────────────────────────────────────
 * API: recent votes for a year with paging on *index* list
 * GET /api/house/recent?year=2025&limit=50&offset=0
 * ─────────────────────────────────────────────────────────────*/
app.get("/api/house/recent", async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const list = await fetchClerkIndex(year);
    const slice = list.slice(offset, offset + limit);

    // Fetch XMLs in parallel (cap concurrency to avoid hammering)
    const chunks = [];
    const CONC = 8;
    for (let i = 0; i < slice.length; i += CONC) {
      const part = slice.slice(i, i + CONC);
      const block = await Promise.allSettled(part.map(r => fetchClerkVote(year, r)));
      for (const r of block) if (r.status === "fulfilled") chunks.push(r.value);
    }

    // Attach the official .gov source per item (for your button)
    const out = chunks.map(v => ({
      ...v,
      __primary: clerkXmlUrl(year, v.roll)
    }));

    res.json({
      year,
      limit,
      offset,
      returned: out.length,
      primary: `https://clerk.house.gov/evs/${year}/index.asp`,
      objects: out
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`House proxy listening on http://localhost:${PORT}`);
});
