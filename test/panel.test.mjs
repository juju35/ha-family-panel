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

test("the actions call the integrations' services", async () => {
  const hass = makeHass();
  const el = await open("screens", hass);
  globalThis.confirm = () => true;
  await click(el, { action: "bonus", kid: "Alex", minutes: "30" });
  await click(el, { action: "fl", service: "lock", kid: "Noé", ask: "1" });
  await click(el, { action: "schoolmode", kid: "Alex", on: "1" });
  await click(el, { action: "sign", word: "w1", kid: "c-alex", name: "Trip" });
  assert.deepEqual(hass.calls, [
    ["family_link", "add_bonus", { child: "Alex", minutes: 30 }],
    ["family_link", "lock", { child: "Noé" }],
    ["family_link", "school_mode", { child: "Alex", enable: true }],
    ["ent_one", "sign_word", { word_id: "w1", child_id: "c-alex" }],
  ]);
  // Asked first: nothing happens when it is declined
  globalThis.confirm = () => false;
  await click(el, { action: "fl", service: "lock", kid: "Noé", ask: "1" });
  assert.equal(hass.calls.length, 4);
  delete globalThis.confirm;
});

test("a day is planned in Mealie: a note, a random recipe", async () => {
  const hass = makeHass();
  const el = await open("meals", hass);
  await click(el, { action: "meal", day: "2026-11-28", type: "dinner" });
  assert.match(el.shadowRoot.innerHTML, /Plan Saturday · dinner/);
  el._mealEdit.q = "Pancakes";
  await click(el, { action: "meal-note" });
  assert.deepEqual(hass.calls[0], ["mealie", "set_mealplan", { config_entry_id: "mealie_entry", date: "2026-11-28", entry_type: "dinner", note_title: "Pancakes" }]);
  await click(el, { action: "meal", day: "2026-11-29", type: "lunch" });
  await click(el, { action: "meal-random" });
  assert.deepEqual(hass.calls[1], ["mealie", "set_random_mealplan", { config_entry_id: "mealie_entry", date: "2026-11-29", entry_type: "lunch" }]);
});
