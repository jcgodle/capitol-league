
// js/votes-live.js
// Pull recent House votes from the Congress.gov API (beta). Requires a free API key from api.data.gov.
(function(){
  const tableBody = document.getElementById('votes-body') || document.querySelector('#votes-body, #votesBody, tbody#votes');
  if(!tableBody) return;

  const KEY = (window.CAPITOL_CFG && window.CAPITOL_CFG.CONGRESS_KEY) || "";
  const BASE = "https://api.congress.gov/v3/house-votes"; // list-level; see docs

  async function init(){
    if(!KEY){
      tableBody.innerHTML = `<tr><td colspan="4">
        <div class="page-sub">Add your Congress.gov API key in <code>config.js</code> to load live votes.</div>
      </td></tr>`;
      return;
    }
    try{
      // Pull the most recent 20 House votes (current congress defaults on the API)
      const url = BASE + "?api_key=" + encodeURIComponent(KEY) + "&limit=20";
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error(res.status+" loading votes");
      const data = await res.json();
      // Normalize to rows
      const items = (data?.results?.votes || data?.results || []);
      if(!items.length){
        tableBody.innerHTML = `<tr><td colspan="4" class="page-sub">No recent votes found.</td></tr>`;
        return;
      }
      tableBody.innerHTML = items.map(v => {
        const date = v.date || v.votedAt || v.voteDate || v.updateDate || "";
        const chamber = "House";
        const question = v.question || v.voteQuestion || v.type || "—";
        const result = v.result || v.resultText || v.resultCode || "—";
        const bill = v.bill?.number || v.billNumber || v.bill?.title || v.title || v.sourceSystem?.code || "—";
        return `<tr><td>${date}</td><td>${chamber}</td><td>${bill}<br><span class="page-sub">${question}</span></td><td>${result}</td></tr>`;
      }).join("");
    }catch(e){
      console.error(e);
      tableBody.innerHTML = `<tr><td colspan="4" class="page-sub">Error loading live votes. Check your key/network and try again.</td></tr>`;
    }
  }

  if(document.readyState==='complete' || document.readyState==='interactive'){ init(); }
  else document.addEventListener('DOMContentLoaded', init);
})();
