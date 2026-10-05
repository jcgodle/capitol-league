// shared.js — injects a locked header into #site-header (or top of body)
(function(){
  'use strict';

  function activeSlug(){
    const p = (location.pathname||'').toLowerCase();
    if (p.includes('cards')) return 'cards';
    if (p.includes('draft')) return 'draft';
    if (p.includes('votes')) return 'votes';
    return 'scoreboard';
  }

  function headerHTML(slug){
    const link = (href, label, name) => 
      `<a href="${href}" class="${slug===name?'active':''}" data-slug="${name}">${label}</a>`;
    return `
      <header class="site-header">
        <div class="wrap">
          <div class="brand">Capitol League</div>
          <nav>
            ${link('index.html','Scoreboard','scoreboard')}
            ${link('cards.html','Cards','cards')}
            ${link('draft.html','Draft','draft')}
            ${link('votes.html','Votes','votes')}
          </nav>
        </div>
      </header>`;
  }

  function mount(){
    const slug = activeSlug();
    const host = document.getElementById('site-header');
    if (host){
      host.outerHTML = headerHTML(slug);
    }else{
      document.body.insertAdjacentHTML('afterbegin', headerHTML(slug));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();