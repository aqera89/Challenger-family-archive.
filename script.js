
const nodes = document.getElementById("nodes");
const details = document.getElementById("details");
const search = document.getElementById("search");

let people = [];
let families = [];
let byId = new Map();
let parents = new Map();
let children = new Map();

let selected = null;
let root = null;
let mode = "parents";
let generations = 4;
let scale = 1;
let expanded = new Set();

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const uniq = ids =>
  [...new Set(ids)].filter(id => byId.has(id));

function date(person) {
  return [
    person.birth?.date,
    person.death?.date
  ].filter(Boolean).join(" – ") ||
    (person.deceased ? "Deceased" : "Dates not recorded");
}

function related(id) {
  return {
    parents: uniq(parents.get(id) || []),
    children: uniq(children.get(id) || []),
    partners: uniq(
      families
        .filter(f => (f.parents || []).includes(id))
        .flatMap(f =>
          (f.parents || []).filter(x => x !== id)
        )
    )
  };
}

// VISUAL STYLING

const css = document.createElement("style");

css.textContent = `
.workspace {
  grid-template-columns: minmax(0,1fr) 290px;
}

.nodes {
  display: block !important;
  padding: 0 !important;
  overflow: hidden !important;
  min-height: 570px;
  position: relative;
}

.tree-toolbar {
  display: flex;
  gap: 7px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px;
  background: #15271f;
  border-bottom: 1px solid #435444;
}

.tree-toolbar button,
.tree-toolbar select,
.tree-zoom button {
  background: #273e32;
  color: #f5f0e4;
  border: 1px solid #67735a;
  border-radius: 6px;
  padding: 9px 11px;
  cursor: pointer;
}

.tree-toolbar button.active {
  background: #c4a66e;
  color: #12251c;
}

.tree-toolbar label {
  display: flex;
  gap: 7px;
  align-items: center;
}

.tree-toolbar select {
  padding: 8px;
}

.tree-viewport {
  height: 530px;
  overflow: auto;
  position: relative;
  touch-action: pan-x pan-y;
  background: radial-gradient(
    ellipse at center,
    #234032 0%,
    #13251d 78%
  );
}

.tree-stage {
  position: relative;
  transform-origin: top left;
  margin: 35px auto;
}

.tree-links {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.tree-links path {
  stroke: #bda16c;
  stroke-width: 2;
  fill: none;
  opacity: .85;
}

.tree-card {
  position: absolute;
  width: 188px;
  min-height: 76px;
  border: 1px solid #748066;
  border-radius: 9px;
  background: #203b2e;
  color: #f5f0e7;
  box-shadow: 0 5px 16px #0005;
  text-align: left;
  padding: 12px 12px 10px;
  cursor: pointer;
}

.tree-card.selected {
  border: 2px solid #e4bd74;
  background: #345541;
  box-shadow: 0 0 0 3px #c3a66d22;
}

.tree-card .name {
  display: block;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
}

.tree-card .dates {
  display: block;
  color: #c3b88f;
  font-size: 11px;
  margin-top: 7px;
}

.tree-card .expand {
  position: absolute;
  right: -11px;
  top: 25px;
  background: #c4a66e;
  color: #10241b;
  border: 1px solid #e4cc93;
  border-radius: 50%;
  width: 23px;
  height: 23px;
  display: grid;
  place-items: center;
  font-weight: 700;
}

.tree-zoom {
  display: flex;
  gap: 5px;
  padding: 10px 14px;
  background: #15271f;
  border-top: 1px solid #435444;
}

.tree-note {
  padding: 10px 14px;
  color: #b9c4b8;
  font-size: 12px;
}

.relative {
  display: inline-block;
  background: #294537;
  color: #f3ead7;
  border: 1px solid #6c785e;
  border-radius: 5px;
  padding: 7px;
  margin: 3px;
  cursor: pointer;
  font-size: 12px;
}

aside dl {
  grid-template-columns: 76px 1fr;
}

aside dd {
  overflow-wrap: anywhere;
}

@media (max-width: 850px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .tree-viewport {
    height: 510px;
  }

  .tree-toolbar {
    gap: 5px;
  }

  .tree-toolbar button {
    padding: 8px;
  }

  .nodes {
    min-height: 0;
  }
}
`;

document.head.append(css);

// INDIVIDUAL PROFILE

