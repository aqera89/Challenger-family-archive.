
const nodes = document.getElementById("nodes");
const details = document.getElementById("details");
const search = document.getElementById("search");

let people = [];
let families = [];
let byId = new Map();
let selected = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function dates(person) {
  const birth = person.birth?.date || "";
  const death = person.death?.date || "";

  if (birth || death) {
    return [birth, death].filter(Boolean).join(" – ");
  }

  return person.deceased
    ? "Deceased"
    : "Dates not recorded";
}

function locationText(person) {
  return [
    person.birth?.place,
    person.death?.place
  ].filter(Boolean).join(" / ") || "Not recorded";
}

function relativeLinks(ids) {
  const unique = [...new Set(ids)].filter(id => byId.has(id));

  if (!unique.length) {
    return '<span class="muted">Not recorded</span>';
  }

  return unique.map(id => {
    const person = byId.get(id);

    return `<button class="relative" data-person="${escapeHTML(id)}">${escapeHTML(person.name)}</button>`;
  }).join(" ");
}

function show(person) {
  selected = person.id;

  const parents = [];
  const partners = [];
  const children = [];

  families.forEach(family => {
    if (family.children?.includes(person.id)) {
      parents.push(...(family.parents || []));
    }

    if (family.parents?.includes(person.id)) {
      partners.push(
        ...(family.parents || []).filter(id => id !== person.id)
      );
      children.push(...(family.children || []));
    }
  });

  details.innerHTML = `
    <span class="status">
      ${person.deceased ? "Deceased" : "Death not recorded"}
    </span>

    <h3>${escapeHTML(person.name)}</h3>
    <p>${escapeHTML(dates(person))}</p>

    <dl>
      <dt>Birthplace</dt>
      <dd>${escapeHTML(person.birth?.place || "Not recorded")}</dd>

      <dt>Deathplace</dt>
      <dd>${escapeHTML(person.death?.place || "Not recorded")}</dd>

      <dt>Parents</dt>
      <dd>${relativeLinks(parents)}</dd>

      <dt>Partners</dt>
      <dd>${relativeLinks(partners)}</dd>

      <dt>Children</dt>
      <dd>${relativeLinks(children)}</dd>
    </dl>

    <p class="muted">
      Family relationships are based on imported GEDCOM records
      and may require independent verification.
    </p>
  `;

  details.querySelectorAll("[data-person]").forEach(button => {
    button.addEventListener("click", () => {
      const relative = byId.get(button.dataset.person);

      if (relative) {
        search.value = "";
        show(relative);
        document.getElementById("tree").scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });

  render();
}

function render() {
  const query = search.value.trim().toLowerCase();

  const matches = people.filter(person => {
    return [
      person.name,
      dates(person),
      locationText(person)
    ].join(" ").toLowerCase().includes(query);
  });

  nodes.replaceChildren();

  if (!matches.length) {
    nodes.innerHTML = '<p class="empty">No relatives found.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  matches.forEach(person => {
    const button = document.createElement("button");

    button.className =
      "person" + (selected === person.id ? " active" : "");

    button.innerHTML = `
      ${escapeHTML(person.name)}
      <small>${escapeHTML(dates(person))}</small>
    `;

    button.addEventListener("click", () => show(person));
    fragment.append(button);
  });

  nodes.append(fragment);
}

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

    byId = new Map(people.map(person => [person.id, person]));

    render();

    if (people.length) {
      const startingPerson = people.find(person =>
        person.name.toLowerCase() === "robert james challenger"
      ) || people[0];

      show(startingPerson);
    }
  })
  .catch(error => {
    console.error(error);
    nodes.textContent = "Unable to load family data. Please refresh.";
  });

search.addEventListener("input", render);

