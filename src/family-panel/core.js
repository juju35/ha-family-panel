/*
 * Family panel for Home Assistant
 * https://github.com/juju35/ha-family-panel
 *
 * A sidebar panel for the family, over the integrations it already has: school (Pronote, ENT ONE, Educartable,
 * Skolengo), calendars, meal plans (Mealie…), shopping lists and chores (to-do lists), screen time (Family Link),
 * waste collections and the saint of the day. It reads their states in the browser and acts through their services;
 * the integration's own command (family_panel/inventory) only says which entity is which.
 * The cards' illustrated header as its top bar (a house, the family, the garden), pill tabs under it:
 * Today, School, Agenda, Meals, Chores, Screens, Settings.
 * English is built in; the other languages are loaded on demand from /family_panel/i18n/<lang>.json.
 */

export const FAMILY_PANEL_VERSION = "1.0.0";
export const FP_TABS = ["today", "school", "agenda", "meals", "chores", "screens", "settings"];
export const FP_ACCENT = "#7c4ddb";
// One colour per calendar, in order, for the agenda and the timeline
export const FP_PALETTE = ["#7c4ddb", "#0e9aa7", "#1e8e5a", "#c77700", "#2f6fde", "#d93838"];

export const FP_EN = {
  title: "Family",
  tab_today: "Today",
  tab_school: "School",
  tab_agenda: "Agenda",
  tab_meals: "Meals",
  tab_chores: "Chores",
  tab_screens: "Screens",
  tab_settings: "Settings",
  refresh: "Refresh",
  to_handle: "{n} to handle",
  all_good: "All good",
  tomorrow_school: "School tomorrow",
  tomorrow_no_school: "No school tomorrow",
  tomorrow_unknown: "Tomorrow",
  tomorrow_detail: "{day} · first lesson {time}",
  waste_tonight: "{type} out tonight",
  saint: "Saint {name}",
  homework: "homework",
  to_sign: "to sign",
  messages: "messages",
  average: "average",
  tasks_done: "chores {done}/{total}",
  next_lessons: "Tomorrow",
  no_lessons: "No lessons",
  canceled: "Canceled",
  homework_list: "Homework",
  no_homework: "No homework due",
  grades: "Averages",
  no_grades: "No grades yet",
  school_life: "School life",
  absences: "Absences",
  delays: "Late arrivals",
  unread: "Unread messages",
  tonight_tomorrow: "Tonight and tomorrow",
  calendars_n: "{n} calendars",
  no_events: "Nothing planned",
  week_of: "Week of {date}",
  today: "Today",
  previous: "Previous week",
  next: "Next week",
  meals: "Meals",
  tonight: "Tonight",
  tomorrow: "Tomorrow",
  lunch: "Lunch",
  dinner: "Dinner",
  to_plan: "To plan",
  week_menu: "This week's meals",
  shopping: "Shopping list",
  items_n: "{n} items",
  add_item: "Add an item",
  no_meals: "No meal plan found",
  chores: "Chores of the week",
  done: "done",
  overdue: "overdue",
  due: "due {day}",
  no_chores: "No chores list found",
  screen_time: "Screen time",
  used_of: "{used} / {limit}",
  remaining: "{time} left",
  limit_reached: "Limit reached",
  bedtime: "Bedtime",
  blocked_apps: "Blocked apps",
  add_15: "+15 min",
  lock: "Lock",
  unlock: "Unlock",
  locked: "Locked",
  ring: "Ring",
  no_family_link: "Family Link is not set up",
  countdown: "{n} days",
  countdown_today: "Today",
  members: "Members",
  child: "child",
  adult: "adult",
  sources: "Sources",
  connected: "connected",
  not_found: "not found",
  found_n: "{n} found",
  appearance: "Appearance",
  illustration_theme: "Header picture",
  theme_auto: "Follows the theme",
  theme_day: "Always day",
  theme_night: "Always night",
  admin_only: "Administrators only",
  admin_only_hint: "Hide the panel from the other users",
  options_hint: "Calendars, meal plans, lists and countdowns are found by integration; pick them yourself in Settings → Devices & services → Family Panel → Configure.",
  school_source: "School",
  calendars: "Calendars",
  meal_plans: "Meal plans",
  shopping_lists: "Shopping lists",
  chore_lists: "Chores",
  waste: "Waste collections",
  countdowns: "Countdowns",
  family_link: "Family Link",
  saint_of_day: "Saint of the day",
  empty_family: "No child found yet: set up Pronote, ENT ONE, Educartable, Skolengo or Family Link.",
  failed: "Could not reach Home Assistant",
};

