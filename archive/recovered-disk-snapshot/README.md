# Capitol League — FULL Scoreboard Drop-In (Namespaced)

This is a complete, **self-contained** scoreboard page meant to drop into any repo.
It uses fully **namespaced CSS and IDs** (prefix `cl-`) so it will not disturb your existing styles.

## Files
- `scoreboard.html` — standalone page (open this)
- `css/scoreboard.namespaced.css` — styles scoped under `#capleague-scoreboard .cl`
- `js/bus.js` — tiny publish/subscribe bus
- `js/scoreboard.widget.js` — renders into the namespaced DOM
- `data/roster.json`, `data/kpis.json`, `data/myteam_ids.json` — sample data

## Use
1. Drop the whole folder into your repo (or merge its contents).
2. Serve `scoreboard.html`. It will render immediately with sample data.
3. From your **other pages** (Cards/Draft/Votes), publish data with the bus:
   ```html
   <script src="/js/bus.js"></script>
   <script>
     // Cards/Draft/MyTeam
     CapLeague.write('roster',  rosterArray);   // [{id,name,chamber,state,photo}, ...]
     CapLeague.write('kpis',    kpisArray);     // [{id,today,week,season}, ...]
     CapLeague.write('myTeam',  myIdsArray);    // ["S000033", ...]
     // Votes
     CapLeague.write('liveVotes', [...]);
     CapLeague.write('movers',    [...]);
     CapLeague.write('standings', [...]);
     CapLeague.write('feed',      [...]);
   </script>
   ```

## Why namespaced?
- No global `body`, `table`, or generic class overrides.
- All selectors live under `#capleague-scoreboard` with `cl-` prefixes.
- Safe to paste into complex pages without wrecking your CSS.
