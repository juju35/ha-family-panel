// Mock data for the tests and the README screenshots: a family of two children (Alex, Noé), neutral names only.
// NOW is a fixed Thursday evening, so every capture shows the same day.
export const NOW = Date.parse("2026-11-26T17:40:00");
const day = (n, time = "") => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return time ? `${key}T${time}:00` : key;
};
const st = (entity_id, state, attributes = {}) => ({ entity_id, state: String(state), attributes, last_updated: "2026-11-26T16:00:00Z", last_changed: "2026-11-26T16:00:00Z" });

export const inventory = {
  children: [
    {
      id: "alex",
      name: "Alex",
      school: {
        source: "ent_one",
        entities: { homework: "sensor.ent_alex_homework", to_sign: "sensor.ent_alex_words_to_sign", messages: "sensor.ent_alex_unread_messages", calendar: "calendar.ent_alex_school" },
        books: { b_reading: "todo.ent_alex_reading", b_maths: "todo.ent_alex_maths" },
      },
      points: "sensor.alex_points",
      family_link: {
        source: "family_link",
        entities: {
          status: "sensor.alex_status",
          next_restriction: "sensor.alex_next_restriction",
          screen_time: "sensor.alex_screen_time",
          daily_limit: "sensor.alex_daily_limit",
          remaining_time: "sensor.alex_remaining_time",
          bedtime_start: "time.alex_bedtime_start",
          blocked_apps: "sensor.alex_blocked_apps",
          lock: "switch.alex_lock",
          add_bonus: "button.alex_add_bonus",
        },
      },
    },
    {
      id: "noe",
      name: "Noé",
      school: {
        source: "pronote",
        entities: {
          homework: "sensor.pronote_noe_homework",
          average: "sensor.pronote_noe_overall_average",
          averages: "sensor.pronote_noe_averages",
          lessons_tomorrow: "sensor.pronote_noe_lessons_tomorrow",
          lessons_today: "sensor.pronote_noe_lessons_today",
          grades: "sensor.pronote_noe_grades",
          punishments: "sensor.pronote_noe_punishments",
          menus: "sensor.pronote_noe_menus",
          current_period: "sensor.pronote_noe_current_period",
          absences: "sensor.pronote_noe_absences",
          delays: "sensor.pronote_noe_delays",
          information: "sensor.pronote_noe_information_and_surveys",
        },
        periods: { trimestre_1: { grades: "sensor.pronote_noe_grades_trimestre_1", averages: "sensor.pronote_noe_averages_trimestre_1", average: "sensor.pronote_noe_overall_average_trimestre_1" } },
      },
      points: null,
      family_link: {
        source: "family_link",
        entities: {
          status: "sensor.noe_status",
          next_restriction: "sensor.noe_next_restriction",
          screen_time: "sensor.noe_screen_time",
          daily_limit: "sensor.noe_daily_limit",
          remaining_time: "sensor.noe_remaining_time",
          bedtime_start: "time.noe_bedtime_start",
          blocked_apps: "sensor.noe_blocked_apps",
          lock: "switch.noe_lock",
          add_bonus: "button.noe_add_bonus",
        },
      },
    },
  ],
  calendars: ["calendar.activities", "calendar.family", "calendar.school_events"],
  shopping: ["todo.shopping_list"],
  chores: ["todo.chores_alex", "todo.chores_noe", "todo.chores_adults"],
  meals: ["calendar.mealie_lunch", "calendar.mealie_dinner"],
  waste: ["sensor.waste_recycling", "sensor.waste_general"],
  countdowns: ["sensor.christmas_holidays"],
  persons: ["person.alex", "person.noe", "person.parent_1", "person.parent_2"],
  saint: "sensor.saint_of_the_day",
  workday: "binary_sensor.workday_tomorrow",
  mealie: ["mealie_entry"],
  settings: { admin_only: false, illustration_theme: "auto" },
};