/** HTML-escaped text, for every value written into the panel. */
export const fpEsc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// The language strings, English until the user's language is loaded
let FP_STRINGS = FP_EN;
const FP_LOADED = new Map();
export const fpLang = (hass) => String(hass?.locale?.language || hass?.language || "en");
/** Loads the strings of the user's language (once), falling back on English for missing keys. */
export const fpLoadStrings = async (hass) => {
  const lang = fpLang(hass);
  const base = lang === "sr-Latn" ? lang : lang.split("-")[0];
  if (base === "en") return (FP_STRINGS = FP_EN);
  if (!FP_LOADED.has(base)) {
    FP_LOADED.set(
      base,
      fetch(`/family_panel/i18n/${base}.json?v=${FAMILY_PANEL_VERSION}`)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({})),
    );
  }
  FP_STRINGS = { ...FP_EN, ...(await FP_LOADED.get(base)) };
  return FP_STRINGS;
};
/** A string of the current language, its {placeholders} filled. */
export const fpT = (key, vars = {}) =>
  String(FP_STRINGS[key] ?? FP_EN[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// ── Dates ──
export const fpDayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
export const fpAddDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const fpStartOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
/** The day of a date-only string ("2026-11-28") or of a date-time, as a local day key. */
export const fpKeyOf = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  return Number.isNaN(t) ? "" : fpDayKey(t);
};
const fpHour12 = (hass) => {
  const f = hass?.locale?.time_format;
  if (f === "12") return true;
  if (f === "24") return false;
  return undefined;
};
export const fpTime = (hass, v) => {
  const t = typeof v === "number" ? v : Date.parse(v);
  if (Number.isNaN(t)) return "";
  const h12 = fpHour12(hass);
  return new Intl.DateTimeFormat(fpLang(hass), { hour: h12 ? "numeric" : "2-digit", minute: "2-digit", hour12: h12 }).format(t);
};
export const fpWeekday = (hass, v, style = "long") => new Intl.DateTimeFormat(fpLang(hass), { weekday: style }).format(new Date(v));
export const fpDate = (hass, v, opts = { day: "numeric", month: "long" }) => new Intl.DateTimeFormat(fpLang(hass), opts).format(new Date(v));
/** Minutes as "1 h 10" or "45 min". */
export const fpMinutes = (m) => {
  if (m === null || m === undefined || Number.isNaN(m)) return "—";
  const v = Math.max(0, Math.round(m));
  return v >= 60 ? `${Math.floor(v / 60)} h${v % 60 ? ` ${String(v % 60).padStart(2, "0")}` : ""}` : `${v} min`;
};

// ── States ──
export const FP_NO_VALUE = new Set(["unknown", "unavailable", "", undefined, null]);
export const fpState = (hass, id) => (id ? hass?.states?.[id] : undefined);
export const fpValid = (s) => !!s && !FP_NO_VALUE.has(s.state);
/** A number from a state ("15,2", "45 min", "1:10:00" as minutes), else null. */
export const fpNum = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  const hms = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (hms) return +hms[1] * 60 + +hms[2] + (hms[3] ? +hms[3] / 60 : 0);
  const n = Number.parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
/** Minutes of a duration state, read from its unit (h, min, s). */
export const fpDurationMin = (s) => {
  if (!fpValid(s)) return null;
  const n = fpNum(s.state);
  if (n === null) return null;
  const unit = String(s.attributes?.unit_of_measurement || "min").toLowerCase();
  if (unit.startsWith("h")) return n * 60;
  if (unit === "s") return n / 60;
  return n;
};
/** The list attribute of a state (Pronote's `homework`, `lessons`…), objects only. */
export const fpList = (s, attr) => (fpValid(s) && Array.isArray(s.attributes?.[attr]) ? s.attributes[attr].filter((x) => x && typeof x === "object") : []);
/** A homework-like item read the same way whatever the integration (Pronote, ENT ONE, Educartable, to-do item). */
export const fpItem = (x) => ({
  subject: x.subject || x.book || x.lesson || x.matiere || "",
  text: x.short_description || x.description || x.title || x.summary || x.text || "",
  day: fpKeyOf(x.date || x.due || x.due_date || x.for_date || x.start_at),
  done: x.done === true || x.status === "completed",
});
/** A number in the user's language (15.2 → "15,2" in French). */
export const fpFmtNum = (hass, v) => (v === null || v === undefined ? "—" : new Intl.NumberFormat(fpLang(hass), { maximumFractionDigits: 2 }).format(v));
export const fpInitial = (name) => (String(name || "?").trim()[0] || "?").toUpperCase();
