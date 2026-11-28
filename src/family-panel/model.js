// ── What each tab shows, from the states (pure functions, tested in test/model.test.mjs) ──
import { fpAddDays, fpDayKey, fpDurationMin, fpItem, fpKeyOf, fpList, fpNum, fpState, fpValid } from "./core.js";

const count = (s) => (fpValid(s) ? fpNum(s.state) : null);
const sortByDay = (a, b) => a.day.localeCompare(b.day) || a.subject.localeCompare(b.subject);

/** A lesson of Pronote's timetable sensors: canceled, changed (Pronote's status), a test, an outing, a detention. */
export const fpLesson = (l) => ({
  start: l.start_at || "",
  end: l.end_at || "",
  subject: l.lesson || l.subject || "",
  room: l.classroom || (Array.isArray(l.classrooms) ? l.classrooms.join(", ") : ""),
  teacher: l.teacher_name || (Array.isArray(l.teacher_names) ? l.teacher_names.join(", ") : ""),
  canceled: l.canceled === true,
  status: l.status || "",
  test: l.test === true,
  outing: l.outing === true || l.is_outing === true,
  detention: l.detention === true || l.is_detention === true,
});
const fpLessons = (s) => fpList(s, "lessons").map(fpLesson).sort((a, b) => a.start.localeCompare(b.start));

/** A grade of Pronote's grades sensor, on its own scale, with the class average, min and max. */
export const fpGrade = (g) => ({
  subject: g.subject || "",
  comment: g.comment || "",
  day: fpKeyOf(g.date),
  value: fpNum(g.grade),
  raw: String(g.grade ?? ""),
  // A scale of 0 (a missing value read as 0) would divide by zero: out of 20 then
  outOf: fpNum(g.out_of) || 20,
  classAvg: fpNum(g.class_average),
  min: fpNum(g.min),
  max: fpNum(g.max),
  coef: fpNum(g.coefficient),
});
/** An average per subject, with the class's. */
export const fpAverage = (a) => ({ subject: a.subject || "", value: fpNum(a.average), outOf: fpNum(a.out_of) || 20, classAvg: fpNum(a.class), min: fpNum(a.min), max: fpNum(a.max) });
/** The canteen's next lunch (Pronote's menus): its courses, the foods of each. */
export const fpMenu = (s, now = Date.now()) => {
  const today = fpDayKey(now);
  const menus = fpList(s, "menus")
    .filter((m) => fpKeyOf(m.date) >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const m = menus.find((x) => x.is_lunch !== false) || menus[0];
  if (!m) return null;
  const foods = ["first_meal", "main_meal", "side_meal", "cheese", "dessert", "other_meal"].flatMap((k) => (Array.isArray(m[k]) ? m[k] : []).map((f) => (typeof f === "string" ? f : f?.name)).filter(Boolean));
  return foods.length ? { day: fpKeyOf(m.date), foods } : null;
};

/** Everything the panel shows of a child: school values and Family Link. */
export const fpChild = (hass, child, now = Date.now()) => {
  const e = child.school?.entities || {};
  const s = (role) => fpState(hass, e[role]);
  const today = fpDayKey(now);
  const books = child.school?.books || {};
  // Every homework still due (done ones kept, ticked), with the to-do list that marks it done (ENT ONE's notebooks)
  const allHomework = [...fpList(s("homework"), "homework"), ...fpList(s("homework_list"), "items")]
    .map((x) => ({ ...fpItem(x), id: String(x.id ?? x.uid ?? ""), todo: books[x.book_id] || "" }))
    .filter((h) => !h.day || h.day >= today)
    .sort(sortByDay);
  const homework = allHomework.filter((h) => !h.done);
  const info = fpList(s("information"), "information_and_surveys");
  const unreadInfo = info.filter((i) => i.read === false).length;
  const lessons = fpLessons(s("lessons_tomorrow"));
  const lessonsToday = fpLessons(s("lessons_today"));
  // The next school day's timetable: tomorrow's, else the next day's (after a weekend)
  const nextDay = lessons.length ? lessons : fpLessons(s("lessons_next_day"));
  const toSign = (count(s("to_sign")) ?? 0) + (count(s("documents_to_sign")) ?? 0);
  const absences = fpList(s("absences"), "absences");
  const delays = fpList(s("delays"), "delays");
  const status = f0(child, hass, "status");
  const sa = status?.attributes || {};
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
    lessonsToday,
    nextDay,
    allHomework,
    entities: e,
    periods: child.school?.periods || {},
    averages: fpList(s("averages"), "averages")
      .map(fpAverage)
      .filter((a) => a.value !== null),
    grades: fpList(s("grades"), "grades")
      .map(fpGrade)
      .sort((a, b) => b.day.localeCompare(a.day)),
    // ENT ONE's words still to sign (the liaison book), Pronote's school information and ENT ONE's messages
    words: fpList(s("to_sign"), "words")
      .filter((w) => !w.signed)
      .map((w) => ({ id: String(w.id ?? ""), child: String(w.child_id ?? ""), title: w.title || "", author: w.author || "", day: fpKeyOf(w.date) })),
    infos: [
      ...info.map((i) => ({ title: i.title || "", author: i.author || "", day: fpKeyOf(i.creation_date || i.start_date), unread: i.read === false, entity: e.information })),
      ...fpList(s("messages"), "messages").map((m) => ({ title: m.subject || "", author: m.sender || "", day: fpKeyOf(m.date), unread: m.unread === true, entity: e.messages })),
    ].sort((a, b) => Number(b.unread) - Number(a.unread) || b.day.localeCompare(a.day)),
    absenceList: absences.map((a) => ({ from: a.from || "", to: a.to || "", justified: a.justified === true, hours: a.hours || "", reason: Array.isArray(a.reasons) ? a.reasons.join(", ") : a.reason || a.reasons || "" })),
    delayList: delays.map((d) => ({ day: fpKeyOf(d.date), minutes: fpNum(d.minutes), justified: d.justified === true, reason: d.justification || (Array.isArray(d.reasons) ? d.reasons.join(", ") : d.reasons || "") })),
    punishments: fpList(s("punishments"), "punishments").map((p) => ({ day: fpKeyOf(p.date), nature: p.nature || "", reason: Array.isArray(p.reasons) ? p.reasons.join(", ") : p.reasons || "" })),
    menu: fpMenu(s("menus"), now),
    points: child.points || "",
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
          // The Family Link card's own data, on the child's status sensor
          name: sa.child_name || child.name,
          status: fpValid(status) ? status.state : "",
          week: Array.isArray(sa.week) ? sa.week : [],
          apps: Array.isArray(sa.top_apps) ? sa.top_apps : [],
          devices: Array.isArray(sa.devices) ? sa.devices : [],
          location: sa.location && typeof sa.location === "object" ? sa.location : null,
          schoolMode: sa.school_mode && typeof sa.school_mode === "object" ? sa.school_mode : null,
          bonus: (Array.isArray(sa.devices) ? sa.devices : []).reduce((n, d) => n + (fpNum(d?.bonus_remaining) ?? 0), 0),
          next: fpValid(f("next_restriction")) ? { at: f("next_restriction").state, kind: f("next_restriction").attributes?.kind || "" } : null,
        }
      : null,
  };
};