export const states = Object.fromEntries(
  [
    st("sensor.ent_alex_homework", 2, {
      homework: [
        { id: "h1", book_id: "b_reading", book: "Reading", title: "Chapter 4", date: day(1), done: false },
        { id: "h2", book_id: "b_maths", book: "Maths", title: "Times table of 7", date: day(4), done: false },
        { id: "h3", book_id: "b_maths", book: "Maths", title: "Count to 100", date: day(1), done: true },
      ],
    }),
    st("sensor.ent_alex_words_to_sign", 1, {
      words: [
        { id: "w1", child_id: "c-alex", child: "Alex", title: "School trip on the 4th", author: "Mrs Martin", date: `${day(-2)}T09:00:00`, signed: false },
        { id: "w0", child_id: "c-alex", child: "Alex", title: "Photo day", author: "Mrs Martin", date: `${day(-9)}T09:00:00`, signed: true },
      ],
    }),
    st("sensor.ent_alex_unread_messages", 0, { messages: [{ id: "m1", subject: "Library books", sender: "Mr Petit", date: `${day(-1)}T16:00:00`, unread: false }] }),
    st("sensor.pronote_noe_homework", 3, {
      homework: [
        { subject: "English", description: "Oral presentation", date: day(5), done: false },
        { subject: "Science", description: "Heart diagram", date: day(6), done: false },
        { subject: "Maths", description: "Exercises 4 to 7", date: day(1), done: false },
        { subject: "French", description: "Read chapter 3", date: day(1), done: true },
      ],
    }),
    st("sensor.pronote_noe_overall_average", "15.2"),
    st("sensor.pronote_noe_averages", 5, {
      averages: [
        { subject: "History", average: "17", class: "12,5", out_of: "20" },
        { subject: "Maths", average: "15,5", class: "12,8", out_of: "20" },
        { subject: "English", average: "14", class: "13,2", out_of: "20" },
        { subject: "French", average: "13", class: "12", out_of: "20" },
        { subject: "Science", average: "11,5", class: "13,4", out_of: "20" },
      ],
    }),
    st("sensor.pronote_noe_lessons_tomorrow", 6, {
      lessons: [
        { lesson: "Mathematics", classroom: "Room 12", start_at: day(1, "08:30"), end_at: day(1, "09:25") },
        { lesson: "French", classroom: "Room 4", start_at: day(1, "09:30"), end_at: day(1, "10:25") },
        { lesson: "English", classroom: "Room 21", start_at: day(1, "10:45"), end_at: day(1, "11:40") },
        { lesson: "Science", classroom: "Lab", start_at: day(1, "11:45"), end_at: day(1, "12:40") },
        { lesson: "History", classroom: "Room 8", start_at: day(1, "14:00"), end_at: day(1, "14:55"), canceled: true },
        { lesson: "Sports", classroom: "Gym", start_at: day(1, "15:30"), end_at: day(1, "16:25") },
      ],
    }),
    st("sensor.pronote_noe_absences", 2, {
      absences: [
        { from: `${day(-3)}T08:00:00`, to: `${day(-3)}T12:00:00`, justified: false, hours: "4h00", reasons: [] },
        { from: `${day(-14)}T08:00:00`, to: `${day(-14)}T17:00:00`, justified: true, hours: "8h00", reasons: ["Illness"] },
      ],
    }),
    st("sensor.pronote_noe_delays", 1, { delays: [{ date: `${day(-8)}T08:40:00`, minutes: 10, justified: false }] }),
    st("sensor.pronote_noe_punishments", 1, { punishments: [{ date: day(-17), nature: "Extra work", reasons: ["Homework not done"] }] }),
    st("sensor.pronote_noe_information_and_surveys", 2, {
      information_and_surveys: [
        { title: "Christmas show", author: "Head teacher", creation_date: `${day(-1)}T10:00:00`, read: false },
        { title: "Parents' meeting", author: "Mrs Durand", creation_date: `${day(-6)}T10:00:00`, read: true },
      ],
    }),
    st("sensor.pronote_noe_lessons_today", 6, {
      lessons: [
        { lesson: "Mathematics", classroom: "B12", start_at: day(0, "08:30"), end_at: day(0, "09:25") },
        { lesson: "English", classroom: "B04", start_at: day(0, "09:30"), end_at: day(0, "10:25") },
        { lesson: "Science", classroom: "Lab", start_at: day(0, "10:45"), end_at: day(0, "11:40"), canceled: true, status: "Teacher absent" },
        { lesson: "History", classroom: "C03", start_at: day(0, "11:45"), end_at: day(0, "12:40"), status: "Room changed" },
        { lesson: "Sports", classroom: "Gym", start_at: day(0, "14:00"), end_at: day(0, "15:55"), test: true },
        { lesson: "Music", classroom: "A02", start_at: day(0, "16:30"), end_at: day(0, "18:25") },
      ],
    }),
    st("sensor.pronote_noe_grades", 4, {
      grades: [
        { subject: "Maths", comment: "Fractions", date: day(-2), grade: "17", out_of: "20", class_average: "12,4", min: "6", max: "19", coefficient: "1" },
        { subject: "English", comment: "Vocabulary", date: day(-4), grade: "14", out_of: "20", class_average: "13", min: "8", max: "18", coefficient: "1" },
        { subject: "History", comment: "Quiz", date: day(-9), grade: "5", out_of: "10", class_average: "6,1", min: "2", max: "10", coefficient: "0,5" },
      ],
    }),
    st("sensor.pronote_noe_menus", 2, {
      menus: [{ date: day(1), is_lunch: true, first_meal: [{ name: "Leek soup" }], main_meal: [{ name: "Fish and rice" }], dessert: [{ name: "Apple tart" }] }],
    }),
    st("sensor.pronote_noe_current_period", "Term 2"),
    st("sensor.pronote_noe_grades_trimestre_1", 2, { grades: [{ subject: "Maths", date: day(-60), grade: "13", out_of: "20", class_average: "11" }] }),
    st("sensor.pronote_noe_averages_trimestre_1", 2, { averages: [{ subject: "Maths", average: "13", class: "11", out_of: "20" }] }),
    st("sensor.pronote_noe_overall_average_trimestre_1", "13.4"),
    st("sensor.alex_status", "tracked", {
      child_name: "Alex",
      week: [50, 75, 60, 90, 70, 40, 45].map((m, i) => ({ date: day(i - 6), minutes: m })),
      top_apps: [
        { title: "YouTube Kids", minutes: 22, limit: 30 },
        { title: "Minecraft", minutes: 14 },
        { title: "Duolingo", minutes: 9, always_allowed: true },
      ],
      devices: [{ id: "d1", name: "Phone", model: "Pixel 7a", locked: false, bonus: 0, bedtime: { start: day(0, "19:30"), end: day(1, "07:00"), active: false }, last_activity: day(0, "17:38") }],
      location: { place: "Home", battery: 34, device: "Phone" },
      school_mode: { active: false, pronote: false },
    }),
    st("sensor.alex_next_restriction", day(0, "19:30"), { kind: "bedtime" }),
    st("sensor.noe_status", "tracked", {
      child_name: "Noé",
      week: [80, 95, 70, 130, 100, 60, 70].map((m, i) => ({ date: day(i - 6), minutes: m })),
      top_apps: [
        { title: "WhatsApp", minutes: 28 },
        { title: "Spotify", minutes: 22, always_allowed: true },
        { title: "TikTok", minutes: 0, blocked: true },
      ],
      devices: [{ id: "d2", name: "Phone", model: "Pixel 8", locked: false, bonus: 15, bonus_remaining: 15, bedtime: { start: day(0, "21:30"), end: day(1, "07:00"), active: false }, last_activity: day(0, "17:39") }],
      location: { place: "Gym", battery: 71, device: "Phone" },
      school_mode: { active: true, pronote: true },
    }),
    st("sensor.noe_next_restriction", day(0, "21:30"), { kind: "bedtime" }),
    st("sensor.alex_screen_time", 45, { unit_of_measurement: "min" }),
    st("sensor.alex_daily_limit", 60, { unit_of_measurement: "min" }),
    st("sensor.alex_remaining_time", 15, { unit_of_measurement: "min" }),
    st("time.alex_bedtime_start", "19:30:00"),
    st("sensor.alex_blocked_apps", 1),
    st("switch.alex_lock", "off"),
    st("button.alex_add_bonus", "unknown"),
    st("sensor.noe_screen_time", 70, { unit_of_measurement: "min" }),
    st("sensor.noe_daily_limit", 120, { unit_of_measurement: "min" }),
    st("sensor.noe_remaining_time", 50, { unit_of_measurement: "min" }),
    st("time.noe_bedtime_start", "21:30:00"),
    st("sensor.noe_blocked_apps", 3),
    st("switch.noe_lock", "off"),
    st("button.noe_add_bonus", "unknown"),
    st("calendar.activities", "off", { friendly_name: "Activities" }),
    st("calendar.family", "off", { friendly_name: "Family" }),
    st("calendar.school_events", "off", { friendly_name: "School" }),
    st("calendar.mealie_lunch", "off", { friendly_name: "Mealie Lunch" }),
    st("calendar.mealie_dinner", "off", { friendly_name: "Mealie Dinner" }),
    st("todo.shopping_list", 4, { friendly_name: "Shopping list" }),
    st("todo.chores_alex", 1, { friendly_name: "Alex" }),
    st("todo.chores_noe", 2, { friendly_name: "Noé" }),
    st("todo.chores_adults", 2, { friendly_name: "Adults" }),
    st("sensor.waste_recycling", "1", { daysTo: 0, types: ["Recycling"], friendly_name: "Recycling" }),
    st("sensor.waste_general", "4", { daysTo: 4, types: ["General waste"], friendly_name: "General waste" }),
    st("sensor.christmas_holidays", day(23), { device_class: "date", friendly_name: "Christmas holidays" }),
    st("sensor.saint_of_the_day", "Catherine"),
    st("binary_sensor.workday_tomorrow", "on"),
    st("person.alex", "home", { friendly_name: "Alex" }),
    st("person.noe", "gym", { friendly_name: "Noé" }),
    st("person.parent_1", "home", { friendly_name: "Sam" }),
    st("person.parent_2", "not_home", { friendly_name: "Charlie" }),
    st("zone.gym", "1", { friendly_name: "Gym" }),
    st("sensor.home_parent_2_distance", "12.4", { unit_of_measurement: "km" }),
    st("sensor.home_parent_2_direction_of_travel", "towards"),
    st("sensor.alex_points", "85", { unit_of_measurement: "points" }),
  ].map((s) => [s.entity_id, s]),
);