function profile(id) {
  const person = byId.get(id);
  if (!person) return;

  selected = id;

  const r = related(id);

  const links = ids =>
    ids.length
      ? ids.map(x => `
          <button class="relative" data-relative="${esc(x)}">
            ${esc(byId.get(x).name)}
          </button>
        `).join("")
      : '<span class="muted">Not recorded</span>';

  details.innerHTML = `
    <span class="status">
      ${person.deceased ? "Deceased" : "Death not recorded"}
    </span>

    <h3>${esc(person.name)}</h3>
    <p>${esc(date(person))}</p>

    <dl>
      <dt>Born</dt>
      <dd>${esc(person.birth?.place || "Not recorded")}</dd>

      <dt>Died</dt>
      <dd>${esc(person.death?.place || "Not recorded")}</dd>

      <dt>Parents</dt>
      <dd>${links(r.parents)}</dd>

      <dt>Partners</dt>
      <dd>${links(r.partners)}</dd>

      <dt>Children</dt>
      <dd>${links(r.children)}</dd>
    </dl>

    <p class="muted">
      Information reflects imported family records
      and may require historical verification.
    </p>
  `;

  details.querySelectorAll("[data-relative]").forEach(button => {
    button.onclick = () => focus(button.dataset.relative);
  });
}

// START A TREE FROM A PERSON

function focus(id) {
  if (!byId.has(id)) return;

  root = id;
  selected = id;
  expanded = new Set([id]);
  scale = 1;

  search.value = "";

  profile(id);
  render();
}

// BUILD GENERATIONS

function build() {
  if (!root) {
    return { levels: [], edges: [] };
  }

  const levels = [[root]];
  const edges = [];
  const seen = new Set([root]);

  for (let i = 1; i < generations; i++) {
    const next = [];

    for (const id of levels[i - 1]) {
      if (!expanded.has(id)) continue;

      // FIX: use "parents" or "children"
      const relatives = related(id)[mode] || [];

      for (const relativeId of relatives) {
        if (seen.has(relativeId)) continue;

        seen.add(relativeId);
        next.push(relativeId);
        edges.push([id, relativeId]);
      }
    }

    if (!next.length) break;

    levels.push(next);
  }

  return { levels, edges };
}

// RENDER TREE

