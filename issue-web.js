// issue-web.js
// v2 - ultra-defensive: find Issue Web by TEXT and inject mini web above it

(function () {
  "use strict";

  console.log("[Issue Web] Script loaded");

  // -----------------------------
  //  Sample graph data (placeholder)
  // -----------------------------
  const ISSUE_WEB_SAMPLE_GRAPH = {
    nodes: [
      { id: "bill", label: "H.R. 1642", type: "bill", importance: 1.0 },

      { id: "smallbiz", label: "Small Business", type: "issue", importance: 0.9 },
      { id: "career-ed", label: "Career & Tech Ed", type: "issue", importance: 0.85 },
      { id: "workforce", label: "Workforce Pipeline", type: "issue", importance: 0.75 },
      { id: "funding", label: "Federal Funding", type: "issue", importance: 0.7 },
      { id: "student-loans", label: "Student Debt", type: "issue", importance: 0.6 },

      { id: "states", label: "States", type: "actor", importance: 0.5 },
      { id: "schools", label: "Schools", type: "actor", importance: 0.5 },
      { id: "employers", label: "Employers", type: "actor", importance: 0.5 },
      { id: "students", label: "Students", type: "actor", importance: 0.5 }
    ],
    links: [
      { source: "bill", target: "smallbiz", weight: 1 },
      { source: "bill", target: "career-ed", weight: 1 },
      { source: "bill", target: "workforce", weight: 1 },
      { source: "bill", target: "funding", weight: 1 },

      { source: "career-ed", target: "schools", weight: 0.9 },
      { source: "career-ed", target: "students", weight: 0.9 },
      { source: "workforce", target: "employers", weight: 0.9 },
      { source: "smallbiz", target: "employers", weight: 0.8 },
      { source: "funding", target: "states", weight: 0.8 },
      { source: "funding", target: "student-loans", weight: 0.7 },
      { source: "student-loans", target: "students", weight: 0.8 }
    ]
  };

  // -----------------------------
  //  Bootstrapping
  // -----------------------------

  function initIssueWeb() {
    console.log("[Issue Web] DOM ready, scanning for blocks…");

    const blocks = findIssueWebBlocks();
    console.log(`[Issue Web] Found ${blocks.length} block(s)`);

    blocks.forEach((block, index) => {
      try {
        console.log("[Issue Web] Attaching mini web to block", index, block);
        attachMiniWebToBlock(block, ISSUE_WEB_SAMPLE_GRAPH);
      } catch (err) {
        console.error("[Issue Web] Failed to attach mini web:", err);
      }
    });
  }

  // Try VERY hard to find the issue web area:
  // 1) Any element with data-issue-web / .issue-web / .issue-web-block
  // 2) Any element whose text contains "Issue web is still building from public sources"
  function findIssueWebBlocks() {
    const result = new Set();

    // 1) class / data selectors
    const byClass = document.querySelectorAll(
      "[data-issue-web], .issue-web, .issue-web-block"
    );
    byClass.forEach((el) => result.add(el));

    // 2) text search
    const allElems = document.querySelectorAll("div, section, article, td, li, p");
    const needle = "Issue web is still building from public sources";
    allElems.forEach((el) => {
      const text = (el.textContent || "").trim();
      if (!text) return;
      if (text.toLowerCase().includes(needle.toLowerCase())) {
        // Use the parent as the block if possible, so we sit nicely within that row/card
        const block = el.parentElement || el;
        result.add(block);
      }
    });

    return Array.from(result);
  }

  function attachMiniWebToBlock(block, graph) {
    if (block.dataset.issueWebInitialized === "true") return;
    block.dataset.issueWebInitialized = "true";

    const wrapper = document.createElement("div");
    wrapper.className = "issue-web-visual-wrapper";
    wrapper.style.position = "relative";
    wrapper.style.width = "100%";
    wrapper.style.marginBottom = "0.75rem";
    wrapper.style.display = "flex";
    wrapper.style.justifyContent = "center";

    const canvas = document.createElement("canvas");
    canvas.className = "issue-web-canvas";

    // Size canvas to container
    const blockWidth = block.clientWidth || block.offsetWidth || 480;
    const width = Math.min(blockWidth, 600);
    const height = Math.round(width * 0.55);

    canvas.width = width;
    canvas.height = height;
    canvas.style.maxWidth = "100%";
    canvas.style.display = "block";

    wrapper.appendChild(canvas);

    const tooltip = document.createElement("div");
    tooltip.className = "issue-web-tooltip";
    Object.assign(tooltip.style, {
      position: "absolute",
      padding: "4px 8px",
      fontSize: "0.75rem",
      borderRadius: "4px",
      background: "rgba(0,0,0,0.8)",
      color: "#f9fafb",
      pointerEvents: "none",
      opacity: "0",
      transform: "translate(-50%, -120%)",
      transition: "opacity 0.12s ease-out",
      whiteSpace: "nowrap",
      zIndex: "2"
    });
    wrapper.appendChild(tooltip);

    // Insert graphic ABOVE the existing Issue Web heading/text
    block.insertBefore(wrapper, block.firstChild);

    renderMiniIssueWeb(canvas, graph, tooltip);
  }

  // -----------------------------
  //  Layout + drawing
  // -----------------------------

  function renderMiniIssueWeb(canvas, graph, tooltip) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    const layout = computeLayout(graph, width, height);

    let hoverNodeId = null;

    function draw() {
      ctx.clearRect(0, 0, width, height);
      drawBackground(ctx, width, height);
      drawLinks(ctx, graph, layout, hoverNodeId);
      drawNodes(ctx, graph, layout, hoverNodeId);
    }

    draw();

    canvas.addEventListener("mousemove", (evt) => {
      const rect = canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;

      const node = hitTestNode(graph, layout, x, y);
      if (node) {
        if (hoverNodeId !== node.id) {
          hoverNodeId = node.id;
          draw();
        }
        showTooltip(tooltip, node.label, x, y, canvas);
        canvas.style.cursor = "pointer";
      } else {
        hoverNodeId = null;
        hideTooltip(tooltip);
        canvas.style.cursor = "default";
        draw();
      }
    });

    canvas.addEventListener("mouseleave", () => {
      hoverNodeId = null;
      hideTooltip(tooltip);
      canvas.style.cursor = "default";
      draw();
    });

    canvas.addEventListener("click", (evt) => {
      const rect = canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;
      const node = hitTestNode(graph, layout, x, y);
      if (node) {
        console.log("[Issue Web] Node clicked:", node);
      }
    });
  }

  function computeLayout(graph, width, height) {
    const nodes = graph.nodes;
    const layout = {};

    const centerX = width / 2;
    const centerY = height / 2;
    const radiusOuter = Math.min(width, height) * 0.36;
    const radiusInner = radiusOuter * 0.55;

    const billNodes = nodes.filter((n) => n.type === "bill");
    const issueNodes = nodes.filter((n) => n.type === "issue");
    const actorNodes = nodes.filter((n) => n.type === "actor");

    if (billNodes.length === 0) {
      const step = (Math.PI * 2) / nodes.length;
      nodes.forEach((n, i) => {
        const angle = step * i - Math.PI / 2;
        layout[n.id] = {
          x: centerX + radiusOuter * Math.cos(angle),
          y: centerY + radiusOuter * Math.sin(angle),
          r: nodeRadius(n)
        };
      });
      return layout;
    }

    // Center: bill
    billNodes.forEach((n, i) => {
      const spread = 10;
      layout[n.id] = {
        x: centerX + (i - (billNodes.length - 1) / 2) * spread,
        y: centerY,
        r: nodeRadius(n)
      };
    });

    // Inner ring: issues
    if (issueNodes.length) {
      const step = (Math.PI * 2) / issueNodes.length;
      issueNodes.forEach((n, i) => {
        const angle = step * i - Math.PI / 2;
        layout[n.id] = {
          x: centerX + radiusInner * Math.cos(angle),
          y: centerY + radiusInner * Math.sin(angle),
          r: nodeRadius(n)
        };
      });
    }

    // Outer ring: actors
    if (actorNodes.length) {
      const step = (Math.PI * 2) / actorNodes.length;
      actorNodes.forEach((n, i) => {
        const angle = step * i - Math.PI / 2;
        layout[n.id] = {
          x: centerX + radiusOuter * Math.cos(angle),
          y: centerY + radiusOuter * Math.sin(angle),
          r: nodeRadius(n)
        };
      });
    }

    return layout;
  }

  function nodeRadius(node) {
    const base =
      node.type === "bill" ? 9 :
      node.type === "issue" ? 7 :
      6;
    const importance =
      typeof node.importance === "number" ? node.importance : 0.7;
    return base + importance * 4;
  }

  function drawBackground(ctx, width, height) {
    const grd = ctx.createLinearGradient(0, 0, width, height);
    grd.addColorStop(0, "#020617");
    grd.addColorStop(1, "#020617");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
    const step = 28;
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawLinks(ctx, graph, layout, hoverNodeId) {
    ctx.save();
    ctx.lineCap = "round";

    graph.links.forEach((link) => {
      const src = layout[link.source];
      const tgt = layout[link.target];
      if (!src || !tgt) return;

      const isHover =
        hoverNodeId === link.source || hoverNodeId === link.target;

      ctx.lineWidth = isHover ? 2 : 1;
      ctx.strokeStyle = isHover
        ? "rgba(248, 250, 252, 0.9)"
        : "rgba(148, 163, 184, 0.55)";

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawNodes(ctx, graph, layout, hoverNodeId) {
    graph.nodes.forEach((node) => {
      const pos = layout[node.id];
      if (!pos) return;

      const isHover = hoverNodeId === node.id;
      const { fill, stroke } = nodeColors(node, isHover);
      const r = pos.r * (isHover ? 1.15 : 1);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = isHover ? 2 : 1;
      ctx.strokeStyle = stroke;
      ctx.stroke();

      const label = nodeLabelShort(node.label);
      ctx.font = `${isHover ? 10 : 9}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#e5e7eb";
      ctx.fillText(label, pos.x, pos.y + r + 2);
    });
  }

  function nodeColors(node, isHover) {
    if (node.type === "bill") {
      return {
        fill: isHover ? "#38bdf8" : "#0ea5e9",
        stroke: "#f9fafb"
      };
    }
    if (node.type === "issue") {
      return {
        fill: isHover ? "#a855f7" : "#7c3aed",
        stroke: "#e5e7eb"
      };
    }
    return {
      fill: isHover ? "#22c55e" : "#16a34a",
      stroke: "#cbd5f5"
    };
  }

  function nodeLabelShort(label) {
    if (!label) return "";
    if (label.length <= 18) return label;
    return label.slice(0, 15) + "…";
  }

  function hitTestNode(graph, layout, x, y) {
    for (let i = 0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i];
      const pos = layout[node.id];
      if (!pos) continue;
      const dx = x - pos.x;
      const dy = y - pos.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 <= pos.r * pos.r * 1.5) return node;
    }
    return null;
  }

  function showTooltip(tooltip, text, canvasX, canvasY, canvas) {
    tooltip.textContent = text;
    tooltip.style.left = `${canvasX}px`;
    tooltip.style.top = `${canvasY}px`;
    tooltip.style.opacity = "1";
  }

  function hideTooltip(tooltip) {
    tooltip.style.opacity = "0";
  }

  // -----------------------------
  //  Boot
  // -----------------------------

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIssueWeb);
  } else {
    initIssueWeb();
  }
})();
