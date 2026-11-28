import assert from "node:assert/strict";
import { test } from "node:test";
import { events, inventory, mockWS, NOW, services, states } from "../scripts/mock-states.mjs";
import { defined, fp } from "./load.mjs";

const makeHass = (extra = {}) => ({
  states,
  locale: { language: "en", time_format: "24" },
  user: { is_admin: true },
  themes: { darkMode: false },
  calls: [],
  services,
  callWS: async (msg) => mockWS(msg),
  callApi: async (_m, path) => events[/^calendars\/([^?]+)/.exec(path)[1]] || [],
  async callService(...args) {
    this.calls.push(args);
  },
  ...extra,
});
const open = async (tab, hass = makeHass()) => {
  const el = new (defined.get("family-panel"))();
  el.route = { path: `/${tab}` };
  el.hass = hass;
  await new Promise((r) => setTimeout(r, 20));
  return el;
};

test("the panel is defined and its version follows the integration", () => {
  assert.ok(defined.get("family-panel"));
  assert.equal(fp.FAMILY_PANEL_VERSION, "1.1.0");
});

test("Today: the header, the children, tonight and the meals", async () => {
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    const html = (await open("today")).shadowRoot.innerHTML;
    assert.match(html, /5 to handle/);
    assert.match(html, /School tomorrow at 08:30/);
    assert.match(html, /Recycling collected today/);
    // Who is home: a zone, a distance and the way
    assert.match(html, /Gym/);
    assert.match(html, /12\.4 km · arriving/);
    // What to handle, with its action: the overdue chore first, the word to sign
    assert.match(html, /Walk the dog · since yesterday[\s\S]*data-action="todo"/);
    assert.match(html, /data-action="sign" data-word="w1" data-kid="c-alex"/);
    assert.match(html, /Saint Catherine/);
    assert.match(html, /Alex/);
    assert.match(html, /Noé/);
    assert.match(html, /Squash gratin/);
    assert.match(html, /Judo · Alex/);
    assert.match(html, /23 days/);
    // Every tab, the active one marked
    assert.equal((html.match(/class="tab( active)?"/g) || []).length, 7);
    assert.match(html, /class="tab active"[^>]*data-tab="today"/);
  } finally {
    Date.now = realNow;
  }
});

test("each tab draws its content", async () => {
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    assert.match((await open("school")).shadowRoot.innerHTML, /Times table of 7/);
    const meals = (await open("meals")).shadowRoot.innerHTML;
    assert.match(meals, /Buckwheat flour/);
    // Mealie's servings and time, the aisles of the shopping list
    assert.match(meals, /4 servings · 45 min/);
    assert.match(meals, /Dairy[\s\S]*Eggs \(12\)[\s\S]*Grated cheese/);
    assert.match((await open("chores")).shadowRoot.innerHTML, /Overdue[\s\S]*Walk the dog/);
    const screens = (await open("screens")).shadowRoot.innerHTML;
    assert.match(screens, /45 min/);
    assert.match(screens, /YouTube Kids/);
    assert.match(screens, /bonus 15 min running/);
    assert.match((await open("settings")).shadowRoot.innerHTML, /Charlie/);
    assert.match((await open("agenda")).shadowRoot.innerHTML, /Birthday party/);
  } finally {
    Date.now = realNow;
  }
});

test("names coming from Home Assistant are escaped", async () => {
  const evil = { ...states, "sensor.saint_of_the_day": { ...states["sensor.saint_of_the_day"], state: "<img src=x onerror=alert(1)>" } };
  const html = (await open("today", makeHass({ states: evil }))).shadowRoot.innerHTML;
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img src=x/);
});

const click = (el, dataset) => el._onClick({ composedPath: () => [Object.assign(Object.create(Element.prototype), { dataset })] });

test("ticking an item calls the to-do service", async () => {
  const hass = makeHass();
  const el = await open("meals", hass);
  await click(el, { action: "todo", todo: "todo.shopping_list", uid: "s1", done: "1" });
  assert.deepEqual(hass.calls[0], ["todo", "update_item", { item: "s1", status: "completed" }, { entity_id: "todo.shopping_list" }]);
});