const ev = (summary, start, end, location = "") => ({ summary, start: { dateTime: start }, end: { dateTime: end }, location });
export const events = {
  "calendar.activities": [
    ev("Judo · Alex", day(0, "18:00"), day(0, "19:00"), "Gym"),
    ev("Piano · Noé", day(-2, "17:30"), day(-2, "18:15")),
    ev("Swimming", day(-1, "14:00"), day(-1, "15:00")),
    ev("Football match", day(2, "15:00"), day(2, "16:30")),
  ],
  "calendar.family": [
    ev("Birthday party", day(1, "17:00"), day(1, "19:00"), "Bring the present"),
    ev("Family lunch", day(3, "12:30"), day(3, "15:00")),
    ev("Market", day(2, "10:00"), day(2, "11:00")),
  ],
  "calendar.school_events": [ev("Parents' meeting", day(0, "19:30"), day(0, "20:30"), "Video call"), ev("School canteen: fish", day(1, "12:00"), day(1, "13:00"))],
  "calendar.mealie_lunch": [
    ["Canteen · pasta", -3],
    ["Canteen · chicken", -2],
    ["Croque-monsieur", -1],
    ["Canteen · beef", 0],
    ["Canteen · fish", 1],
    ["Leftovers", 2],
    ["Roast and green beans", 3],
  ].map(([s, n]) => ({ summary: s, start: { date: day(n) }, end: { date: day(n + 1) } })),
  "calendar.mealie_dinner": [
    ["Vegetable soup", -3],
    ["Quiche", -2],
    ["Vegetable curry", -1],
    ["Squash gratin", 0],
    ["Savoury crêpes", 1],
  ].map(([s, n]) => ({ summary: s, start: { date: day(n) }, end: { date: day(n + 1) } })),
};