function render() {
  const query = search.value.trim().toLowerCase();

  // SEARCH RESULTS

  if (query) {
    const allMatches = people.filter(person =>
      [
        person.name,
        person.birth?.date,
        person.birth?.place,
        person.death?.date,
        person.death?.place
      ].join(" ").toLowerCase().includes(query)
    );

    const matches = allMatches.slice(0, 60);

    nodes.innerHTML = `
      <div class="tree-toolbar">
        <button id="clearSearch">Back to tree</button>
        <span class="muted">
          ${allMatches.length} matching records
        </span>
      </div>

      <div style="padding:15px;max-height:520px;overflow:auto">
        ${matches.map(person => `
          <button class="relative" data-result="${esc(person.id)}">
            ${esc(person.name)} · ${esc(date(person))}
          </button>
        `).join("") || '<p class="muted">No matches found</p>'}
      </div>
    `;

    nodes.querySelector("#clearSearch").onclick = () => {
      search.value = "";
      render();
    };

    nodes.querySelectorAll("[data-result]").forEach(button => {
      button.onclick = () => focus(button.dataset.result);
    });

    return;
  }

  // CALCULATE NODE POSITIONS

  const { levels, edges } = build();

  const cardW = 188;
  const cardH = 90;
  const gapX = 38;
  const gapY = 80;

  const stepX = cardW + gapX;
  const stepY = cardH + gapY;

  const maxCount = Math.max(
    1,
    ...levels.map(level => level.length)
  );

  const width = Math.max(
    660,
    maxCount * stepX + 90
  );

  const height = Math.max(
    440,
    levels.length * stepY + 80
  );

  const coords = new Map();

  levels.forEach((level, i) => {
    const rowWidth = level.length * stepX - gapX;
    const start = (width - rowWidth) / 2;

    level.forEach((id, j) => {
      coords.set(id, {
        x: start + j * stepX,
        y: 35 + i * stepY
      });
    });
  });

  // DRAW CONNECTING LINES

  const lines = edges.map(([a, b]) => {
    const A = coords.get(a);
    const B = coords.get(b);

    if (!A || !B) return "";

    const x1 = A.x + cardW / 2;
    const y1 = A.y + cardH;
    const x2 = B.x + cardW / 2;
    const y2 = B.y;
    const mid = (y1 + y2) / 2;

    return `
      <path d="M${x1} ${y1} V${mid} H${x2} V${y2}" />
    `;
  }).join("");

  // GENERATE PERSON CARDS

  const cards = [...coords].map(([id, position]) => {
    const person = byId.get(id);
    const hasRelatives = related(id)[mode].length > 0;

    return `
      <button
        class="tree-card ${id === selected ? "selected" : ""}"
        data-person="${esc(id)}"
        style="left:${position.x}px;top:${position.y}px"
      >
        <span class="name">${esc(person.name)}</span>
        <span class="dates">${esc(date(person))}</span>

        ${hasRelatives ? `
          <span class="expand" aria-hidden="true">
            ${expanded.has(id) ? "−" : "+"}
          </span>
        ` : ""}
      </button>
    `;
  }).join("");

  // BUILD INTERFACE

  nodes.innerHTML = `
    <div class="tree-toolbar">

      <button
        data-mode="parents"
        class="${mode === "parents" ? "active" : ""}"
      >
        Ancestors ↑
      </button>

      <button
        data-mode="children"
        class="${mode === "children" ? "active" : ""}"
      >
        Descendants ↓
      </button>

      <label>
        Generations
        <select id="genCount">
          ${[3, 4, 5, 6].map(n => `
            <option value="${n}"
              ${generations === n ? "selected" : ""}>
              ${n}
            </option>
          `).join("")}
        </select>
      </label>

      <button id="expandAll">
        Expand visible
      </button>

    </div>

    <div class="tree-viewport" id="treeViewport">
      <div
        class="tree-stage"
        id="treeStage"
        style="
          width:${width}px;
          height:${height}px;
          transform:scale(${scale});
        "
      >
        <svg
          class="tree-links"
          width="${width}"
          height="${height}"
        >
          ${lines}
        </svg>

        ${cards}
      </div>
    </div>

    <div class="tree-zoom">
      <button id="zoomOut">−</button>
      <button id="zoomIn">+</button>
      <button id="zoomReset">Reset zoom</button>
    </div>

    <div class="tree-note">
      Tap a family member to expand or collapse their branch.
      Select a relative in the profile to start a new tree.
    </div>
  `;

  // VIEW SWITCHING

  nodes.querySelectorAll("[data-mode]").forEach(button => {
    button.onclick = () => {
      mode = button.dataset.mode;
      expanded = new Set([root]);
      render();
    };
  });

  // GENERATIONS

  nodes.querySelector("#genCount").onchange = event => {
    generations = Number(event.target.value);
    render();
  };

  // EXPAND AND COLLAPSE

  nodes.querySelectorAll("[data-person]").forEach(button => {
    button.onclick = () => {
      const id = button.dataset.person;

      profile(id);

      if (expanded.has(id)) {
        expanded.delete(id);
      } else {
        expanded.add(id);
      }

      render();
    };
  });

  // EXPAND ALL VISIBLE GENERATIONS

  nodes.querySelector("#expandAll").onclick = () => {
    const visited = new Set([root]);
    let frontier = [root];

    for (let i = 1; i < generations; i++) {
      const next = [];

      for (const id of frontier) {
        expanded.add(id);

        for (const relativeId of related(id)[mode] || []) {
          if (!visited.has(relativeId)) {
            visited.add(relativeId);
            next.push(relativeId);
          }
        }
      }

      frontier = next;
    }

    render();
  };

  // ZOOM CONTROLS

  nodes.querySelector("#zoomIn").onclick = () => {
    scale = Math.min(
      1.6,
      +(scale + 0.15).toFixed(2)
    );
    render();
  };

  nodes.querySelector("#zoomOut").onclick = () => {
    scale = Math.max(
      0.45,
      +(scale - 0.15).toFixed(2)
    );
    render();
  };

  nodes.querySelector("#zoomReset").onclick = () => {
    scale = 1;
    render();
  };
}

// LOAD FAMILY TREE DATA

fetch("challenger-family-public.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("Family data unavailable");
    }

    return response.json();
  })
  .then(data => {
    people = Array.isArray(data.people)
      ? data.people
      : [];

    families = Array.isArray(data.families)
      ? data.families
      : [];

    byId = new Map(
      people.map(person => [person.id, person])
    );

    // BUILD RELATIONSHIP INDEXES

    for (const family of families) {
      for (const child of family.children || []) {
        parents.set(
          child,
          uniq([
            ...(parents.get(child) || []),
            ...(family.parents || [])
          ])
        );
      }

      for (const parent of family.parents || []) {
        children.set(
          parent,
          uniq([
            ...(children.get(parent) || []),
            ...(family.children || [])
          ])
        );
      }
    }

    // START WITH ROBERT JAMES CHALLENGER

    const startingPerson = people.find(person =>
      person.name.toLowerCase() ===
      "robert james challenger"
    ) || people[0];

    if (startingPerson) {
      focus(startingPerson.id);
    } else {
      nodes.textContent = "No family records found.";
    }
  })
  .catch(error => {
    console.error("Family tree error:", error);

    nodes.textContent =
      "Unable to load family data. Please refresh.";
  });

// SEARCH INPUT

search.addEventListener("input", render);
