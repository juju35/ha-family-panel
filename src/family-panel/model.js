// ── What each tab shows, from the states (pure functions, tested in test/model.test.mjs) ──
import { fpAddDays, fpDayKey, fpDurationMin, fpItem, fpKeyOf, fpList, fpNum, fpState, fpValid } from "./core.js";

const count = (s) => (fpValid(s) ? fpNum(s.state) : null);
const sortByDay = (a, b) => a.day.localeCompare(b.day) || a.subject.localeCompare(b.subject);

/** A lesson of Pronote's timetable sensors. */
export const fpLesson = (l) => ({
  start: l.start_at || "",
  end: l.end_at || "",
  subject: l.lesson || l.subject || "",
  room: l.classroom || (Array.isArray(l.classrooms) ? l.classrooms.join(", ") : ""),
  canceled: l.canceled === true,
  status: l.canceled ? "" : l.status || "",
});

/** Everything the panel shows of a child: school values and Family Link. */
export const fpChild = (hass, child, now = Date.now()) => {
  const e = child.school?.entities || {};
  const s = (role) => fpState(hass, e[role]);
  const today = fpDayKey(now);
  const homework = [
    ...fpList(s("homework"), "homework"),
    ...fpList(s("homework_list"), "items"),
  ]
    .map(fpItem)
    .filter((h) => !h.done && (!h.day || h.day >= today))
    .sort(sortByDay);
  const info = fpList(s("information"), "information_and_surveys");
  const unreadInfo = info.filter((i) => i.read === false).length;
  const lessons = fpList(s("lessons_tomorrow"), "lessons").map(fpLesson).sort((a, b) => a.start.localeCompare(b.start));
  const toSign = (count(s("to_sign")) ?? 0) + (count(s("documents_to_sign")) ?? 0);
  const absences = fpList(s("absences"), "absences");
  const delays = fpList(s("delays"), "delays");
  const fl = child.family_link?.entities || {};
  const f = (role) => fpState(hass, fl[role]);
  const used = fpDurationMin(f("screen_time"));
  const limit = fpDurationMin(f("daily_limit"));
  return {
    id: child.id,
    name: child.name,
    source: child.school?.source || "",
    homeworkCount: count(s("homework")) ?? homework.length,
    homework,
    toSign: e.to_sign || e.documents_to_sign ? toSign : null,
    messages: e.messages ? (count(s("messages")) ?? 0) : e.information ? unreadInfo : null,
    average: count(s("average")),
    lessons,
    averages: fpList(s("averages"), "averages")
      .map((a) => ({ subject: a.subject || "", value: fpNum(a.average), outOf: fpNum(a.out_of) ?? 20 }))
      .filter((a) => a.value !== null),
    absences: e.absences ? (absences.length || count(s("absences")) || 0) : null,
    delays: e.delays ? (delays.length || count(s("delays")) || 0) : null,
    screen: child.family_link
      ? {
          used,
          limit,
          remaining: fpDurationMin(f("remaining_time")) ?? (used !== null && limit ? Math.max(0, limit - used) : null),
          reached: f("limit_reached")?.state === "on" || (used !== null && !!limit && used >= limit),
          locked: f("lock")?.state === "on",
          bedtime: fpValid(f("bedtime_start")) ? String(f("bedtime_start").state).slice(0, 5) : "",
          blocked: count(f("blocked_apps")),
          lockId: fl.lock || "",
          bonusId: fl.add_bonus || "",
          ringId: fl.ring || "",
        }
      : null,
  };
};

/** How many things wait for someone: words to sign, unread messages, homework due tomorrow and not done. */
export const fpAttention = (children, now = Date.now()) => {
  const tomorrow = fpDayKey(fpAddDays(now, 1));
  return children.reduce(
    (n, c) => n + (c.toSign || 0) + (c.messages || 0) + c.homework.filter((h) => h.day === tomorrow).length,
    0,
  );
};

/**
 * Is there school tomorrow? From the children's timetables first (a lesson not canceled), else from a Workday sensor
 * for tomorrow; null when nothing says.
 */
