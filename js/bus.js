(function(global){
  'use strict';
  const PREFIX = 'capleague.';
  function safeParse(s){ try { return JSON.parse(s); } catch(e){ return null; } }
  function dispatch(key, val){ try { global.dispatchEvent(new CustomEvent('capleague:'+key, { detail: val })); } catch {} }
  const Bus = {
    read(key){ return safeParse(global.localStorage.getItem(PREFIX + key)); },
    write(key, val){
      try { global.localStorage.setItem(PREFIX + key, JSON.stringify(val)); dispatch(key, val); }
      catch(e){ console.warn('CapLeague.write failed:', e); }
    },
    on(key, fn){
      if (typeof fn !== 'function') return;
      global.addEventListener('capleague:'+key, (ev) => { try { fn(ev.detail); } catch(e){} });
      global.addEventListener('storage', (ev) => { if (ev.key === PREFIX + key) { try { fn(safeParse(ev.newValue)); } catch(e){} } });
    }
  };
  global.CapLeague = Object.assign({}, global.CapLeague || {}, Bus);
})(window);
