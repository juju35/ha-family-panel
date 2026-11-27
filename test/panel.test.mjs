import assert from "node:assert/strict";
import { test } from "node:test";
import { events, inventory, NOW, states, todos } from "../scripts/mock-states.mjs";
import { defined, fp } from "./load.mjs";

const makeHass = (extra = {}) => ({
  states,
  locale: { language: "en", time_format: "24" },
  user: { is_admin: true },
  themes: { darkMode: false },
  calls: [],
  callWS: async (msg) => (msg.type === "todo/item/list" ? { items: todos[msg.entity_id] || [] } : inventory),
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
  assert.equal(fp.FAMILY_PANEL_VERSION, "1.0.0");
});

test("Today: the header, the children, tonight and the meals", async () => {
  const realNow = Date.now;
  Date.now = () => NOW;
  try {
    const html = (await open("today")).shadowRoot.innerHTML;
    assert.match(html, /4 to handle/);
    assert.match(html, /School tomorrow/);
    assert.match(html, /Recycling out tonight/);
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
    assert.match((await open("meals")).shadowRoot.innerHTML, /Buckwheat flour/);
    assert.match((await open("chores")).shadowRoot.innerHTML, /Walk the dog[\s\S]*overdue/);
    assert.match((await open("screens")).shadowRoot.innerHTML, /45 min \/ 1 h/);
    assert.match((await open("settings")).shadowRoot.innerHTML, /Parent 1/);
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

test("ticking an item calls the to-do service", async () => {
  const hass = makeHass();
  const el = await open("meals", hass);
  await el._onChange({ target: { dataset: { todo: "todo.shopping_list", uid: "s1" }, checked: true } });
  assert.deepEqual(hass.calls[0], ["todo", "update_item", { item: "s1", status: "completed" }, { entity_id: "todo.shopping_list" }]);
});