const item = (uid, summary, done = false, due = "") => ({ uid, summary, status: done ? "completed" : "needs_action", ...(due ? { due } : {}) });
export const todos = {
  // Shopping items carry their aisle in their description, as Mealie's labels or Bring's sections do
  "todo.shopping_list": [
    { ...item("s1", "Buckwheat flour"), description: "Grocery" },
    { ...item("s2", "Eggs (12)"), description: "Dairy" },
    { ...item("s3", "Ham"), description: "Grocery" },
    { ...item("s4", "Grated cheese"), description: "Dairy" },
    item("s5", "Butternut squash", true),
    item("s6", "Cream", true),
  ],
  "todo.chores_alex": [item("a1", "Tidy the bedroom +5", true), item("a2", "Set the table +3", true), item("a3", "Feed the cat +3", true), item("a4", "Water the plants +2", true), item("a5", "Sort the laundry +5", false, day(2))],
  "todo.chores_noe": [item("n1", "Empty the dishwasher +3", true), item("n2", "Take the bins out +3", false, day(0)), item("n3", "Tidy the bedroom +5", true), item("n4", "Vacuum the stairs +5", true), item("n5", "Walk the dog +4", false, day(-1))],
  "todo.chores_adults": [item("p1", "Change the sheets", true), item("p2", "Clean the fridge", true), item("p3", "Descale the coffee maker", false, day(3)), item("p4", "Purifier filter", false, day(9))],
};

