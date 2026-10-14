
const nodes = document.getElementById("nodes");
const details = document.getElementById("details");
const search = document.getElementById("search");

let people = [];
let families = [];
let byId = new Map();
let parentOf = new Map();
let childOf = new Map();
let selected = null;
let view = "ancestors";
let depth = 4;

const safe = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const unique = ids =>
  [...new Set(ids)].filter(id => byId.has(id));

function dates(person) {
  const birth = person.birth?.date || "";
  const death = person.death?.date || "";

  return [birth, death].filter(Boolean).join(" – ") ||
    (person.deceased ? "Deceased" : "Dates not recorded");
}

// Add tree styling without changing style.css
const style = document.createElement("style");

style.textContent = `
.nodes {
  display: block !important;
  min-height: 480px;
  overflow: auto !important;
  padding: 22px !important;
}

.tree-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 18px;
}

.tree-controls button,
.relative {
  border: 1px solid #68795d;
  background: #263d32;
  color: #f5f2e9;
  border-radius: 6px;
  padding: 9px 12px;
  cursor: pointer;
}

.tree-controls button[aria-pressed="true"] {
  background: #bda36d;
  color: #102019;
}

.tree-controls select {
  background: #263d32;
  color: white;
  padding: 9px;
  border-radius: 6px;
}

.tree-hint {
  font-size: 12px;
  color: #b5c3b4;
  margin: 0 0 18px;
}

.family-tree,
.family-tree ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.family-tree ul {
  margin-left: 23px;
  padding-left: 20px;
  border-left: 2px solid #7b8c6a;
}

.family-tree li {
  position: relative;
  margin: 12px 0;
}

.family-tree ul > li::before {
  content: "";
  position: absolute;
  left: -20px;
  top: 21px;
  width: 20px;
  border-top: 2px solid #7b8c6a;
}

.family-tree .person {
  display: block;
  text-align: left;
  min-width: 0;
  width: fit-content;
  max-width: 100%;
  white-space: normal;
}

.family-tree .person small {
  font-size: 11px;
}

.relative {
  margin: 3px;
  font-size: 12px;
}

.tree-empty {
  color: #b5c3b4;
  padding: 15px;
}

@media (max-width: 760px) {
  .family-tree ul {
    margin-left: 9px;
    padding-left: 13px;
  }

  .family-tree ul > li::before {
    left: -13px;
    width: 13px;
  }
}
`;

document.head.append(style);

// Find a person's recorded relatives
function relatives(id) {
  const parents = unique(parentOf.get(id) || []);
  const children = unique(childOf.get(id) || []);

  const partners = unique(
    families
      .filter(family => family.parents?.includes(id))
      .flatMap(family =>
        family.parents.filter(parent => parent !== id)
      )
  );

  return { parents, children, partners };
}

// Create clickable links to relatives
function linkButtons(ids) {
  if (!ids.length) {
    return '<span class="muted">Not recorded</span>';
  }

  return ids.map(id => `
    <button class="relative" data-id="${safe(id)}">
      ${safe(byId.get(id).name)}
    </button>
  `).join(" ");
}

// Display the selected person's profile
function show(id, redraw = true) {
  const person = byId.get(id);
  if (!person) return;

  selected = id;
  const r = relatives(id);

  details.innerHTML = `
    <span class="status">
      ${person.deceased ? "Deceased" : "Death not recorded"}
    </span>

    <h3>${safe(person.name)}</h3>
    <p>${safe(dates(person))}</p>

    <dl>
      <dt>Birthplace</dt>
      <dd>${safe(person.birth?.place || "Not recorded")}</dd>

      <dt>Deathplace</dt>
      <dd>${safe(person.death?.place || "Not recorded")}</dd>

      <dt>Parents</dt>
      <dd>${linkButtons(r.parents)}</dd>

      <dt>Partners</dt>
      <dd>${linkButtons(r.partners)}</dd>

      <dt>Children</dt>
      <dd>${linkButtons(r.children)}</dd>
    </dl>

    <p class="muted">
      Relationships reflect the imported GEDCOM
      and may require historical verification.
    </p>
  `;

  details.querySelectorAll("[data-id]").forEach(button => {
    button.addEventListener("click", () => {
      search.value = "";
      show(button.dataset.id);
    });
  });

  if (redraw) render();
}

