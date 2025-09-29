/*! Capitol League Shared Navigation + My Team v2.0 */
;(()=>{
  const NAV_LINKS = [
    { href: "index.html", label: "Scoreboard", key:"scoreboard" },
    { href: "cards.html", label: "Cards", key:"cards" },
    { href: "votes.html", label: "Votes", key:"votes" },
    { href: "draft.html", label: "draft", key:"draft" },
    { href: "rules.html", label: "Rules", key:"rules" },
    { href: "commissioner.html", label: "Commissioner", key:"commissioner", role:"commissioner" }
  ];

  const STATE = {
    page: document.body?.dataset?.page || (location.pathname.split("/").pop() || "index.html").replace(".html",""),
    isCommish: (localStorage.getItem("cl_role")||"").toLowerCase()==="commissioner"
  };

  function h(tag, attrs={}, ...children){
    const el = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs||{})){
      if(k==="class") el.className = v;
      else if(k.startsWith("on") && typeof v === "function") el.addEventListener(k.substring(2), v);
      else if(v===true) el.setAttribute(k,"");
      else if(v!==false && v!=null) el.setAttribute(k, v);
    }
    children.flat().forEach(ch=>{
      if(ch==null) return;
      if(typeof ch === "string") el.appendChild(document.createTextNode(ch));
      else el.appendChild(ch);
    });
    return el;
  }

  function buildNav(){
    const wrap = h("div",{class:"cl-nav-wrap"});
    const nav = h("nav",{class:"cl-nav"});
    const brand = h("div",{class:"cl-brand"}, "Capitol ", h("i",{},"League"));
    const links = h("div",{class:"cl-links"});
    const actions = h("div",{class:"cl-actions"},
      h("button",{class:"cl-cta",onClick:()=>alert("Search coming soon")}, "Search"),
      h("button",{class:"cl-cta",onClick:()=>alert("Login coming soon")}, "Login")
    );

    NAV_LINKS.forEach(item=>{
      if(item.role==="commissioner" && !STATE.isCommish) return;
      const a = h("a",{class:"cl-link",href:item.href}, item.label);
      if(STATE.page===item.key) a.setAttribute("aria-current","page");
      links.appendChild(a);
    });

    nav.append(brand, links, actions);
    wrap.appendChild(nav);

    // mount
    const mount = document.getElementById("app-nav");
    if(mount){ mount.replaceChildren(wrap); }
    else { document.body.prepend(wrap); }
  }

  /* ===== My Team store ===== */
  const KEY = "cl_my_team_v1";
  const Team = {
    get(){ try{ return JSON.parse(localStorage.getItem(KEY)||"[]"); }catch{ return [] } },
    set(arr){ localStorage.setItem(KEY, JSON.stringify(arr||[])); dispatchEvent(new CustomEvent("cl:team:change")); },
    has(id){ return Team.get().some(x=>String(x.id)===String(id)); },
    add(obj){
      if(!obj || obj.id==null) return;
      const t = Team.get();
      if(!t.some(x=>String(x.id)===String(obj.id))){
        t.push({ id:String(obj.id), name:obj.name||String(obj.id), party:obj.party||"", img:obj.img||"" });
        Team.set(t);
      }
    },
    remove(id){ const t = Team.get().filter(x=>String(x.id)!==String(id)); Team.set(t); },
    clear(){ Team.set([]); }
  };
  window.CLTeam = Team;

  function ensureShell(){
    // if no shell present, inject default shell
    if(!document.querySelector(".cl-shell")){
      const shell = h("div",{class:"cl-shell"});
      const teamBox = h("aside",{id:"my-team",class:"cl-team"});
      const content = h("main",{class:"cl-content"});
      shell.append(teamBox, content);
      document.body.appendChild(shell);
    }
    // if team mount missing, add it to the shell
    if(!document.getElementById("my-team")){
      const teamBox = h("aside",{id:"my-team",class:"cl-team"});
      const shell = document.querySelector(".cl-shell");
      shell.prepend(teamBox);
    }
  }

  function renderTeam(){
    ensureShell();
    const el = document.getElementById("my-team");
    el.classList.add("cl-team");
    el.replaceChildren();
    el.appendChild(h("h3",{}, "My Team"));
    const actions = h("div",{class:"cl-team-actions"},
      h("button",{class:"cl-btn",onClick:()=>Team.clear()},"Clear"),
      h("button",{class:"cl-btn",onClick:()=>alert(`Team size: ${Team.get().length}`)},"Count")
    );
    el.appendChild(actions);
    const list = h("div",{class:"cl-list"});
    const data = Team.get();
    if(!data.length) list.appendChild(h("div",{class:"cl-empty"},"No players yet. Use “Add to team” buttons."));
    data.forEach(p=>{
      const card = h("div",{class:"cl-card"},
        p.img ? h("img",{src:p.img,alt:p.name}) : h("div",{style:"width:36px;height:36px;border-radius:8px;background:#2a2f55;border:1px solid #2b2f55"}),
        h("div",{class:"cl-meta"},
          h("div",{class:"cl-name"}, p.name||p.id),
          h("div",{class:"cl-sub"}, p.party ? `${p.party}` : `ID: ${p.id}`)
        ),
        h("div",{class:"cl-spacer"}),
        h("button",{class:"cl-x",onClick:()=>{ Team.remove(p.id); renderTeam(); }}, "Remove")
      );
      list.appendChild(card);
    });
    el.appendChild(list);
  }

  // Global click hooks
  addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-add-to-team],[data-remove-from-team]");
    if(!btn) return;
    e.preventDefault();
    if(btn.hasAttribute("data-add-to-team")){
      const id = btn.getAttribute("data-id") || btn.dataset.addToTeam;
      const name = btn.getAttribute("data-name") || "";
      const party = btn.getAttribute("data-party") || "";
      const img = btn.getAttribute("data-img") || "";
      Team.add({id,name,party,img});
      renderTeam();
    }else if(btn.hasAttribute("data-remove-from-team")){
      const id = btn.getAttribute("data-id") || btn.dataset.removeFromTeam;
      Team.remove(id);
      renderTeam();
    }
  });

  // role toggle helper for quick testing in console:
  window.clSetRole = (r)=>{ localStorage.setItem("cl_role", r); location.reload(); };

  document.addEventListener("DOMContentLoaded", ()=>{
    buildNav();
    renderTeam();
  });
})();