export const fpSchoolTomorrow = (hass, children, workday) => {
  const known = children.filter((c) => c.lessons.length);
  if (known.length) return { school: known.some((c) => c.lessons.some((l) => !l.canceled)), first: known.flatMap((c) => c.lessons).filter((l) => !l.canceled).map((l) => l.start).sort()[0] || "" };
  const w = fpState(hass, workday);
  if (fpValid(w) && /tomorrow|demain|morgen|mañana|domani/i.test(w.entity_id)) return { school: w.state === "on", first: "" };
  return null;
};

/** The next waste collection of each sensor (Waste Collection Schedule: `daysTo`, else a number of days or a date). */
export const fpWaste = (hass, ids, now = Date.now()) =>
  ids
    .map((id) => {
      const s = fpState(hass, id);
      if (!fpValid(s) || id.startsWith("calendar.")) return null;
      let days = fpNum(s.attributes?.daysTo);
      if (days === null && /^\d{4}-\d{2}-\d{2}/.test(s.state)) days = Math.round((Date.parse(fpKeyOf(s.state)) - Date.parse(fpDayKey(now))) / 864e5);
      if (days === null) days = fpNum(s.state);
      if (days === null || days < 0) return null;
      const types = Array.isArray(s.attributes?.types) ? s.attributes.types.join(", ") : "";
      return { id, type: types || s.attributes?.friendly_name || id, days };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

/** Days left before each countdown (a date or timestamp sensor, an input_datetime). */
export const fpCountdowns = (hass, ids, now = Date.now()) =>
  ids
    .map((id) => {
      const s = fpState(hass, id);
      if (!fpValid(s)) return null;
      const a = s.attributes || {};
      const iso = a.has_date && a.year ? `${a.year}-${String(a.month).padStart(2, "0")}-${String(a.day).padStart(2, "0")}` : s.state;
      const day = fpKeyOf(iso);
      if (!day) return null;
      const days = Math.round((Date.parse(day) - Date.parse(fpDayKey(now))) / 864e5);
      return days < 0 ? null : { id, name: a.friendly_name || id, day, days };
    })
    .filter(Boolean)
    .sort((a, b) => a.days - b.days);

/** Lunch or dinner of a meal-plan event: from its calendar (Mealie has one per meal type), else from its time. */
export const fpMealKind = (calendarId, ev) => {
  if (/lunch|dejeuner|déjeuner|mittag|almuerzo|pranzo/i.test(calendarId)) return "lunch";
  if (/breakfast|petit|fruhstuck|frühstück|desayuno|colazione/i.test(calendarId)) return "breakfast";
  if (/dinner|diner|dîner|abend|cena/i.test(calendarId)) return "dinner";
  const start = ev.start?.dateTime || ev.start;
  if (typeof start === "string" && start.includes("T")) return new Date(start).getHours() < 15 ? "lunch" : "dinner";
  return "dinner";
};

/** The week's meals by day: { "2026-11-27": { lunch, dinner } }. `events` is [calendarId, event][]. */
export const fpMealWeek = (events) => {
  const week = {};
  for (const [cal, ev] of events) {
    const kind = fpMealKind(cal, ev);
    if (kind === "breakfast") continue;
    const day = fpKeyOf(ev.start?.date || ev.start?.dateTime || ev.start);
    if (!day) continue;
    week[day] ??= {};
    week[day][kind] ??= ev.summary || "";
  }
  return week;
};

/** A calendar event as the timeline and the agenda show it. */
export const fpEvent = (cal, ev, index) => {
  const start = ev.start?.dateTime || ev.start?.date || ev.start || "";
  const allDay = !!(ev.start?.date || (typeof start === "string" && !start.includes("T")));
  return { cal, index, start, day: fpKeyOf(start), allDay, summary: ev.summary || "", where: ev.location || "" };
};

/** Done / total of to-do items (chores). */
export const fpProgress = (items) => {
  const total = items.length;
  const done = items.filter((i) => i.status === "completed").length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
};
