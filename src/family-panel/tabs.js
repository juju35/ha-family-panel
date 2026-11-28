// ── The tabs at the level of the cards (Pronote, ENT ONE, Family Link, meals, chores, presence, countdowns) ──
// Added to the panel's class: Today (tomorrow per child, who is home, one list of what to handle with its action),
// School (timetable, homework to tick, words to sign, grades and periods, school life, canteen, news), Meals (tonight,
// the week as plates, planning a day in Mealie, the shopping list by aisle), Chores (a filter per person, overdue first,
// points) and Screens (Family Link: week, apps, devices, rules, bonus, lock, ring). Every value from a state goes through
// fpEsc; the actions call the integrations' own services.
import { FP_PALETTE, fpAddDays, fpDate, fpDayKey, fpEsc, fpFmtNum, fpInitial, fpKeyOf, fpMinutes, fpNum, fpStartOfDay, fpState, fpT, fpTime, fpValid, fpWeekday } from "./core.js";
import { fpAverage, fpChores, fpCountdowns, fpGrade, fpLate, fpMealWeek, fpPresence, fpWaste } from "./model.js";
import { FP_CALENDAR_PIC, FP_SCHOOL_PIC, FP_SOURCES, FamilyPanel, fpIcon } from "./panel.js";

// Avatars: a colour per person, never the panel's violet accent twice in a row
const FP_COLORS = ["#2f6fde", "#d9785f", "#7c4ddb", "#1e8e5a", "#0e9aa7", "#c77700"];
const FP_BIRTHDAY = /birthday|anniv|geburtstag|cumple|compleanno|verjaardag|urodzin|рожден|narozenin|születés/i;
// Plates: a dish colour picked from its name, so the same dish keeps its plate
const FP_DISH = ["#e9a85a", "#8cc06a", "#d9785f", "#c9a24a", "#7fb6c9", "#b98ad9"];
const fpDishColor = (name) => FP_DISH[[...String(name)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7) % FP_DISH.length];
// Mealie's meal types, the panel's slots
const FP_SLOTS = ["lunch", "dinner"];

/** An avatar: the person's picture, else their initial on their colour. */
const fpAvatar = (name, color, picture = "", size = 34) =>
  picture
    ? `<img class="av" src="${fpEsc(picture)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="av" style="width:${size}px;height:${size}px;background:${color}">${fpEsc(fpInitial(name))}</span>`;
/** A day of the week, short, or "today" / "tomorrow". */
const fpDayName = (hass, day, now, lower = false) => {
  const word = (key) => (lower ? fpT(key).toLowerCase() : fpT(key));
  if (day === fpDayKey(now)) return word("today");
  if (day === fpDayKey(fpAddDays(now, 1))) return word("tomorrow");
  return fpWeekday(hass, `${day}T12:00:00`);
};

FamilyPanel.STYLE += `
  .wide { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr); gap:14px; align-items:start; }
  .two { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px; align-items:start; }
  @container fp-main (max-width: 960px) { .wide { grid-template-columns:minmax(0,1fr) minmax(0,1fr); } }
  @container fp-main (max-width: 640px) { .wide, .two { grid-template-columns:minmax(0,1fr); } }
  .av { border-radius:50%; display:inline-grid; place-items:center; color:#fff; font-weight:700; font-size:13px; flex:none; object-fit:cover; }
  .item { display:flex; align-items:center; gap:10px; background:var(--fp-tile); border-radius:12px; padding:8px 12px; min-height:42px; font-size:13px; min-width:0; }
  .item + .item { margin-top:7px; }
  .item .grow { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; }
  .item .grow .small { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .item.bad { background:color-mix(in srgb, var(--fp-bad) 10%, var(--fp-tile)); }
  .item.warn { background:color-mix(in srgb, var(--fp-warn) 10%, var(--fp-tile)); }
  .item.warn, .item.bad { color:inherit; }
  .item.done .grow { color:var(--fp-muted); text-decoration:line-through; }
  .item .dot { width:9px; height:9px; }
  button.item { width:100%; border:0; font:inherit; color:inherit; text-align:left; cursor:pointer; }
  .sect { margin:14px 0 7px; font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--fp-muted); }
  .sect:first-child { margin-top:0; }
  .flow { display:flex; flex-wrap:wrap; gap:6px; }
  .tag { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; border-radius:999px; padding:4px 10px; white-space:nowrap;
         color:color-mix(in srgb, var(--c, var(--fp-accent)) 80%, var(--primary-text-color)); background:color-mix(in srgb, var(--c, var(--fp-accent)) 12%, transparent); }
  .tag.n { --c:var(--fp-muted); }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:8px; }
  .kpi { background:var(--fp-tile); border-radius:12px; padding:9px 12px; min-width:0; }
  .kpi b { display:block; font-size:21px; font-weight:800; letter-spacing:-.01em; }
  .kpi .small { display:block; }
  .tl { border-left:2px solid var(--fp-line); margin-left:4px; padding-left:12px; }
  .les { display:flex; gap:10px; padding:5px 0; align-items:baseline; font-size:13px; min-width:0; }
  .les .tm { width:64px; flex:none; white-space:nowrap; font-size:12px; color:var(--fp-muted); }
  .les .grow { min-width:0; }
  .les.past { opacity:.5; }
  .les.now b::before { content:""; display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--fp-good); margin-right:6px; box-shadow:0 0 0 4px color-mix(in srgb, var(--fp-good) 25%, transparent); animation:fp-pulse 1.6s ease-in-out infinite; }
  @keyframes fp-pulse { 50% { box-shadow:0 0 0 7px color-mix(in srgb, var(--fp-good) 5%, transparent); } }
  @media (prefers-reduced-motion: reduce) { .les.now b::before { animation:none; } }
  .les.cx b { text-decoration:line-through; color:var(--fp-bad); }
  .les.ch b { color:var(--fp-warn); }
  .chk { width:20px; height:20px; border-radius:50%; border:2px solid color-mix(in srgb, var(--primary-text-color) 30%, transparent); flex:none; background:transparent; padding:0; cursor:pointer; position:relative; }
  .chk.on { background:var(--fp-good); border-color:var(--fp-good); }
  .chk.on::after { content:""; position:absolute; left:5px; top:1px; width:5px; height:10px; border:solid #fff; border-width:0 2px 2px 0; transform:rotate(45deg); }
  .chk[disabled] { cursor:default; }
  .tg { width:38px; height:22px; border-radius:11px; flex:none; border:0; padding:0; cursor:pointer; position:relative; background:color-mix(in srgb, var(--primary-text-color) 18%, transparent); }
  .tg::after { content:""; position:absolute; left:3px; top:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:left .15s; }
  .tg.on { background:var(--fp-good); } .tg.on::after { left:19px; }
  .marker { position:relative; }
  .marker .mk { position:absolute; top:-3px; width:2px; height:14px; border-radius:1px; background:var(--primary-text-color); opacity:.55; }
  .grade { font-weight:800; white-space:nowrap; } .grade small { font-weight:600; color:var(--fp-muted); }
  .ok { color:var(--fp-good); } .warn { color:var(--fp-warn); } .badc { color:var(--fp-bad); } .acc { color:color-mix(in srgb, var(--fp-accent) 80%, var(--primary-text-color)); }
  .hero2 { display:flex; align-items:center; gap:16px; }
  .hero2 .t { flex:1; min-width:0; }
  .hero2 .big { font-size:22px; font-weight:800; letter-spacing:-.01em; }
  .kids { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; margin-top:12px; }
  .weekbars { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:6px; align-items:end; height:76px; }
  .weekbars i { display:block; border-radius:5px 5px 2px 2px; background:color-mix(in srgb, var(--fp-accent) 28%, transparent); min-height:3px; }
  .weekbars i.hi { background:var(--fp-warn); } .weekbars i.now { background:var(--fp-accent); }
  .weekdays { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:6px; text-align:center; font-size:11px; color:var(--fp-muted); margin-top:4px; }
  .plates { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:8px; text-align:center; }
  .plate { all:unset; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; min-width:0; font-size:12px; border-radius:12px; padding:4px 2px; }
  .plate:hover { background:var(--fp-tile); } .plate:focus-visible { outline:2px solid var(--fp-accent); }
  .plate.past { opacity:.45; }
  .plate .dish { width:52px; height:52px; border-radius:50%; background:radial-gradient(circle, var(--d) 0 30%, var(--fp-card) 31% 46%, #f0e9df 47% 62%, #e2d6c6 63%); }
  .night-ui .plate .dish { background:radial-gradient(circle, var(--d) 0 30%, #2b2f38 31% 46%, #4a4237 47% 62%, #3a342c 63%); }
  .plate .dish.none { background:none; border:2px dashed var(--fp-line); }
  .plate.today .dish { box-shadow:0 0 0 3px var(--fp-accent); }
  .plate .nm { width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--fp-muted); }
  .bigdish { width:92px; height:92px; flex:none; border-radius:50%; background:radial-gradient(circle, var(--d) 0 30%, var(--fp-card) 31% 46%, #f0e9df 47% 62%, #e2d6c6 63%); }
  .night-ui .bigdish { background:radial-gradient(circle, var(--d) 0 30%, #2b2f38 31% 46%, #4a4237 47% 62%, #3a342c 63%); }
  .editor { margin-top:14px; border-top:1px dashed var(--fp-line); padding-top:12px; }
  .editor .add { margin-top:8px; }
  .lateCard { background:color-mix(in srgb, var(--fp-bad) 7%, var(--fp-card)); }
  @container fp-main (max-width: 640px) { .plates { grid-template-columns:repeat(4, minmax(0,1fr)); } }
`;

