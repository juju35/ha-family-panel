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

test("the cards' extras: today's timetable, grades, words to sign, menus, Family Link", () => {
  const [alex, noe] = kids;
  assert.equal(noe.lessonsToday.find((l) => l.subject === "Science").canceled, true);
  assert.equal(noe.lessonsToday.find((l) => l.subject === "History").status, "Room changed");
  assert.deepEqual([noe.grades[0].value, noe.grades[0].classAvg, noe.grades[0].outOf], [17, 12.4, 20]);
  assert.equal(noe.averages.find((a) => a.subject === "Science").classAvg, 13.4);
  assert.deepEqual(noe.menu.foods, ["Leek soup", "Fish and rice", "Apple tart"]);
  assert.equal(noe.absenceList.filter((a) => !a.justified).length, 1);
  assert.deepEqual(alex.words.map((w) => w.id), ["w1"]);
  // ENT ONE's homework ticked through its notebook's to-do list
  assert.equal(alex.allHomework.find((h) => h.id === "h1").todo, "todo.ent_alex_reading");
  assert.equal(alex.screen.apps[0].title, "YouTube Kids");
  assert.equal(noe.screen.bonus, 15);
  assert.equal(noe.screen.schoolMode.active, true);
});

test("presence: zone, distance and direction; chores with their points", () => {
  const people = fp.fpPresence({ ...hass, entities: {} }, inventory.persons, NOW);
  const noe = people.find((p) => p.id === "person.noe");
  assert.deepEqual([noe.state, noe.zone], ["zone", "Gym"]);
  const charlie = people.find((p) => p.name === "Charlie");
  assert.deepEqual([charlie.state, charlie.distance.value, charlie.direction], ["away", 12.4, "towards"]);
  assert.deepEqual(fp.fpPoints("Make bed +5"), { name: "Make bed", points: 5 });
  assert.deepEqual(fp.fpPoints("Water"), { name: "Water", points: null });
  const chores = fp.fpChores([["todo.x", "Noé"]], { "todo.x": [{ uid: "1", summary: "Dog +4", status: "needs_action", due: "2026-11-25" }] }, NOW);
  assert.deepEqual([chores[0].name, chores[0].points, chores[0].overdue, chores[0].owner], ["Dog", 4, true, "Noé"]);
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