/** The calendar events of `id` between two ISO dates, as Home Assistant's REST API answers. */
export const eventsBetween = (id, from, to) => (events[id] || []).filter((e) => (e.start.dateTime || e.start.date) < to && (e.end.dateTime || e.end.date) > from.slice(0, 10));

// Mealie's get_mealplan answer for this week (recipes with their times and servings, notes) and the services offered
const plan = (n, type, name, extra = {}) => ({ mealplan_id: `${type}${n}`, mealplan_date: day(n), entry_type: type, title: extra.recipe ? "" : name, recipe: extra.recipe ? { name, ...extra.recipe } : null });
export const mealplan = {
  mealplan: [
    plan(-3, "dinner", "Salad bowl", { recipe: { recipe_id: "r1", total_time: "20 min", recipe_yield: "4" } }),
    plan(-2, "dinner", "Lasagne", { recipe: { recipe_id: "r2", total_time: "1 h", recipe_yield: "6" } }),
    plan(-1, "dinner", "Vegetable soup"),
    plan(0, "lunch", "Canteen · beef"),
    plan(0, "dinner", "Squash gratin", { recipe: { recipe_id: "r3", total_time: "45 min", recipe_yield: "4" } }),
    plan(1, "lunch", "Canteen · fish"),
    plan(1, "dinner", "Savoury crêpes", { recipe: { recipe_id: "r4", total_time: "30 min", recipe_yield: "4" } }),
    plan(3, "dinner", "Roast and green beans", { recipe: { recipe_id: "r5", total_time: "1 h 30", recipe_yield: "6" } }),
  ],
};
export const services = {
  mealie: { get_mealplan: {}, get_recipes: {}, set_mealplan: {}, set_random_mealplan: {}, update_mealplan: {}, delete_mealplan: {} },
  family_link: { add_bonus: {}, revoke_bonus: {}, lock: {}, unlock: {}, ring: {}, refresh_location: {}, school_mode: {} },
  ent_one: { sign_word: {} },
};
/** The websocket answers of the mock Home Assistant. */
export const mockWS = (msg) => {
  if (msg.type === "todo/item/list") return { items: todos[msg.entity_id] || [] };
  if (msg.type === "family_panel/update_settings") return { settings: inventory.settings };
  if (msg.type === "call_service" && msg.service === "get_mealplan") return { response: mealplan };
  if (msg.type === "call_service" && msg.service === "get_recipes") return { response: { recipes: [{ recipe_id: "r6", name: "Pumpkin soup", total_time: "35" }] } };
  return inventory;
};