Object.assign(FamilyPanel.prototype, {
  // ── Shared ──

  /** A child's or a person's colour, in the order of the family. */
  _colorOf(name) {
    const names = [...(this._inv?.children || []).map((c) => c.name), ...(this._inv?.persons || []).map((id) => this._hass.states[id]?.attributes?.friendly_name || id)];
    const first = (n) => String(n).toLowerCase().split(" ")[0];
    const i = names.findIndex((n) => first(n) === first(name));
    // Someone the panel doesn't know (a shared list: "Adults") stays grey
    return i < 0 ? "#8a929c" : FP_COLORS[i % FP_COLORS.length];
  },
  _btn(label, attrs, cls = "") {
    return `<button class="btn${cls ? ` ${cls}` : ""}" ${attrs}>${fpEsc(label)}</button>`;
  },
  /** Does an integration offer this service (its version may be older)? */
  _has(domain, service) {
    return !!this._hass.services?.[domain]?.[service];
  },

  /** What waits for someone, the worst first, each with its action. */
  _handle(kids, now) {
    const out = [];
    const tomorrow = fpDayKey(fpAddDays(now, 1));
    for (const c of this._choreItems(now).filter((x) => x.overdue))
      out.push({ cls: "bad", who: c.owner, text: `${c.name} · ${this._since(c.due, now)}`, action: this._btn(fpT("done"), `data-action="todo" data-todo="${fpEsc(c.list)}" data-uid="${fpEsc(c.uid)}" data-done="1"`, "acc") });
    for (const k of kids) {
      for (const w of k.words)
        out.push({
          cls: "warn",
          who: k.name,
          text: fpT("word_to_sign", { title: w.title }),
          action: this._has("ent_one", "sign_word") && w.id ? this._btn(fpT("sign"), `data-action="sign" data-word="${fpEsc(w.id)}" data-kid="${fpEsc(w.child)}" data-name="${fpEsc(w.title)}"`, "acc") : "",
        });
      if (!k.words.length && k.toSign) out.push({ cls: "warn", who: k.name, text: fpT("to_sign_n", { n: k.toSign }), action: this._btn(fpT("open"), `data-action="more" data-entity="${fpEsc(k.entities.to_sign || k.entities.documents_to_sign || "")}"`) });
      for (const h of k.homework.filter((x) => x.day === tomorrow))
        out.push({
          cls: "warn",
          who: k.name,
          text: `${h.subject || "—"}${h.text ? ` · ${h.text}` : ""} · ${fpT("due_tomorrow")}`,
          action: h.todo && h.id ? this._btn(fpT("done"), `data-action="todo" data-todo="${fpEsc(h.todo)}" data-uid="${fpEsc(h.id)}" data-done="1"`, "acc") : "",
        });
      if (k.messages) out.push({ cls: "", who: k.name, text: fpT("unread_n", { n: k.messages }), action: this._btn(fpT("read"), `data-action="more" data-entity="${fpEsc(k.entities.messages || k.entities.information || "")}"`) });
      if (k.screen?.reached && !k.screen.locked) out.push({ cls: "warn", who: k.name, text: fpT("limit_reached"), action: this._bonusBtn(k, 15) });
    }
    const rank = { bad: 0, warn: 1, "": 2 };
    return out.sort((a, b) => rank[a.cls] - rank[b.cls]);
  },
  _since(due, now) {
    const n = fpLate(due, now);
    return n === 1 ? fpT("since_yesterday") : fpT("since_days", { n });
  },
  _bonusBtn(k, minutes) {
    const label = minutes >= 60 ? `+${minutes / 60} h` : `+${minutes} min`;
    if (this._has("family_link", "add_bonus")) return this._btn(label, `data-action="bonus" data-kid="${fpEsc(k.screen.name)}" data-minutes="${minutes}"`, "acc");
    return minutes === 15 && k.screen.bonusId ? this._btn(label, `data-action="press" data-entity="${fpEsc(k.screen.bonusId)}"`, "acc") : "";
  },

  // ── Today ──

  _today(kids, tomorrow, now) {
    const inv = this._inv;
    const tmr = fpAddDays(now, 1);
    const waste = fpWaste(this._hass, inv.waste, now).filter((w) => w.days <= 1);
    const saint = fpState(this._hass, inv.saint);
    const countdowns = fpCountdowns(this._hass, inv.countdowns, now);
    const birthdays = this._events
      .filter(([, ev]) => FP_BIRTHDAY.test(ev.summary || ""))
      .map(([, ev]) => ({ name: ev.summary, day: fpKeyOf(ev.start?.date || ev.start?.dateTime || ev.start) }))
      .filter((b) => b.day === fpDayKey(now) || b.day === fpDayKey(tmr));
    const chips = [
      ...waste.map((w) => `<span class="tag" style="--c:var(--fp-info)">${fpIcon("bin", 13)}${fpEsc(fpT(w.days ? "waste_tonight" : "waste_today", { type: w.type }))}</span>`),
      fpValid(saint) ? `<span class="tag">${fpIcon("sun", 13)}${fpEsc(fpT("saint", { name: saint.state }))}</span>` : "",
      ...birthdays.map((b) => `<span class="tag" style="--c:var(--fp-warn)">${fpEsc(`${b.name} · ${fpDayName(this._hass, b.day, now, true)}`)}</span>`),
    ].join("");
    const title = tomorrow ? (tomorrow.school ? (tomorrow.first ? fpT("school_at", { time: fpTime(this._hass, tomorrow.first) }) : fpT("tomorrow_school")) : fpT("tomorrow_no_school")) : fpT("tomorrow_unknown");
    const next = countdowns[0];
    const detail = [fpWeekday(this._hass, tmr), next ? `${next.name} · ${next.days ? fpT("in_days", { n: next.days }) : fpT("countdown_today")}` : ""].filter(Boolean).join(" · ");
    // One line per child: the first lesson of the next school day, the canceled ones
    const perKid = kids
      .filter((k) => k.nextDay.length)
      .map((k) => {
        const real = k.nextDay.filter((l) => !l.canceled);
        const first = real[0];
        const last = real[real.length - 1];
        const canceled = k.nextDay.filter((l) => l.canceled).map((l) => fpT("lesson_canceled", { subject: l.subject }));
        const line = [first ? `${fpTime(this._hass, first.start)} ${first.subject}` : fpT("no_lessons"), last && last !== first ? fpT("last_lesson", { time: fpTime(this._hass, last.end || last.start) }) : ""].filter(Boolean).join(" · ");
        return `<div class="item">${fpAvatar(k.name, this._colorOf(k.name))}<span class="grow"><b>${fpEsc(k.name)}</b><span class="small muted">${fpEsc(line)}${canceled.length ? ` · <span class="badc">${fpEsc(canceled.join(", "))}</span>` : ""}</span></span></div>`;
      })
      .join("");
    const hero = `<div class="card"><div class="hero2">${FP_SCHOOL_PIC}<div class="t"><div class="big">${fpEsc(title)}</div><div class="note">${fpEsc(detail)}</div>${chips ? `<div class="flow" style="margin-top:8px">${chips}</div>` : ""}</div></div>${perKid ? `<div class="kids">${perKid}</div>` : ""}</div>`;
    const todo = this._handle(kids, now);
    const handle = `<div class="card"><div class="h"><b>${fpEsc(fpT("to_handle_title"))}</b><span class="small muted">${todo.length || ""}</span></div>${
      todo.length
        ? todo.map((t) => `<div class="item ${t.cls}"><span class="dot" style="--c:${t.cls === "bad" ? "var(--fp-bad)" : t.cls === "warn" ? "var(--fp-warn)" : "var(--fp-accent)"}"></span><span class="grow"><b>${fpEsc(t.who)}</b> · ${fpEsc(t.text)}</span>${t.action}</div>`).join("")
        : `<div class="item"><span class="dot" style="--c:var(--fp-good)"></span><span class="grow">${fpEsc(fpT("nothing_to_handle"))}</span></div>`
    }</div>`;
    const kidsEmpty = kids.length ? "" : `<div class="card empty">${fpEsc(fpT("empty_family"))}</div>`;
    const coming = countdowns.length
      ? `<div class="card"><div class="h"><b>${fpEsc(fpT("coming_up"))}</b></div>${countdowns
          .slice(0, 4)
          .map((c) => `<button class="item" data-action="more" data-entity="${fpEsc(c.id)}"><span class="dot"></span><span class="grow"><b>${fpEsc(c.name)}</b><span class="small muted">${fpEsc(fpDate(this._hass, `${c.day}T12:00:00`, { weekday: "short", day: "numeric", month: "short" }))}</span></span><span class="tag${c.days > 1 ? " n" : ""}" style="${c.days <= 1 ? "--c:var(--fp-warn)" : ""}">${fpEsc(c.days === 0 ? fpT("countdown_today") : c.days === 1 ? fpT("tomorrow") : fpT("countdown", { n: c.days }))}</span></button>`)
          .join("")}</div>`
      : "";
    return `<div class="grid2"><div class="col">${hero}${kidsEmpty}${handle}${this._timeline(now)}</div><div class="col">${this._presenceCard(now)}${this._tonightCard(now)}${coming}</div></div>`;
  },

  /** Who is home: each person, where and since when, how far and which way, the battery of their phone. */
  _presenceCard(now) {
    const people = fpPresence(this._hass, this._inv.persons, now);
    if (!people.length) return "";
    const home = people.filter((p) => p.state === "home").length;
    const rows = people
      .map((p) => {
        const since = p.minutes === null ? "" : fpT("for_time", { time: fpMinutes(p.minutes) });
        const where = p.state === "home" ? fpT("at_home") : p.state === "zone" ? p.zone : p.state === "away" ? fpT("away") : fpT("unknown");
        const extra = [
          p.distance?.value !== null && p.distance ? `${fpFmtNum(this._hass, Math.round(p.distance.value * 10) / 10)} ${p.distance.unit}` : "",
          p.direction === "towards" ? fpT("arriving") : p.direction === "away_from" ? fpT("leaving") : "",
          p.battery !== null ? fpT("phone_battery", { n: Math.round(p.battery) }) : "",
        ].filter(Boolean);
        const tag = p.state === "home" ? `<span class="tag" style="--c:var(--fp-good)">${fpEsc(fpT("home"))}</span>` : `<span class="tag n">${fpEsc(where)}</span>`;
        return `<button class="item" data-action="more" data-entity="${fpEsc(p.id)}">${fpAvatar(p.name, this._colorOf(p.name), p.picture)}<span class="grow"><b>${fpEsc(p.name)}</b><span class="small muted">${fpEsc([p.state === "home" ? since : `${where}${since ? ` · ${since}` : ""}`, ...extra].filter(Boolean).join(" · "))}</span></span>${tag}</button>`;
      })
      .join("");
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("whos_home"))}</b><span class="small muted">${home} / ${people.length}</span></div>${rows}</div>`;
  },

  /** Tonight's dinner, its time and servings (Mealie), and tomorrow's. */
  _tonightCard(now) {
    if (!this._inv.meals.length && !this._inv.mealie?.length && !this._inv.shopping.length) return "";
    const plan = this._plan();
    const today = plan[fpDayKey(now)] || {};
    const tomorrow = plan[fpDayKey(fpAddDays(now, 1))] || {};
    const dinner = today.dinner;
    const toBuy = this._inv.shopping.reduce((n, id) => n + (this._todos[id] || []).filter((x) => x.status !== "completed").length, 0);
    const meta = dinner ? [dinner.time ? fpTime(this._hass, dinner.time) : "", dinner.servings ? fpT("servings", { n: dinner.servings }) : ""].filter(Boolean).join(" · ") : "";
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("tonight"))}</b><span class="small muted">${fpEsc(meta)}</span></div>
      <div class="hero2"><span class="bigdish" style="--d:${dinner ? fpDishColor(dinner.name) : "transparent"};width:64px;height:64px"></span><div class="t"><div class="big" style="font-size:19px">${fpEsc(dinner?.name || fpT("nothing_tonight"))}</div>
      <div class="small muted">${fpEsc([`${fpT("tomorrow")} · ${(tomorrow.dinner || tomorrow.lunch)?.name || fpT("to_plan")}`, this._inv.shopping.length ? fpT("to_buy_n", { n: toBuy }) : ""].filter(Boolean).join(" · "))}</div></div></div></div>`;
  },

  // ── School ──

  _school(kids) {
    const school = kids.filter((k) => k.source);
    if (!school.length) return `<div class="card empty">${fpEsc(fpT("empty_family"))}</div>`;
    const k = school.find((x) => x.id === this._child) || school[0];
    const now = Date.now();
    const picker =
      school.length > 1
        ? `<div class="picker">${school.map((x) => `<button class="chip${x.id === k.id ? " sel" : ""}" data-child="${fpEsc(x.id)}">${fpEsc(x.name)}${x.source ? ` · ${fpEsc(FP_SOURCES[x.source] || x.source)}` : ""}</button>`).join("")}</div>`
        : "";
    // The period shown: the current one, or a past one picked with the period chips
    const period = this._period && k.periods[this._period] ? k.periods[this._period] : null;
    const st = (id) => fpState(this._hass, id);
    const average = period ? fpNum(st(period.average)?.state) : k.average;
    const grades = period ? (Array.isArray(st(period.grades)?.attributes?.grades) ? st(period.grades).attributes.grades : []).map(fpGrade) : k.grades;
    const averages = period ? (Array.isArray(st(period.averages)?.attributes?.averages) ? st(period.averages).attributes.averages : []).map(fpAverage).filter((a) => a.value !== null) : k.averages;
    const weekAgo = fpDayKey(fpAddDays(now, -7));
    const tomorrow = fpDayKey(fpAddDays(now, 1));
    const unjustified = k.absenceList.filter((a) => !a.justified).length;
    const kpi = (label, value, sub = "", cls = "") => `<div class="kpi"><span class="small muted">${fpEsc(label)}</span><b>${fpEsc(value)}</b>${sub ? `<span class="small ${cls}">${fpEsc(sub)}</span>` : ""}</div>`;
    // Only the cards the child's integration feeds (ENT ONE has no timetable nor grades)
    const has = (...roles) => roles.some((r) => k.entities[r]);
    const keys = Object.keys(k.periods);
    const classAvg = averages.length && averages.every((a) => a.classAvg !== null) ? averages.reduce((n, a) => n + a.classAvg, 0) / averages.length : null;
    const kpis = [
      average !== null ? kpi(fpT("average"), fpFmtNum(this._hass, average), classAvg !== null ? fpT("class_avg", { v: fpFmtNum(this._hass, Math.round(classAvg * 10) / 10) }) : "", "muted") : "",
      kpi(fpT("homework_list"), String(k.homeworkCount ?? 0), k.homework.some((h) => h.day === tomorrow) ? fpT("due_tomorrow_n", { n: k.homework.filter((h) => h.day === tomorrow).length }) : "", "warn"),
      k.grades.length ? kpi(fpT("new_grades"), String(k.grades.filter((g) => g.day >= weekAgo).length), fpT("this_week"), "muted") : "",
      k.toSign !== null ? kpi(fpT("to_sign_title"), String(k.toSign), "", "") : "",
      k.absences !== null ? kpi(fpT("absences"), String(k.absences), unjustified ? fpT("not_justified_n", { n: unjustified }) : "", "badc") : "",
      k.delays !== null ? kpi(fpT("delays"), String(k.delays)) : "",
      k.messages !== null ? kpi(fpT("unread"), String(k.messages)) : "",
    ].join("");
    return `${picker}<div class="card" style="margin-bottom:14px"><div class="kpis">${kpis}</div></div>
      ${this._grid("wide", [has("lessons_today", "lessons_tomorrow", "lessons_next_day") ? this._timetable(k, now) : "", this._homeworkCard(k, now), has("grades", "averages", "average") || keys.length ? this._gradesCard(k, grades, averages) : ""])}
      ${this._grid("two", [has("absences", "delays", "punishments") ? this._lifeCard(k) : "", has("menus", "information", "messages") ? this._newsCard(k) : ""], "margin-top:14px")}`;
  },
  /** Cards side by side, as many columns as there are cards (up to the layout's). */
  _grid(cls, cards, style = "") {
    const shown = cards.filter(Boolean);
    if (!shown.length) return "";
    const layout = shown.length === 1 ? "" : shown.length === 2 && cls === "wide" ? "two" : cls;
    return `<div class="${layout}" style="${style}">${shown.join("")}</div>`;
  },
  /** Today's timetable and the next school day's: the lesson going on, canceled and changed lessons, tests. */
  _timetable(k, now) {
    const today = k.lessonsToday.filter((l) => fpKeyOf(l.start) === fpDayKey(now));
    const lesson = (l, live) => {
      const start = Date.parse(l.start);
      const end = Date.parse(l.end);
      const cls = l.canceled ? "cx" : l.status ? "ch" : live && start <= now && now < end ? "now" : live && end <= now ? "past" : "";
      const extra = [l.canceled ? l.status || fpT("canceled") : l.status, l.room, l.test ? fpT("test") : "", l.outing ? fpT("outing") : "", l.detention ? fpT("detention") : "", cls === "now" && end ? fpT("until", { time: fpTime(this._hass, l.end) }) : ""].filter(Boolean).join(" · ");
      return `<div class="les ${cls}"><span class="tm">${fpEsc(fpTime(this._hass, l.start))}</span><span class="grow"><b>${fpEsc(l.subject || "—")}</b> <span class="small muted">${fpEsc(extra)}</span></span></div>`;
    };
    const next = k.nextDay;
    const nextDay = next[0] ? fpKeyOf(next[0].start) : "";
    const blocks = [
      today.length ? `<div class="sect">${fpEsc(fpT("today"))}</div><div class="tl">${today.map((l) => lesson(l, true)).join("")}</div>` : "",
      next.length && nextDay !== fpDayKey(now) ? `<div class="sect">${fpEsc(fpDayName(this._hass, nextDay, now))}</div><div class="tl">${next.map((l) => lesson(l, false)).join("")}</div>` : "",
    ].join("");
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("timetable"))}</b></div>${blocks || `<div class="empty">${fpEsc(fpT("no_lessons"))}</div>`}</div>`;
  },
  /** Homework by due day, ticked through its to-do list (ENT ONE's notebooks), then the words to sign. */
  _homeworkCard(k, now) {
    const byDay = new Map();
    for (const h of k.allHomework.slice(0, 14)) {
      const key = h.day || "";
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(h);
    }
    const days = [...byDay.entries()]
      .map(
        ([day, items]) =>
          `<div class="sect">${fpEsc(day ? fpDayName(this._hass, day, now) : fpT("undated"))}</div>${items
            .map((h) => {
              const can = !!(h.todo && h.id);
              const chk = `<button class="chk${h.done ? " on" : ""}"${can ? ` data-action="todo" data-todo="${fpEsc(h.todo)}" data-uid="${fpEsc(h.id)}" data-done="${h.done ? "0" : "1"}"` : " disabled"} aria-label="${fpEsc(fpT(h.done ? "done" : "to_do"))}" aria-pressed="${h.done}"></button>`;
              return `<div class="item${h.done ? " done" : ""}">${chk}<span class="grow"><b>${fpEsc(h.subject || "—")}</b>${h.text ? ` · ${fpEsc(h.text)}` : ""}</span></div>`;
            })
            .join("")}`,
      )
      .join("");
    const words = k.words.length
      ? `<div class="sect">${fpEsc(fpT("liaison_book"))}</div>${k.words
          .map(
            (w) =>
              `<div class="item warn"><span class="grow"><b>${fpEsc(w.title || "—")}</b><span class="small muted">${fpEsc([w.author, w.day ? fpDate(this._hass, `${w.day}T12:00:00`, { day: "numeric", month: "short" }) : ""].filter(Boolean).join(" · "))}</span></span>${
                this._has("ent_one", "sign_word") && w.id ? this._btn(fpT("sign"), `data-action="sign" data-word="${fpEsc(w.id)}" data-kid="${fpEsc(w.child)}" data-name="${fpEsc(w.title)}"`, "acc") : ""
              }</div>`,
          )
          .join("")}`
      : "";
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("homework_list"))}</b><span class="small muted">${fpEsc(fpT("to_do_n", { n: k.homework.length }))}</span></div>${days || `<div class="empty">${fpEsc(fpT("no_homework"))}</div>`}${words}</div>`;
  },
  /** The latest grades with the class's average, min and max, the averages per subject with the class marker. */
  _gradesCard(k, grades, averages) {
    const keys = Object.keys(k.periods);
    const current = fpState(this._hass, k.entities.current_period);
    const chips = keys.length
      ? `<div class="flow">${[...keys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((key) => [key, key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())]), ["", fpValid(current) ? current.state : fpT("current_period")]]
          .map(([key, label]) => `<button class="chip${(this._period || "") === key ? " sel" : ""}" data-action="period" data-period="${fpEsc(key)}">${fpEsc(label)}</button>`)
          .join("")}</div>`
      : "";
    const n = (v) => fpFmtNum(this._hass, v);
    const latest = grades
      .slice(0, 5)
      .map((g) => {
        const pct = g.value !== null ? g.value / g.outOf : null;
        const cls = pct === null ? "" : pct >= 0.7 ? "ok" : pct < 0.5 ? "warn" : "";
        const sub = [g.classAvg !== null ? fpT("class_avg", { v: n(g.classAvg) }) : "", g.min !== null && g.max !== null ? `${n(g.min)} – ${n(g.max)}` : "", g.coef !== null && g.coef !== 1 ? fpT("coef", { v: n(g.coef) }) : ""].filter(Boolean).join(" · ");
        return `<div class="item"><span class="grow"><b>${fpEsc(g.subject || "—")}</b>${g.comment ? ` · ${fpEsc(g.comment)}` : ""}<span class="small muted">${fpEsc(sub)}</span></span><span class="grade ${cls}">${fpEsc(g.value === null ? g.raw : n(g.value))}<small> / ${fpEsc(n(g.outOf))}</small></span></div>`;
      })
      .join("");
    const avgs = averages
      .map((a) => {
        const pct = Math.max(0, Math.min(100, (a.value / a.outOf) * 100));
        const low = a.classAvg !== null && a.value < a.classAvg;
        const mark = a.classAvg !== null ? `<span class="mk" style="left:${Math.max(0, Math.min(100, (a.classAvg / a.outOf) * 100)).toFixed(1)}%"></span>` : "";
        return `<div class="avg"><span>${fpEsc(a.subject)}</span><b style="text-align:right" class="${low ? "warn" : ""}">${fpEsc(n(a.value))}</b><div class="bar marker" style="--c:var(--fp-accent);overflow:visible"><i style="width:${pct.toFixed(1)}%"></i>${mark}</div></div>`;
      })
      .join("");
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("grades_title"))}</b>${chips}</div>${latest}${avgs ? `<div class="sect">${fpEsc(fpT("grades"))}</div>${avgs}` : ""}${latest || avgs ? "" : `<div class="empty">${fpEsc(fpT("no_grades"))}</div>`}</div>`;
  },
  /** Absences justified or not, late arrivals, punishments. */
  _lifeCard(k) {
    const day = (v) => (v ? fpDate(this._hass, v.length === 10 ? `${v}T12:00:00` : v, { weekday: "short", day: "numeric", month: "short" }) : "");
    const rows = [
      ...k.absenceList.slice(0, 5).map((a) => `<div class="item${a.justified ? "" : " bad"}"><span class="grow"><b>${fpEsc(fpT("absence"))}</b> · ${fpEsc(day(a.from))}<span class="small muted">${fpEsc([a.hours, a.reason, fpT(a.justified ? "justified" : "not_justified")].filter(Boolean).join(" · "))}</span></span></div>`),
      ...k.delayList.slice(0, 4).map((d) => `<div class="item warn"><span class="grow"><b>${fpEsc(fpT("late"))}</b> · ${fpEsc(day(d.day))}<span class="small muted">${fpEsc([d.minutes !== null ? `${d.minutes} min` : "", d.reason, fpT(d.justified ? "justified" : "not_justified")].filter(Boolean).join(" · "))}</span></span></div>`),
      ...k.punishments.slice(0, 4).map((p) => `<div class="item"><span class="grow"><b>${fpEsc(p.nature || fpT("punishment"))}</b> · ${fpEsc(day(p.day))}<span class="small muted">${fpEsc(p.reason)}</span></span></div>`),
    ].join("");
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("school_life"))}</b></div>${rows || `<div class="empty">${fpEsc(fpT("nothing_to_report"))}</div>`}</div>`;
  },
  /** The canteen's next lunch and the school's news (unread first). */
  _newsCard(k) {
    const menu = k.menu ? `<button class="item" data-action="more" data-entity="${fpEsc(k.entities.menus || "")}"><span class="grow"><b>${fpEsc(fpT("canteen_lunch", { day: fpDayName(this._hass, k.menu.day, Date.now(), true) }))}</b><span class="small muted">${fpEsc(k.menu.foods.join(" · "))}</span></span></button>` : "";
    const infos = k.infos
      .slice(0, 6)
      .map((i) => `<button class="item" data-action="more" data-entity="${fpEsc(i.entity || "")}"><span class="dot" style="--c:${i.unread ? "var(--fp-accent)" : "var(--fp-line)"}"></span><span class="grow"><b class="${i.unread ? "acc" : ""}">${fpEsc(i.title || "—")}</b><span class="small muted">${fpEsc([i.author, i.day ? fpDate(this._hass, `${i.day}T12:00:00`, { day: "numeric", month: "short" }) : "", i.unread ? fpT("unread_one") : ""].filter(Boolean).join(" · "))}</span></span></button>`)
      .join("");
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("canteen_news"))}</b></div>${menu}${infos}${menu || infos ? "" : `<div class="empty">${fpEsc(fpT("nothing_to_report"))}</div>`}</div>`;
  },

  // ── Meals ──

  /** The week's plan by day: Mealie's (time, servings, entry id) when read, else the meal-plan calendars. */
  _plan() {
    if (this._mealie?.length) {
      const week = {};
      for (const m of this._mealie) {
        week[m.day] ??= {};
        week[m.day][m.type] ??= m;
      }
      return week;
    }
    const raw = fpMealWeek(this._meals);
    return Object.fromEntries(Object.entries(raw).map(([day, v]) => [day, Object.fromEntries(Object.entries(v).map(([type, name]) => [type, { name, day, type }]))]));
  },
  _mealsTab(now) {
    const plan = this._plan();
    const today = fpDayKey(now);
    const can = this._inv.mealie?.length && this._has("mealie", "set_mealplan");
    const dinner = plan[today]?.dinner;
    const lunch = plan[today]?.lunch;
    const meta = dinner ? [dinner.time ? fpTime(this._hass, dinner.time) : "", dinner.servings ? fpT("servings", { n: dinner.servings }) : "", dinner.minutes ? fpMinutes(dinner.minutes) : ""].filter(Boolean).join(" · ") : "";
    const tonight =
      this._inv.meals.length || this._inv.mealie?.length
        ? `<div class="card"><div class="h"><b>${fpEsc(fpT("tonight"))}</b><span class="small muted">${this._inv.mealie?.length ? "Mealie" : ""}</span></div><div class="hero2"><span class="bigdish" style="--d:${dinner ? fpDishColor(dinner.name) : "transparent"}"></span><div class="t"><div class="big">${fpEsc(dinner?.name || fpT("nothing_tonight"))}</div><div class="note">${fpEsc(meta)}</div>${lunch ? `<div class="small muted" style="margin-top:4px">${fpEsc(`${fpT("lunch")} · ${lunch.name}`)}</div>` : ""}</div>${
            can ? this._btn(fpT(dinner ? "change" : "plan"), `data-action="meal" data-day="${today}" data-type="dinner"`, "acc") : ""
          }</div></div>`
        : `<div class="card empty">${fpEsc(fpT("no_meals"))}</div>`;
    // The week as plates, Monday first; a tap plans the day (Mealie)
    const monday = fpAddDays(fpStartOfDay(now), -((new Date(now).getDay() + 6) % 7));
    const plates = Array.from({ length: 7 }, (_, i) => {
      const d = fpDayKey(fpAddDays(monday, i));
      const m = plan[d] || {};
      const shown = m.dinner || m.lunch;
      const attrs = can ? `data-action="meal" data-day="${d}" data-type="${m.dinner || !m.lunch ? "dinner" : "lunch"}"` : 'tabindex="-1"';
      return `<button class="plate${d < today ? " past" : ""}${d === today ? " today" : ""}" ${attrs} title="${fpEsc([m.lunch ? `${fpT("lunch")}: ${m.lunch.name}` : "", m.dinner ? `${fpT("dinner")}: ${m.dinner.name}` : ""].filter(Boolean).join("\n"))}"><span class="dish${shown ? "" : " none"}" style="--d:${shown ? fpDishColor(shown.name) : "transparent"}"></span><b class="${d === today ? "acc" : ""}">${fpEsc(fpWeekday(this._hass, `${d}T12:00:00`, "short"))}</b><span class="nm">${fpEsc(shown?.name || fpT("to_plan"))}</span></button>`;
    }).join("");
    const week = `<div class="card"><div class="h"><b>${fpEsc(fpT("this_week"))}</b>${can ? `<span class="small muted">${fpEsc(fpT("tap_to_plan"))}</span>` : ""}</div><div class="plates">${plates}</div>${this._mealEditor(plan)}</div>`;
    const lists = this._inv.shopping.map((id) => this._shoppingCard(id)).join("");
    return `<div class="grid2"><div class="col">${tonight}${week}</div><div class="col">${lists || `<div class="card empty">${fpEsc(fpT("shopping"))} · ${fpEsc(fpT("not_found"))}</div>`}</div></div>`;
  },
  /** Planning a day in Mealie: lunch or dinner, a recipe searched, a note, a random recipe, or nothing. */
  _mealEditor(plan) {
    const e = this._mealEdit;
    if (!e) return "";
    const current = plan[e.day]?.[e.type];
    const recipes = (this._recipes || []).map((r) => `<button class="item" data-action="meal-recipe" data-id="${fpEsc(r.id)}"><span class="grow"><b>${fpEsc(r.name)}</b>${r.minutes ? `<span class="small muted">${fpEsc(fpMinutes(r.minutes))}</span>` : ""}</span></button>`).join("");
    return `<div class="editor"><div class="h"><b>${fpEsc(fpT("plan_day", { day: fpWeekday(this._hass, `${e.day}T12:00:00`), meal: fpT(e.type).toLowerCase() }))}</b><span class="flow">${FP_SLOTS.map((t) => `<button class="chip${t === e.type ? " sel" : ""}" data-action="meal-type" data-type="${t}">${fpEsc(fpT(t))}</button>`).join("")}</span></div>
      ${current ? `<div class="small muted" style="margin-bottom:6px">${fpEsc(fpT("planned", { name: current.name }))}</div>` : ""}
      <div class="add"><input data-mealq placeholder="${fpEsc(fpT("search_recipe"))}" aria-label="${fpEsc(fpT("search_recipe"))}" value="${fpEsc(e.q || "")}"><button class="btn" data-action="meal-search">${fpEsc(fpT("search"))}</button></div>
      ${recipes ? `<div style="margin-top:8px">${recipes}</div>` : ""}
      <div class="btns">${this._btn(fpT("save_note"), 'data-action="meal-note"', "acc")}${this._has("mealie", "set_random_mealplan") ? this._btn(fpT("random"), 'data-action="meal-random"') : ""}${current?.id && this._has("mealie", "delete_mealplan") ? this._btn(fpT("clear"), 'data-action="meal-clear"', "bad") : ""}${this._btn(fpT("cancel"), 'data-action="meal-cancel"')}</div></div>`;
  },
  /** The shopping list: what is left first, by aisle when the items carry one, then what was bought. */
  _shoppingCard(id) {
    const items = this._todos[id] || [];
    const name = this._hass.states[id]?.attributes?.friendly_name || fpT("shopping");
    const open = items.filter((x) => x.status !== "completed");
    const done = items.filter((x) => x.status === "completed");
    const label = (x) => String(x.description || "").trim();
    const words = open.map(label).filter((d) => d && d.length <= 20 && !/\d/.test(d));
    const aisles = words.some((d, i) => words.indexOf(d) !== i) && words.length >= open.length * 0.6;
    const row = (x) => `<div class="item${x.status === "completed" ? " done" : ""}"><button class="chk${x.status === "completed" ? " on" : ""}" data-action="todo" data-todo="${fpEsc(id)}" data-uid="${fpEsc(x.uid)}" data-done="${x.status === "completed" ? "0" : "1"}" aria-label="${fpEsc(x.summary)}" aria-pressed="${x.status === "completed"}"></button><span class="grow">${fpEsc(x.summary)}</span></div>`;
    let body = "";
    if (aisles) {
      const groups = new Map();
      for (const x of open) {
        const key = words.includes(label(x)) ? label(x) : "";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(x);
      }
      body = [...groups.entries()]
        .sort(([a], [b]) => (a ? (b ? a.localeCompare(b) : -1) : 1))
        .map(([key, xs]) => `<div class="sect">${fpEsc(key || fpT("other"))}</div>${xs.map(row).join("")}`)
        .join("");
    } else body = open.map(row).join("");
    if (done.length) body += `<div class="sect">${fpEsc(fpT("bought"))}</div>${done.slice(0, 6).map(row).join("")}`;
    return `<div class="card"><div class="h"><b>${fpEsc(name)}</b><span class="small muted">${fpEsc(fpT("to_buy_n", { n: open.length }))}</span></div>${body || `<div class="empty">${fpEsc(fpT("nothing_to_buy"))}</div>`}
      <div class="add"><input data-add="${fpEsc(id)}" placeholder="${fpEsc(fpT("add_item"))}" aria-label="${fpEsc(fpT("add_item"))}"><button class="btn" data-action="add" data-entity="${fpEsc(id)}" aria-label="${fpEsc(fpT("add_item"))}">${fpIcon("plus", 14)}</button></div></div>`;
  },

  // ── Chores ──

  /** The chores of every list, each with its person (the list's name). */
  _choreItems(now) {
    const lists = this._inv.chores.filter((id) => id.startsWith("todo.")).map((id) => [id, this._hass.states[id]?.attributes?.friendly_name || id.slice(5)]);
    return fpChores(lists, this._todos, now);
  },
  _choresTab() {
    const now = Date.now();
    const all = this._choreItems(now);
    if (!this._inv.chores.length) return `<div class="card empty">${fpEsc(fpT("no_chores"))}</div>`;
    const owners = [...new Set(all.map((c) => c.owner))];
    const filter = owners.includes(this._choreFilter) ? this._choreFilter : "";
    const shown = all.filter((c) => !filter || c.owner === filter);
    const count = (xs) => `${xs.filter((c) => c.done).length} / ${xs.length}`;
    const chips = `<div class="picker">${[["", fpT("all"), all], ...owners.map((o) => [o, o, all.filter((c) => c.owner === o)])]
      .map(([key, label, xs]) => `<button class="chip${filter === key ? " sel" : ""}" data-action="chores" data-owner="${fpEsc(key)}">${fpEsc(`${label} · ${count(xs)}`)}</button>`)
      .join("")}</div>`;
    const row = (c) =>
      `<div class="item${c.overdue ? " bad" : ""}${c.done ? " done" : ""}">${fpAvatar(c.owner, this._colorOf(c.owner))}<span class="grow">${fpEsc(c.name)}${c.overdue ? ` · <span class="badc">${fpEsc(this._since(c.due, now))}</span>` : c.due && !c.done && c.due > fpDayKey(now) ? `<span class="small muted">${fpEsc(fpT("due", { day: fpWeekday(this._hass, `${c.due}T12:00:00`, "short") }))}</span>` : ""}</span>${c.points ? `<span class="small muted">${fpEsc(fpT("pts", { n: c.points }))}</span>` : ""}<button class="chk${c.done ? " on" : ""}" data-action="todo" data-todo="${fpEsc(c.list)}" data-uid="${fpEsc(c.uid)}" data-done="${c.done ? "0" : "1"}" aria-label="${fpEsc(c.name)}" aria-pressed="${c.done}"></button></div>`;
    const late = shown.filter((c) => c.overdue);
    const open = shown.filter((c) => !c.overdue && !c.done);
    const done = shown.filter((c) => c.done);
    const lateCard = late.length ? `<div class="card lateCard"><div class="h"><b class="badc">${fpEsc(fpT("overdue_title"))}</b><span class="small badc">${late.length}</span></div>${late.map(row).join("")}</div>` : "";
    const list = `<div class="card"><div class="h"><b>${fpEsc(fpT("chores"))}</b><span class="small muted">${fpEsc(fpT("left_n", { n: open.length }))}</span></div>${[...open, ...done].map(row).join("") || `<div class="empty">${fpEsc(fpT("nothing_to_handle"))}</div>`}</div>`;
    return `${chips}<div class="grid2"><div class="col">${lateCard}${list}</div><div class="col">${this._pointsCard(all)}</div></div>`;
  },
  /** Each child's points: their points sensor, else the `+N` of the chores they ticked off, against what was on offer. */
  _pointsCard(all) {
    const kids = this._inv.children
      .map((c) => {
        const mine = all.filter((x) => x.owner.toLowerCase().split(" ")[0] === c.name.toLowerCase().split(" ")[0]);
        const sensor = fpState(this._hass, c.points);
        const earned = mine.filter((x) => x.done).reduce((n, x) => n + (x.points || 0), 0);
        const offered = mine.reduce((n, x) => n + (x.points || 0), 0);
        const total = fpValid(sensor) ? fpNum(sensor.state) : offered ? earned : null;
        return total === null ? null : { name: c.name, total, earned, offered, sensor: c.points };
      })
      .filter(Boolean);
    if (!kids.length) return "";
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("points"))}</b></div>${kids
      .map(
        (k) =>
          `<div class="item" style="display:block"><div style="display:flex;align-items:center;gap:10px">${fpAvatar(k.name, this._colorOf(k.name))}<b style="flex:1">${fpEsc(k.name)}</b><b class="acc">${fpEsc(fpT("pts", { n: fpFmtNum(this._hass, k.total) }))}</b></div>${
            k.offered ? `<div class="bar" style="margin:8px 0 4px;--c:${k.earned >= k.offered ? "var(--fp-good)" : "var(--fp-accent)"}"><i style="width:${Math.round((k.earned / k.offered) * 100)}%"></i></div><div class="small ${k.earned >= k.offered ? "ok" : "muted"}">${fpEsc(k.earned >= k.offered ? fpT("all_points") : fpT("points_left", { n: k.offered - k.earned }))}</div>` : ""
          }</div>`,
      )
      .join("")}</div>`;
  },

  // ── Screens ──

  _screensTab(kids) {
    const fl = kids.filter((k) => k.screen);
    if (!fl.length) return `<div class="card empty">${fpEsc(fpT("no_family_link"))}</div>`;
    return `<div class="two">${fl.map((k) => this._screenKid(k)).join("")}</div>`;
  },
  _screenKid(k) {
    const s = k.screen;
    const pct = s.limit ? Math.round((s.used / s.limit) * 100) : 0;
    const status = s.locked || s.status === "locked" ? ["locked", "var(--fp-bad)"] : s.reached ? ["limit_reached", "var(--fp-warn)"] : s.status === "attention" ? ["attention", "var(--fp-warn)"] : s.status === "not_tracked" ? ["not_tracked", "var(--fp-muted)"] : ["tracked", "var(--fp-good)"];
    const c = s.reached ? "var(--fp-warn)" : pct >= 70 ? "var(--fp-warn)" : "var(--fp-good)";
    const fl = this._has("family_link", "lock");
    // The week: one bar per day, today last, over the limit in orange
    const week = s.week.slice(-7);
    const top = Math.max(1, ...week.map((d) => fpNum(d.minutes) ?? 0), s.limit || 0);
    const bars = week.length
      ? `<div class="sect">${fpEsc(fpT("this_week"))}</div><div class="weekbars">${week.map((d, i) => `<i class="${i === week.length - 1 ? "now" : s.limit && d.minutes > s.limit ? "hi" : ""}" style="height:${Math.max(3, Math.round(((fpNum(d.minutes) ?? 0) / top) * 100))}%" title="${fpEsc(fpMinutes(d.minutes))}"></i>`).join("")}</div><div class="weekdays">${week.map((d) => `<span>${fpEsc(fpWeekday(this._hass, `${String(d.date).slice(0, 10)}T12:00:00`, "short"))}</span>`).join("")}</div>`
      : "";
    const apps = s.apps.length
      ? `<div class="sect">${fpEsc(fpT("top_apps"))}</div>${s.apps
          .slice(0, 4)
          .map((a) => {
            const rule = a.blocked ? `<span class="tag" style="--c:var(--fp-bad)">${fpEsc(fpT("blocked"))}</span>` : a.always_allowed ? `<span class="tag" style="--c:var(--fp-good)">${fpEsc(fpT("always_allowed"))}</span>` : a.limit ? `<span class="tag n">${fpEsc(fpT("app_limit", { time: fpMinutes(a.limit) }))}</span>` : "";
            return `<div class="item"><span class="grow"><b>${fpEsc(a.title || a.package || "—")}</b></span>${a.minutes ? `<span class="small muted">${fpEsc(fpMinutes(a.minutes))}</span>` : ""}${rule}</div>`;
          })
          .join("")}`
      : "";
    const loc = s.location;
    const devices = s.devices
      .map((d) => {
        const here = loc && (!loc.device || loc.device === d.name) ? [loc.place || loc.address || "", loc.battery !== null && loc.battery !== undefined ? `${Math.round(loc.battery)} %` : ""].filter(Boolean).join(" · ") : "";
        const seen = d.last_activity ? fpT("seen_ago", { time: fpMinutes((Date.now() - Date.parse(d.last_activity)) / 60000) }) : "";
        return `<div class="item"><span class="grow"><b>${fpEsc(d.name || "—")}</b>${d.model ? ` · ${fpEsc(d.model)}` : ""}<span class="small muted">${fpEsc([here, seen].filter(Boolean).join(" · "))}</span></span>${fl ? this._btn(fpT("locate"), `data-action="fl" data-service="refresh_location" data-kid="${fpEsc(s.name)}"`) : ""}</div>`;
      })
      .join("");
    const win = s.devices.find((d) => d.bedtime || d.schooltime);
    const range = (w) => (w?.start ? `${fpTime(this._hass, w.start)} – ${fpTime(this._hass, w.end)}` : "");
    const nextAt = s.next ? Date.parse(s.next.at) : NaN;
    const rules = [
      win?.bedtime || s.bedtime
        ? `<div class="item"><span class="grow"><b>${fpEsc(fpT("bedtime"))}</b> · ${fpEsc(range(win?.bedtime) || s.bedtime)}${Number.isFinite(nextAt) && nextAt > Date.now() ? `<span class="small muted">${fpEsc(fpT("next_restriction", { time: fpMinutes((nextAt - Date.now()) / 60000) }))}</span>` : ""}</span>${win?.bedtime?.active ? `<span class="tag" style="--c:var(--fp-accent)">${fpEsc(fpT("active"))}</span>` : ""}</div>`
        : "",
      win?.schooltime ? `<div class="item"><span class="grow"><b>${fpEsc(fpT("school_time"))}</b> · ${fpEsc(range(win.schooltime))}</span>${win.schooltime.active ? `<span class="tag" style="--c:var(--fp-accent)">${fpEsc(fpT("active"))}</span>` : ""}</div>` : "",
      s.schoolMode && this._has("family_link", "school_mode")
        ? `<div class="item"><span class="grow"><b>${fpEsc(fpT("school_mode"))}</b><span class="small muted">${fpEsc(s.schoolMode.pronote ? fpT("school_mode_pronote") : fpT("school_mode_hint"))}</span></span><button class="tg${s.schoolMode.active ? " on" : ""}" role="switch" aria-checked="${!!s.schoolMode.active}" aria-label="${fpEsc(fpT("school_mode"))}" data-action="schoolmode" data-kid="${fpEsc(s.name)}" data-on="${s.schoolMode.active ? "0" : "1"}"></button></div>`
        : "",
    ].join("");
    const locked = s.locked || s.status === "locked";
    const buttons = [
      this._bonusBtn(k, 15),
      fl ? this._bonusBtn(k, 30) : "",
      fl ? this._bonusBtn(k, 60) : "",
      s.bonus && this._has("family_link", "revoke_bonus") ? this._btn(fpT("revoke"), `data-action="fl" data-service="revoke_bonus" data-kid="${fpEsc(s.name)}"`) : "",
      fl ? this._btn(fpT(locked ? "unlock" : "lock"), `data-action="fl" data-service="${locked ? "unlock" : "lock"}" data-kid="${fpEsc(s.name)}"${locked ? "" : ' data-ask="1"'}`, locked ? "" : "bad") : s.lockId ? this._btn(fpT(s.locked ? "unlock" : "lock"), `data-action="toggle" data-entity="${fpEsc(s.lockId)}"`, s.locked ? "" : "bad") : "",
      fl ? this._btn(fpT("ring"), `data-action="fl" data-service="ring" data-kid="${fpEsc(s.name)}"`) : s.ringId ? this._btn(fpT("ring"), `data-action="press" data-entity="${fpEsc(s.ringId)}"`) : "",
    ].join("");
    const left = s.remaining !== null ? fpT("remaining", { time: fpMinutes(s.remaining) }) : "";
    return `<div class="card"><div class="h"><span class="who">${fpAvatar(k.name, this._colorOf(k.name))}<b style="font-size:15px">${fpEsc(k.name)}</b></span><span class="tag" style="--c:${status[1]}">${fpEsc(fpT(status[0]))}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="big" style="font-size:26px;font-weight:800">${fpEsc(fpMinutes(s.used))}</span>${s.limit ? `<span class="muted">${fpEsc(fpT("of_limit", { limit: fpMinutes(s.limit) }))}</span>` : ""}</div>
      ${s.limit ? `<div class="bar" style="--c:${c};height:9px;margin:8px 0 4px"><i style="width:${Math.min(100, pct)}%"></i></div>` : ""}
      <div class="small muted">${fpEsc(left)}${s.bonus ? ` · <span class="acc">${fpEsc(fpT("bonus_running", { time: fpMinutes(s.bonus) }))}</span>` : ""}</div>
      ${bars}${apps}${devices || rules ? `<div class="sect">${fpEsc(fpT("devices_rules"))}</div>${devices}${rules}` : ""}
      <div class="btns">${buttons}</div></div>`;
  },

  // ── Mealie: the week's plan with its times and servings, recipes searched, a day planned ──

  async _fetchMealie() {
    const entries = this._inv?.mealie || [];
    if (!entries.length || !this._has("mealie", "get_mealplan")) return (this._mealie = null);
    const now = Date.now();
    const monday = fpAddDays(fpStartOfDay(now), -((new Date(now).getDay() + 6) % 7));
    const out = [];
    await Promise.all(
      entries.map(async (entry) => {
        try {
          const r = await this._hass.callWS({ type: "call_service", domain: "mealie", service: "get_mealplan", service_data: { config_entry_id: entry, start_date: fpDayKey(monday), end_date: fpDayKey(fpAddDays(monday, 13)) }, return_response: true });
          for (const e of r?.response?.mealplan || []) {
            const recipe = e.recipe || {};
            const name = recipe.name || e.title || e.text || "";
            const type = String(e.entry_type || "").toLowerCase();
            if (!name || !e.mealplan_date || !FP_SLOTS.includes(type)) continue;
            const minutes = fpNum(String(recipe.total_time ?? recipe.perform_time ?? "").match(/\d+/)?.[0]);
            out.push({ entry, id: e.mealplan_id ?? e.id ?? null, day: String(e.mealplan_date).slice(0, 10), type, name, servings: fpNum(String(recipe.recipe_yield ?? recipe.recipe_servings ?? "").match(/\d+/)?.[0]), minutes });
          }
        } catch (_e) {
          /* Mealie unreachable: the calendars stay */
        }
      }),
    );
    this._mealie = out.length ? out : null;
  },
  async _searchRecipes() {
    const e = this._mealEdit;
    const entry = this._inv?.mealie?.[0];
    if (!e || !entry || !this._has("mealie", "get_recipes")) return;
    e.q = this.shadowRoot.querySelector("input[data-mealq]")?.value || "";
    try {
      const r = await this._hass.callWS({ type: "call_service", domain: "mealie", service: "get_recipes", service_data: { config_entry_id: entry, search_terms: e.q, result_limit: 6 }, return_response: true });
      const items = r?.response?.recipes;
      const list = Array.isArray(items) ? items : Array.isArray(items?.items) ? items.items : [];
      this._recipes = list.map((x) => ({ id: x.recipe_id ?? x.id, name: x.name, minutes: fpNum(String(x.total_time ?? "").match(/\d+/)?.[0]) })).filter((x) => x.id && x.name);
    } catch (_e) {
      this._recipes = [];
    }
    this._render();
  },
  /** Plans the slot being edited: a recipe, a note, a random recipe, or nothing; the meal there before goes. */
  async _planMeal(kind, recipeId) {
    const e = this._mealEdit;
    const entry = this._inv?.mealie?.[0];
    if (!e || !entry) return;
    const note = this.shadowRoot.querySelector("input[data-mealq]")?.value.trim() || e.q || "";
    const current = this._plan()[e.day]?.[e.type];
    const slot = { config_entry_id: entry, date: e.day, entry_type: e.type };
    if (kind === "note" && !note) return;
    if (current?.id && this._has("mealie", "delete_mealplan")) await this._hass.callService("mealie", "delete_mealplan", { config_entry_id: entry, mealplan_id: current.id }).catch(() => {});
    if (kind === "recipe") await this._hass.callService("mealie", "set_mealplan", { ...slot, recipe_id: recipeId });
    else if (kind === "note") await this._hass.callService("mealie", "set_mealplan", { ...slot, note_title: note });
    else if (kind === "random") await this._hass.callService("mealie", "set_random_mealplan", slot);
    this._mealEdit = null;
    this._recipes = [];
    await this._fetch();
  },

  /** The actions of the new tabs; true when the click was one of them. */
  async _richAction(d, el) {
    const a = d.action;
    if (a === "todo") {
      await this._hass.callService("todo", "update_item", { item: d.uid, status: d.done === "1" ? "completed" : "needs_action" }, { entity_id: d.todo });
      await this._fetch();
    } else if (a === "sign") {
      if (!this._confirm(fpT("confirm_sign", { title: d.name }))) return true;
      await this._hass.callService("ent_one", "sign_word", { word_id: d.word, child_id: d.kid });
    } else if (a === "more") {
      if (d.entity) this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId: d.entity } }));
    } else if (a === "bonus") await this._hass.callService("family_link", "add_bonus", { child: d.kid, minutes: Number(d.minutes) });
    else if (a === "fl") {
      if (d.ask && !this._confirm(fpT("confirm_lock", { name: d.kid }))) return true;
      await this._hass.callService("family_link", d.service, { child: d.kid });
    } else if (a === "schoolmode") await this._hass.callService("family_link", "school_mode", { child: d.kid, enable: d.on === "1" });
    else if (a === "period") {
      this._period = d.period || null;
      this._render();
    } else if (a === "chores") {
      this._choreFilter = d.owner || "";
      this._render();
    } else if (a === "meal") {
      this._mealEdit = { day: d.day, type: d.type, q: "" };
      this._recipes = [];
      this._render();
    } else if (a === "meal-type") {
      this._mealEdit = { ...this._mealEdit, type: d.type };
      this._render();
    } else if (a === "meal-search") await this._searchRecipes();
    else if (a === "meal-recipe") await this._planMeal("recipe", d.id);
    else if (a === "meal-note") await this._planMeal("note");
    else if (a === "meal-random") await this._planMeal("random");
    else if (a === "meal-clear") await this._planMeal("clear");
    else if (a === "meal-cancel") {
      this._mealEdit = null;
      this._render();
    } else return false;
    return !!el;
  },
  /** Asks before an action that cannot be taken back (a word signed, a phone locked). */
  _confirm(text) {
    return typeof globalThis.confirm !== "function" || globalThis.confirm(text);
  },
});
