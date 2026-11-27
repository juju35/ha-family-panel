import assert from "node:assert/strict";
import { test } from "node:test";
import { inventory, NOW, states } from "../scripts/mock-states.mjs";
import { fp } from "./load.mjs";

const hass = { states, locale: { language: "en" } };
const kids = inventory.children.map((c) => fp.fpChild(hass, c, NOW));

test("a child's school values come from its roles, whatever the integration", () => {
  const [alex, noe] = kids;
  assert.equal(alex.homeworkCount, 2);
  assert.equal(alex.toSign, 1);
  assert.equal(alex.messages, 0);
  assert.equal(alex.average, null);
  assert.equal(noe.average, 15.2);
  // Pronote's unread information, done homework left out, sorted by day
  assert.equal(noe.messages, 1);
  assert.deepEqual(
    noe.homework.map((h) => h.subject),
    ["Maths", "English", "Science"],
  );
  assert.equal(noe.lessons.length, 6);
  assert.equal(noe.lessons.filter((l) => l.canceled).length, 1);
  assert.equal(noe.averages[1].value, 15.5);
  assert.equal(noe.delays, 1);
});

test("Family Link: screen time, limit and what is left", () => {
  const s = kids[0].screen;
  assert.equal(s.used, 45);
  assert.equal(s.limit, 60);
  assert.equal(s.remaining, 15);
  assert.equal(s.reached, false);
  assert.equal(s.bedtime, "19:30");
  assert.equal(s.lockId, "switch.alex_lock");
});

test("what waits for someone: to sign, unread, homework due tomorrow", () => {
  // Alex: 1 to sign + Reading due tomorrow; Noé: 1 unread + Maths due tomorrow
  assert.equal(fp.fpAttention(kids, NOW), 4);
});

test("school tomorrow from the timetables, else from a Workday sensor for tomorrow", () => {
  const t = fp.fpSchoolTomorrow(hass, kids, inventory.workday);
  assert.equal(t.school, true);
  assert.match(t.first, /T08:30/);
  const none = fp.fpSchoolTomorrow(hass, [kids[0]], inventory.workday);
  assert.equal(none.school, true);
  assert.equal(fp.fpSchoolTomorrow(hass, [kids[0]], null), null);
});

test("waste collections and countdowns", () => {
  const waste = fp.fpWaste(hass, inventory.waste, NOW);
  assert.deepEqual(
    waste.map((w) => [w.type, w.days]),
    [
      ["Recycling", 0],
      ["General waste", 4],
    ],
  );
  const [c] = fp.fpCountdowns(hass, inventory.countdowns, NOW);
  assert.equal(c.days, 23);
});

test("meal plans by day and meal, chores progress", () => {
  const week = fp.fpMealWeek([
    ["calendar.mealie_dinner", { summary: "Soup", start: { date: "2026-11-26" } }],
    ["calendar.mealie_lunch", { summary: "Pasta", start: { date: "2026-11-26" } }],
    ["calendar.meals", { summary: "Pizza", start: { dateTime: "2026-11-27T19:30:00" } }],
    ["calendar.mealie_breakfast", { summary: "Toast", start: { date: "2026-11-27" } }],
  ]);
  assert.deepEqual(week["2026-11-26"], { dinner: "Soup", lunch: "Pasta" });
  assert.deepEqual(week["2026-11-27"], { dinner: "Pizza" });
  assert.deepEqual(fp.fpProgress([{ status: "completed" }, { status: "needs_action" }]), { done: 1, total: 2, pct: 50 });
});

test("values are escaped and numbers read in any format", () => {
  assert.equal(fp.fpEsc('<b a="x">&'), "&lt;b a=&quot;x&quot;&gt;&amp;");
  assert.equal(fp.fpNum("15,5"), 15.5);
  assert.equal(fp.fpNum("1:10:00"), 70);
  assert.equal(fp.fpNum("unknown"), null);
  assert.equal(fp.fpMinutes(70), "1 h 10");
  assert.equal(fp.fpMinutes(45), "45 min");
});

test("the night picture is drawn when asked", () => {
  assert.match(fp.fpSceneSvg(true), /#3f3770/);
  assert.doesNotMatch(fp.fpSceneSvg(false), /#3f3770/);
});