// Build connected family branches
function branch(id, remaining, path = new Set()) {
  const person = byId.get(id);

  if (!person || path.has(id)) return "";

  const nextPath = new Set(path);
  nextPath.add(id);

  const linked = view === "ancestors"
    ? relatives(id).parents
    : relatives(id).children;

  const descendants = remaining > 1
    ? linked.map(relativeId =>
        branch(relativeId, remaining - 1, nextPath)
      ).join("")
    : "";

  return `
    <li>
      <button
        class="person${selected === id ? " active" : ""}"
        data-id="${safe(id)}"
      >
        ${safe(person.name)}
        <small>${safe(dates(person))}</small>
      </button>

      ${descendants ? `<ul>${descendants}</ul>` : ""}
    </li>
  `;
}

// Render the interactive family tree
function render() {
  const query = search.value.trim().toLowerCase();

  const matches = people.filter(person =>
    [
      person.name,
      dates(person),
      person.birth?.place,
      person.death?.place
    ].join(" ").toLowerCase().includes(query)
  );

  nodes.innerHTML = `
    <div class="tree-controls">
      <button
        data-view="ancestors"
        aria-pressed="${view === "ancestors"}"
      >
        Ancestors ↑
      </button>

      <button
        data-view="descendants"
        aria-pressed="${view === "descendants"}"
      >
        Descendants ↓
      </button>

      <label>
        Generations
        <select id="generations">
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
        </select>
      </label>
    </div>

    <p class="tree-hint">
      ${query
        ? `${matches.length} matching relatives. Select a name to explore its branch.`
        : "Select a person to explore connected generations."}
    </p>

    <ul class="family-tree">
      ${query
        ? matches.slice(0, 100)
            .map(person => branch(person.id, 1))
            .join("")
        : selected ? branch(selected, depth) : ""}
    </ul>

    ${query && matches.length > 100
      ? '<p class="tree-hint">Showing the first 100 matches. Refine your search.</p>'
      : ""}

    ${query && !matches.length
      ? '<p class="tree-empty">No relatives found.</p>'
      : ""}
  `;

  nodes.querySelectorAll("[data-id]").forEach(button => {
    button.addEventListener("click", () => {
      search.value = "";
      show(button.dataset.id);
    });
  });

  nodes.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      view = button.dataset.view;
      render();
    });
  });

  const selector = document.getElementById("generations");
  selector.value = String(depth);

  selector.addEventListener("change", () => {
    depth = Number(selector.value);
    render();
  });
}

// Load the imported GEDCOM JSON
fetch("challenger-family-public.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("Family data unavailable");
    }
    return response.json();
  })
  .then(data => {
    people = Array.isArray(data.people) ? data.people : [];
    families = Array.isArray(data.families) ? data.families : [];

    byId = new Map(
      people.map(person => [person.id, person])
    );

    // Build parent and child relationship indexes
    for (const family of families) {
      for (const child of family.children || []) {
        parentOf.set(
          child,
          unique([
            ...(parentOf.get(child) || []),
            ...(family.parents || [])
          ])
        );
      }

      for (const parent of family.parents || []) {
        childOf.set(
          parent,
          unique([
            ...(childOf.get(parent) || []),
            ...(family.children || [])
          ])
        );
      }
    }

    // Begin with Robert James Challenger
    const startingPerson = people.find(person =>
      person.name.toLowerCase() === "robert james challenger"
    ) || people[0];

    if (startingPerson) {
      show(startingPerson.id);
    } else {
      nodes.textContent = "No family records available.";
    }
  })
  .catch(error => {
    console.error(error);
    nodes.textContent =
      "Unable to load family data. Please refresh.";
  });

search.addEventListener("input", render);
