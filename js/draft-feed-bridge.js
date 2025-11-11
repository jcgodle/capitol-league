
// Draft-only feed bridge (SAFE: doesn't modify Cards).
// 1) Use saved working URL if present.
// 2) Try a list of common paths used by your Cards page.
// 3) Remember the first that returns rows.
window.DRAFT_FEED_CANDIDATES = [
  'data/members.json',
  'data/cards.json',
  'data/people.json',
  'data/roster.json',
  'data/roster.min.json'
];
window.getDraftFeedURL = async function(){
  const remembered = localStorage.getItem('cl_cards_feed_url');
  if(remembered) return remembered;
  for(const url of window.DRAFT_FEED_CANDIDATES){
    try{
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) continue;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.players||data.members||data.data||[]);
      if(arr && arr.length){
        localStorage.setItem('cl_cards_feed_url', url);
        return url;
      }
    }catch(e){ /* keep trying */ }
  }
  return 'data/roster.json'; // fallback (sample)
};
