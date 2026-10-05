# Scoreboard JS Drop‑In + Notes

This bundle does **not** change your CSS or HTML. It only adds:
- `js/bus.js`
- `js/scoreboard.js` (JSON‑first to avoid `kpis.csv` 404 spam)

## Install (2 tags)
Place these at the bottom of your scoreboard page, before `</body>`:

```html
<script src="js/bus.js"></script>
<script type="module" src="js/scoreboard.js"></script>
```

## If the page **looks wrong**
This drop‑in doesn’t change styles, so appearance issues mean your CSS isn’t loading
or is getting trumped. Quick checks:

1. **Network tab** — look for 404s on your CSS files. On GitHub Pages, avoid leading slashes.
   Prefer `./css/yourfile.css` over `/css/yourfile.css`.
2. **Order of styles** — make sure your scoreboard CSS loads **after** any resets/frameworks
   (Tailwind/Bootstrap/etc.). If a framework loads last, it can overwrite your card/table styles.
3. **Header height var** — if your layout uses `--h`, ensure the script/inline style that sets it
   still runs on this page.
4. **Class names** — the renderer expects your existing classes/IDs:
   - `myTeamRow`, `kpiToday`, `kpiWeek`, `kpiSeason`,
   - `liveVotes`, `movers`, `standingsBody`, `feed`,
   - and card classes: `.member-card .meta .name/.sub`, `.pts(.positive/.negative)`.
5. **Font/asset blockers** — privacy blockers can strip Google Fonts or remote images and make
   cards look off. Try an incognito window.

## Silence the favicon error
Add this in `<head>` to avoid `favicon.ico` 404:
```html
<link rel="icon" href="data:,">
```

## Smoke test (from console) — should populate immediately
```js
CapLeague.write('roster',[
  {id:"S000033",name:"Rep. A. Smith",chamber:"House",state:"MO-03",photo:"https://www.govtrack.us/static/legislator-photos/S000033-200px.jpeg"},
  {id:"B001288",name:"Sen. L. Nguyen",chamber:"Senate",state:"IL",photo:"https://www.govtrack.us/static/legislator-photos/B001288-200px.jpeg"},
  {id:"C001098",name:"Rep. J. Doe",chamber:"House",state:"TX-07",photo:"https://www.govtrack.us/static/legislator-photos/C001098-200px.jpeg"},
]);
CapLeague.write('kpis',[
  {id:"S000033",today:6,week:18,season:212},
  {id:"B001288",today:4,week:12,season:198},
  {id:"C001098",today:-2,week:-6,season:154},
]);
CapLeague.write('myTeam',["S000033","B001288","C001098"]);
CapLeague.write('liveVotes',[{bill:"H.R. 1234 — Infrastructure Modernization Act", chamber:"House", yea:247, nay:187, timeCT:"2:14 PM"}]);
```

If you want me to patch your current `index.html` automatically with just those two tags (no other edits), say the word.
