/* header.force.js — force style the header without editing HTML
   - Injects a small CSS block
   - Applies minimal inline styles w/ !important as a fallback
   - Sets active nav link based on pathname (scoreboard/cards/draft/votes)
*/
(function(){
  'use strict';

  const CSS = `
  /* Scoped to header and common aliases */
  header, .site-header, .header, .topbar, .appbar {
    position: sticky;
    top: 0;
    height: 72px;
    background: rgba(11,13,18,.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid #1b2030;
    z-index: 1000;
  }
  header .wrap, .site-header .wrap, .header .wrap, .topbar .wrap, .appbar .wrap {
    max-width: 1200px;
    margin: 0 auto;
    height: 72px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    padding: 0 16px;
  }
  header .brand, .site-header .brand { font-weight: 800; letter-spacing: .3px; }
  header nav a, .site-header nav a {
    color: #cfd7ec;
    text-decoration: none;
    margin-left: 16px;
    font-weight: 600;
  }
  header nav a:hover, .site-header nav a:hover { color: #ffffff; }
  header nav a.active, .site-header nav a.active { color: #ffffff; }
  `;

  function injectCSS(){
    let style = document.getElementById('cl-header-force-style');
    if (!style){
      style = document.createElement('style');
      style.id = 'cl-header-force-style';
      document.head.appendChild(style);
    }
    style.textContent = CSS;
  }

  function forceInline(h){
    if (!h) return;
    const s = (prop,val) => { try { h.style.setProperty(prop, val, 'important'); } catch {} };
    s('position','sticky'); s('top','0'); s('height','72px');
    s('background','rgba(11,13,18,.85)');
    s('backdrop-filter','blur(8px)'); s('-webkit-backdrop-filter','blur(8px)');
    s('border-bottom','1px solid #1b2030'); s('z-index','1000');

    const links = h.querySelectorAll('a');
    links.forEach(a => {
      a.style.setProperty('color','#cfd7ec','important');
      a.style.setProperty('text-decoration','none','important');
      a.style.setProperty('font-weight','600','important');
    });
  }

  function pickHeader(){
    const sel = ['header','.site-header','.header','.topbar','.appbar','#header','#topbar'].join(',');
    const nodes = Array.from(document.querySelectorAll(sel));
    if (nodes.length) return nodes[0];
    // fallback: parent of any top nav link
    const navLink = Array.from(document.querySelectorAll('a')).find(a => /scoreboard|cards|draft|votes/i.test(a.textContent||''));
    return navLink ? navLink.closest('header, .site-header, .header, .topbar, .appbar') : null;
  }

  function setActive(){
    const path = (location.pathname||'').toLowerCase();
    const intent = /cards/.test(path) ? 'cards' : /draft/.test(path) ? 'draft' : /votes/.test(path) ? 'votes' : 'scoreboard';
    const links = document.querySelectorAll('header a, .site-header a, .header a');
    links.forEach(a => {
      const label = (a.textContent||'').trim().toLowerCase();
      if (label === intent){ a.classList.add('active'); }
      else { a.classList.remove('active'); }
    });
  }

  function init(){
    injectCSS();
    const h = pickHeader();
    if (h) forceInline(h);
    setActive();
    // Re-apply if the app swaps header
    const mo = new MutationObserver(() => { const hh = pickHeader(); if (hh) forceInline(hh); setActive(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    console.info('[CapLeague] header.force.js applied.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();