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
      },
      family_link: {
        source: "family_link",
        entities: {
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
          absences: "sensor.pronote_noe_absences",
          delays: "sensor.pronote_noe_delays",
          information: "sensor.pronote_noe_information_and_surveys",
        },
      },
      family_link: {
        source: "family_link",
        entities: {
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
  settings: { admin_only: false, illustration_theme: "auto" },
};

export const states = Object.fromEntries(
  [
    st("sensor.ent_alex_homework", 2, {
      homework: [
        { book: "Reading", title: "Chapter 4", date: day(1) },
        { book: "Maths", title: "Times table of 7", date: day(4) },
      ],
    }),
    st("sensor.ent_alex_words_to_sign", 1),
    st("sensor.ent_alex_unread_messages", 0),
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
        { subject: "History", average: "17", out_of: "20" },
        { subject: "Maths", average: "15,5", out_of: "20" },
        { subject: "English", average: "14", out_of: "20" },
        { subject: "French", average: "13", out_of: "20" },
        { subject: "Science", average: "11,5", out_of: "20" },
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
    st("sensor.pronote_noe_absences", 0, { absences: [] }),
    st("sensor.pronote_noe_delays", 1, { delays: [{ date: day(-3) }] }),
    st("sensor.pronote_noe_information_and_surveys", 2, { information_and_surveys: [{ title: "Parents' meeting", read: false }, { title: "Trip", read: true }] }),
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
    st("person.noe", "home", { friendly_name: "Noé" }),
    st("person.parent_1", "home", { friendly_name: "Parent 1" }),
    st("person.parent_2", "not_home", { friendly_name: "Parent 2" }),
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
  "todo.shopping_list": [item("s1", "Buckwheat flour"), item("s2", "Eggs (12)"), item("s3", "Ham"), item("s4", "Grated cheese"), item("s5", "Butternut squash", true), item("s6", "Cream", true)],
  "todo.chores_alex": [item("a1", "Tidy the bedroom", true), item("a2", "Set the table", true), item("a3", "Feed the cat", true), item("a4", "Water the plants", true), item("a5", "Sort the laundry", false, day(2))],
  "todo.chores_noe": [item("n1", "Empty the dishwasher", true), item("n2", "Take the bins out", false, day(0)), item("n3", "Tidy the bedroom", true), item("n4", "Vacuum the stairs", true), item("n5", "Walk the dog", false, day(-1))],
  "todo.chores_adults": [item("p1", "Change the sheets", true), item("p2", "Clean the fridge", true), item("p3", "Descale the coffee maker", false, day(3)), item("p4", "Purifier filter", false, day(9))],
};

/** The calendar events of `id` between two ISO dates, as Home Assistant's REST API answers. */
export const eventsBetween = (id, from, to) => (events[id] || []).filter((e) => (e.start.dateTime || e.start.date) < to && (e.end.dateTime || e.end.date) > from.slice(0, 10));