const f0 = (child, hass, role) => fpState(hass, child.family_link?.entities?.[role]);

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

/** Each person: where they are, since when, how far and which way (Proximity), the battery of their phone. */
export const fpPresence = (hass, ids, now = Date.now()) =>
  ids
    .map((id) => {
      const s = fpState(hass, id);
      if (!s) return null;
      const a = s.attributes || {};
      const slug = id.slice(7);
      const prox = (end) => Object.values(hass.states || {}).find((x) => x.entity_id.startsWith("sensor.") && x.entity_id.endsWith(`_${slug}_${end}`));
      const dist = prox("distance");
      const dir = prox("direction_of_travel");
      // The battery of the person's tracker: its attribute, else a battery sensor of the tracker's device
      const tracker = a.source;
      const dev = hass.entities?.[tracker]?.device_id;
      const batteryId = dev ? Object.keys(hass.entities || {}).find((x) => x.startsWith("sensor.") && hass.entities[x].device_id === dev && hass.states?.[x]?.attributes?.device_class === "battery") : null;
      const battery = fpNum(hass.states?.[tracker]?.attributes?.battery_level) ?? (batteryId ? fpNum(hass.states[batteryId].state) : null);
      const home = s.state === "home";
      const zone = home || s.state === "not_home" || !fpValid(s) ? "" : hass.states?.[`zone.${s.state}`]?.attributes?.friendly_name || s.state;
      return {
        id,
        name: a.friendly_name || slug,
        picture: a.entity_picture || "",
        state: home ? "home" : zone ? "zone" : fpValid(s) ? "away" : "unknown",
        zone,
        since: Date.parse(s.last_changed) || null,
        minutes: Date.parse(s.last_changed) ? Math.max(0, Math.round((now - Date.parse(s.last_changed)) / 60000)) : null,
        distance: !home && fpValid(dist) ? { value: fpNum(dist.state), unit: dist.attributes?.unit_of_measurement || "km" } : null,
        direction: !home && fpValid(dir) ? dir.state : "",
        battery,
      };
    })
    .filter(Boolean);

/** "Make bed +5": a chore's name and its points. */
export const fpPoints = (text) => {
  const m = /(?:^|\s)\+(\d{1,4})(?:\s*(?:pts?|points?))?\s*$/i.exec(String(text ?? ""));
  return m ? { name: String(text).slice(0, m.index).trim(), points: Number(m[1]) } : { name: String(text ?? "").trim(), points: null };
};

/**
 * The chores of the lists, each with its person (the list's name: a child's or anyone's), its points (`+N`), overdue
 * or not. `lists` is [entity, name][]; `items` the to-do items per list.
 */
export const fpChores = (lists, items, now = Date.now()) => {
  const today = fpDayKey(now);
  return lists.flatMap(([id, owner]) =>
    (items[id] || []).map((x) => {
      const p = fpPoints(x.summary);
      const due = fpKeyOf(x.due);
      const done = x.status === "completed";
      return { list: id, uid: x.uid, owner, name: p.name, points: p.points, due, done, overdue: !done && !!due && due < today };
    }),
  );
};

/** The days since a chore was due, as "since yesterday" / "since Monday" text keys. */
export const fpLate = (due, now = Date.now()) => Math.max(1, Math.round((Date.parse(fpDayKey(now)) - Date.parse(due)) / 864e5));