test("the actions call the integrations' services, asking in the panel first", async () => {
  const hass = makeHass();
  const el = await open("screens", hass);
  await click(el, { action: "bonus", kid: "Alex", minutes: "30" });
  await click(el, { action: "schoolmode", kid: "Alex", on: "1" });
  // Locking asks first: nothing happens until confirmed, nothing when canceled
  await click(el, { action: "fl", service: "lock", kid: "Noé", ask: "1" });
  assert.match(el._askHtml(), /Lock Noé&#39;s devices\?/);
  assert.equal(hass.calls.length, 2);
  await click(el, { action: "ask-cancel" });
  assert.equal(el._ask, null);
  await click(el, { action: "fl", service: "lock", kid: "Noé", ask: "1" });
  await click(el, { action: "ask-ok" });
  await click(el, { action: "sign", word: "w1", kid: "c-alex", name: "Trip" });
  assert.match(el._askHtml(), /Sign “Trip” in the liaison book\?/);
  await click(el, { action: "ask-ok" });
  assert.deepEqual(hass.calls, [
    ["family_link", "add_bonus", { child: "Alex", minutes: 30 }],
    ["family_link", "school_mode", { child: "Alex", enable: true }],
    ["family_link", "lock", { child: "Noé" }],
    ["ent_one", "sign_word", { word_id: "w1", child_id: "c-alex" }],
  ]);
  // A click inside the dialog does not cancel it
  await click(el, { action: "sign", word: "w1", kid: "c-alex", name: "Trip" });
  await el._onClick({ composedPath: () => [Object.assign(Object.create(Element.prototype), { dataset: { stop: "1" } }), Object.assign(Object.create(Element.prototype), { dataset: { action: "ask-cancel" } })] });
  assert.ok(el._ask);
});

test("a day is planned in Mealie: a free slot gets a meal, a planned one is changed in place", async () => {
  const hass = makeHass();
  const el = await open("meals", hass);
  await new Promise((r) => setTimeout(r, 20));
  // Saturday has no dinner: a note is a new meal
  await click(el, { action: "meal", day: "2026-11-28", type: "dinner" });
  assert.match(el.shadowRoot.innerHTML, /Plan Saturday · dinner/);
  el._mealEdit.q = "Pancakes";
  await click(el, { action: "meal-note" });
  assert.deepEqual(hass.calls[0], ["mealie", "set_mealplan", { config_entry_id: "mealie_entry", date: "2026-11-28", entry_type: "dinner", note_title: "Pancakes" }]);
  // Tonight's dinner (a recipe) replaced by another recipe: updated, not added
  await click(el, { action: "meal", day: "2026-11-26", type: "dinner" });
  await click(el, { action: "meal-recipe", id: "r6" });
  assert.deepEqual(hass.calls[1], ["mealie", "update_mealplan", { config_entry_id: "mealie_entry", date: "2026-11-26", entry_type: "dinner", mealplan_id: "dinner0", recipe_id: "r6" }]);
  // A recipe replaced by a note, or by a random recipe: deleted, then planned again
  await click(el, { action: "meal", day: "2026-11-26", type: "dinner" });
  el._mealEdit.q = "Leftovers";
  await click(el, { action: "meal-note" });
  assert.deepEqual(hass.calls.slice(2, 4).map((c) => c[1]), ["delete_mealplan", "set_mealplan"]);
  await click(el, { action: "meal", day: "2026-11-26", type: "dinner" });
  await click(el, { action: "meal-random" });
  assert.deepEqual(hass.calls.slice(4, 6).map((c) => c[1]), ["delete_mealplan", "set_random_mealplan"]);
  // Clear: the meal deleted
  await click(el, { action: "meal", day: "2026-11-26", type: "dinner" });
  await click(el, { action: "meal-clear" });
  assert.deepEqual(hass.calls[6], ["mealie", "delete_mealplan", { config_entry_id: "mealie_entry", mealplan_id: "dinner0" }]);
});

test("without Mealie's update and delete actions, a planned meal is not offered for change", async () => {
  const hass = makeHass({ services: { mealie: { get_mealplan: {}, set_mealplan: {}, set_random_mealplan: {} } } });
  const el = await open("meals", hass);
  await new Promise((r) => setTimeout(r, 20));
  const html = el.shadowRoot.innerHTML;
  // Tonight (planned) has no Change button; Saturday (free) can be planned
  assert.doesNotMatch(html, /data-action="meal" data-day="2026-11-26"/);
  assert.match(html, /data-action="meal" data-day="2026-11-28" data-type="dinner"/);
});
