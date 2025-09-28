<script>
// ES5 renderer: Cards (Senate+House) + Votes (last 30d)
(function(){
  function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
  function wk(m){return (m.score&&m.score.week)||m.week||m.points||m.score_week||0;}
  function since(m){return 'Since '+(m.since||m.term_start||m.year||'—');}
  function isCards(){return /Cards Page/i.test(document.title)||/Cards/i.test(location.pathname);}
  function isVotes(){return /Votes Page/i.test(document.title)||/Votes/i.test(location.pathname);}

  function renderCards(list){
    var main=document.querySelector('main.main')||document.body;
    var grid=el('div');grid.id='cards-grid-live';grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:28px;margin-top:8px';
    list.sort(function(a,b){return wk(b)-wk(a);});
    for(var i=0;i<list.length;i++){var m=list[i];
      var card=el('div'); card.style.cssText='background:#0f1a2f;border:1px solid #1b2742;border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,.25);overflow:hidden';
      var top=el('div',null,(String(m.chamber).toUpperCase()==='HOUSE'?'UNITED STATES HOUSE':'UNITED STATES SENATE')); top.style.cssText='padding:12px 16px;color:#9fb3d9;font-size:12px;font-weight:700';
      var ph=el('div'); ph.style.cssText='height:220px;background:radial-gradient(120px 80px at 45% 35%, rgba(255,255,255,.06), rgba(0,0,0,0)), #0b1220';
      var name=el('div',null,(m.first||'')+' '+(m.last||'')); name.style.cssText='padding:14px 16px 0;font-weight:800;color:#e8f0ff;letter-spacing:.2px';
      var meta=el('div',null,(m.state||'')+' • '+(m.party||'')+' • '+since(m)); meta.style.cssText='padding:2px 16px 14px;color:#9fb3d9;font-size:12px';
      var bar=el('div'); bar.style.cssText='display:flex;justify-content:flex-end;padding:0 12px 12px';
      var pill=el('div',null,'+'+wk(m)+' pts'); pill.style.cssText='background:#1d8346;color:#e8fff2;font-size:12px;font-weight:800;border-radius:999px;padding:6px 10px';
      bar.appendChild(pill); card.appendChild(top); card.appendChild(ph); card.appendChild(name); card.appendChild(meta); card.appendChild(bar); grid.appendChild(card);
    }
    var old=document.getElementById('cards-grid-live'); if(old&&old.parentNode) old.parentNode.removeChild(old);
    main.appendChild(grid);
  }

  function renderVotes(vs){
    var main=document.querySelector('main.main')||document.body;
    var wrap=el('div'); wrap.id='votes-list-live'; wrap.style.cssText='display:grid;gap:16px;margin-top:8px';
    for(var i=0;i<vs.length;i++){var v=vs[i];
      var row=el('div'); row.style.cssText='background:#0f1a2f;border:1px solid #1b2742;border-radius:14px;padding:14px 16px';
      var t=el('div',null,v.bill||''); t.style.cssText='font-weight:800;color:#e8f0ff;margin-bottom:6px';
      var sub=el('div',null,(v.chamber||'')+(v.date?(' • '+v.date):'')); sub.style.cssText='color:#9fb3d9;font-size:12px';
      var badges=el('div'); badges.style.cssText='display:flex;gap:10px;margin-top:8px';
      function badge(txt,bg){var b=el('span',null,txt); b.style.cssText='background:'+bg+';color:#fff;border-radius:999px;font-size:12px;font-weight:800;padding:4px 8px'; return b;}
      if(v.result) badges.appendChild(badge(String(v.result).toUpperCase(), String(v.result).toLowerCase().indexOf('pass')>=0?'#1d8346':'#a33636'));
      if(v.yes!=null) badges.appendChild(badge('Yeas '+v.yes,'#1b3d73'));
      if(v.no!=null)  badges.appendChild(badge('Nays '+v.no,'#652c2c'));
      row.appendChild(t); row.appendChild(sub); row.appendChild(badges); wrap.appendChild(row);
    }
    var old=document.getElementById('votes-list-live'); if(old&&old.parentNode) old.parentNode.removeChild(old);
    main.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(!window.fpData) return;
    if(isCards()){ window.fpData.members().then(function(all){ renderCards(all||[]); }); }
    if(isVotes()){ window.fpData.votesLast30d().then(function(v){ renderVotes(v||[]); }); }
  });
})();
</script>
