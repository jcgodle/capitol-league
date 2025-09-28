/*! fp-shims.js — compatibility shims */
(function(){
  function ready(cb){ if(window.fpData){cb();} else { setTimeout(function(){ ready(cb); }, 10); } }
  ready(function(){
    if (typeof window.fpData.roster !== 'function' && typeof window.fpData.members === 'function'){
      window.fpData.roster = function(){ return window.fpData.members(); };
    }
  });
  var origFetch = window.fetch;
  if (origFetch && !window.__fpVotesShim){
    window.__fpVotesShim = true;
    window.fetch = function(url, opts){
      try{
        var u = (typeof url === 'string') ? url : (url && url.url) ? url.url : '';
        if (/data\/votes_last_30d\.json(\?|$)/.test(u)){
          return origFetch('data/votes_recent.json', opts).then(function(r){
            if(r && r.ok) return r;
            return origFetch('data/week_rolls.json', opts);
          }).catch(function(){ return origFetch('data/week_rolls.json', opts); });
        }
      }catch(e){}
      return origFetch.apply(this, arguments);
    };
  }
})();
