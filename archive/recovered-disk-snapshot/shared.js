(function(){
  function injectHeader() {
    const host = document.getElementById('site-header');
    if (!host) return;
    const needsSpacer = !document.body.classList.contains('has-sticky-toolbar');
    host.innerHTML = `
<header class="cl-topbar" role="banner">
  <div class="cl-wrap">
    <a class="cl-brand" href="index.html">Capitol <span>League</span></a>
    <nav class="cl-nav" aria-label="Primary">
      <a class="cl-pill" href="index.html"   data-nav="index.html">Scoreboard</a>
      <a class="cl-pill" href="cards.html"   data-nav="cards.html">Cards</a>
      <a class="cl-pill" href="votes.html"   data-nav="votes.html">Votes</a>
      <a class="cl-pill" href="draft.html"   data-nav="draft.html">Draft</a>
      <a class="cl-pill" href="rules.html"   data-nav="rules.html">Rules</a>
    </nav>
    <div class="cl-actions">
      <a class="cl-pill" href="#" aria-label="Search">Search</a>
      <a class="cl-pill" href="#" aria-label="Login">Login</a>
    </div>
  </div>
</header>
${needsSpacer ? '<div class="spacer" aria-hidden="true"></div>' : ''}`;
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    host.querySelectorAll('[data-nav]').forEach(a=>{
      const t = (a.getAttribute('data-nav')||'').toLowerCase();
      if (t === here) { a.classList.add('is-active'); a.setAttribute('aria-current','page'); }
    });
    const headerEl = host.querySelector('header.cl-topbar');
    const setH = ()=> {
      const h = (headerEl?.offsetHeight || 72);
      document.documentElement.style.setProperty('--h', h + 'px');
      document.body.style.paddingTop = h + 'px'; // push document below fixed header
    };
    if ('ResizeObserver' in window) new ResizeObserver(setH).observe(headerEl);
    setH();
  }
  window.CLHeader = { injectHeader };
  injectHeader();
})();

async function updateVoteStatusBadge() {
    const badge = document.getElementById("voteStatusBadge");
    if (!badge) return; // Page doesn't have the badge

    try {
        const res = await fetch("data/master_state.json", { cache: "no-store" });
        if (!res.ok) {
            badge.textContent = "Live Votes: ERROR";
            badge.classList.remove("hidden");
            badge.classList.add("error");
            return;
        }

        const data = await res.json();
        const vs = data.votesStatus || {};
        const houseCount = data.votes?.house?.count || 0;
        const senateCount = data.votes?.senate?.count || 0;

        // Determine badge state
        let status = "empty";
        let text = "Live Votes: None";

        if (houseCount > 0 || senateCount > 0) {
            if (vs.liveStatus === "ok") {
                status = "ok";
                text = "Live Votes: Fresh";
            } else {
                status = "stale";
                text = "Live Votes: Stale";
            }
        } else {
            if (vs.lastError) {
                status = "stale";
                text = "Live Votes: Stale (No Data)";
            }
        }

        // Render badge
        badge.textContent = text;
        badge.classList.remove("hidden", "ok", "stale", "empty", "error");
        badge.classList.add(status);

    } catch (err) {
        badge.textContent = "Live Votes: ERROR";
        badge.classList.remove("hidden");
        badge.classList.add("error");
        console.error("Vote status badge error:", err);
    }
}

// Run when page loads
document.addEventListener("DOMContentLoaded", updateVoteStatusBadge);
