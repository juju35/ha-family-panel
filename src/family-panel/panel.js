// ── The panel ──
import {
  FAMILY_PANEL_VERSION,
  FP_ACCENT,
  FP_PALETTE,
  FP_TABS,
  fpAddDays,
  fpDate,
  fpDayKey,
  fpEsc,
  fpFmtNum,
  fpInitial,
  fpLoadStrings,
  fpMinutes,
  fpStartOfDay,
  fpState,
  fpT,
  fpTime,
  fpValid,
  fpWeekday,
} from "./core.js";
import { fpAttention, fpChild, fpCountdowns, fpEvent, fpMealWeek, fpProgress, fpSchoolTomorrow, fpWaste } from "./model.js";
import { FP_BINS_SVG, FP_FAMILY_LINK_SVG, fpDevice, fpSceneSvg } from "./scene.js";

const ICONS = {
  family: "M8 7a3 3 0 1 0 0-.01M17 9a2.5 2.5 0 1 0 0-.01M2 20a6 6 0 0 1 12 0M14 20a4 4 0 0 1 8 0",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  plus: "M12 5v14M5 12h14",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  bin: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  sun: "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5Z",
};
const icon = (name, size = 16) =>
  `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
/** A progress ring (0–100) around `inner`. */
const ring = (pct, color, size, inner, stroke = 4) => {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct || 0));
  return `<span class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="color-mix(in srgb, ${color} 18%, transparent)" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${((p / 100) * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><span class="rin">${inner}</span></span>`;
};
// The school integrations by their names
const FP_SOURCES = { pronote: "Pronote", ent_one: "ENT ONE", educartable: "Educartable", skolengo: "Skolengo" };
const SCHOOL_PIC = `<svg width="60" height="60" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="color-mix(in srgb, #1e8e5a 16%, transparent)"/><path d="M14 30 32 21l18 9-18 9Z" fill="#1e8e5a"/><path d="M21 34v8c6 4 16 4 22 0v-8l-11 5Z" fill="#5bb98a"/><path d="M48 31v10" stroke="#1e8e5a" stroke-width="2.5" stroke-linecap="round"/><circle cx="48" cy="43" r="2.5" fill="#1e8e5a"/></svg>`;
const PLATE_PIC = `<svg width="48" height="48" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" fill="color-mix(in srgb, #c77700 14%, transparent)"/><ellipse cx="26" cy="31" rx="16" ry="6" fill="var(--card-background-color, #fff)" stroke="#e7b26a" stroke-width="2"/><path d="M14 30c2-8 22-8 24 0" fill="#f0a24a"/><path d="M20 14c1 2-1 3 0 5M26 13c1 2-1 3 0 5M32 14c1 2-1 3 0 5" stroke="#e7b26a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
const CALENDAR_PIC = `<svg width="52" height="52" viewBox="0 0 58 58" aria-hidden="true"><circle cx="29" cy="29" r="27" fill="color-mix(in srgb, #0e9aa7 16%, transparent)"/><rect x="16" y="18" width="26" height="24" rx="4" fill="none" stroke="#0e9aa7" stroke-width="2.4"/><path d="M16 25h26M23 14v7M35 14v7" stroke="#0e9aa7" stroke-width="2.4" stroke-linecap="round"/><circle cx="29" cy="33" r="3" fill="#0e9aa7"/></svg>`;

export class FamilyPanel extends HTMLElement {
  static STYLE = `
    :host { display:block; min-height:100%; background:var(--primary-background-color); color:var(--primary-text-color);
            --fp-accent:${FP_ACCENT}; --fp-card:var(--card-background-color, #fff); --fp-muted:var(--secondary-text-color, #5b6470);
            --fp-tile:color-mix(in srgb, var(--primary-text-color) 5%, var(--fp-card)); --fp-line:var(--divider-color, rgba(127,127,127,.2));
            --fp-good:#1e8e5a; --fp-warn:#c77700; --fp-bad:#d93838; --fp-info:#2f6fde; --fp-teal:#0e9aa7;
            font-family:var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif); }
    * { box-sizing:border-box; }
    /* Top bar: the cards' illustrated header across the page, a ground strip at its foot */
    .banner { --fp-sky:#ede6fb; --fp-hill:#dccff6; --fp-hill2:#cdbdf1; --fp-ground:#b9a3ee; position:relative; height:90px; overflow:hidden; background:var(--fp-sky); container:fp-bar / inline-size; }
    .banner.night { --fp-sky:#1b1734; --fp-hill:#26204a; --fp-hill2:#2e2757; --fp-ground:#3a3168; color:#fff; }
    .hills { position:absolute; inset:0; width:100%; height:100%; display:block; }
    .fp-scene { position:absolute; right:64px; bottom:0; height:90px; width:526px; }
    .htext { position:absolute; left:12px; top:0; bottom:10px; right:200px; display:flex; align-items:center; gap:12px; min-width:0; }
    .htext ha-menu-button { flex:none; color:inherit; }
    .hicon { flex:none; width:44px; height:44px; border-radius:50%; display:grid; place-items:center; color:var(--fp-accent);
             background:#fff; box-shadow:0 2px 8px color-mix(in srgb, var(--fp-accent) 22%, transparent); }
    .night .hicon { background:rgba(255,255,255,.12); color:#cdbdf7; box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); }
    .tt { min-width:0; display:flex; flex-direction:column; gap:2px; }
    .trow { display:flex; align-items:center; gap:8px; min-width:0; }
    .tt .n { font-size:20px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#1f2328; }
    .tt .s { font-size:13px; color:#4f4866; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .night .tt .n { color:#fff; } .night .tt .s { color:rgba(255,255,255,.78); }
    .pill { flex:none; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; border-radius:999px; padding:4px 10px;
            background:#fff; color:#5a2fb8; box-shadow:0 1px 4px rgba(31,35,40,.12); white-space:nowrap; }
    .pill::before { content:""; width:7px; height:7px; border-radius:50%; background:currentColor; }
    .pill.ok { color:#167048; }
    .night .pill { background:rgba(255,255,255,.14); color:#e2d8fb; box-shadow:inset 0 0 0 1px rgba(255,255,255,.22); }
    .night .pill.ok { color:#8fe0b4; }
    .hbtns { position:absolute; right:12px; top:0; bottom:10px; display:flex; align-items:center; gap:6px; }
    .hbtn { all:unset; box-sizing:border-box; cursor:pointer; width:38px; height:38px; border-radius:50%; display:grid; place-items:center;
            color:#33506b; background:#fff; box-shadow:0 1px 4px rgba(31,35,40,.14); }
    .night .hbtn { color:#fff; background:rgba(255,255,255,.12); box-shadow:inset 0 0 0 1px rgba(255,255,255,.2); }
    .hbtn:focus-visible, .tab:focus-visible, .btn:focus-visible, .chip:focus-visible { outline:2px solid var(--fp-accent); outline-offset:2px; }
    .hbtn.spin .i { animation:fp-spin 1s linear infinite; }
    @keyframes fp-spin { to { transform:rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .hbtn.spin .i { animation:none; } }
    @container fp-bar (max-width: 720px) { .fp-scene { display:none; } .htext { right:60px; } }
    @container fp-bar (max-width: 420px) { .tt .s { display:none; } .pill { font-size:0; gap:0; padding:0; width:16px; height:16px; justify-content:center; } }
    /* Pill tabs on the card background, the active one tinted */
    .tabs { display:flex; gap:6px; padding:10px 16px; overflow-x:auto; scrollbar-width:none; background:var(--fp-card);
            border-bottom:1px solid var(--fp-line); position:sticky; top:0; z-index:2; }
    .tab { flex:none; border:0; border-radius:999px; padding:8px 14px; font:inherit; font-size:14px; cursor:pointer; background:transparent; color:var(--fp-muted); }
    .tab:hover { color:var(--primary-text-color); }
    .tab.active { font-weight:700; color:color-mix(in srgb, var(--fp-accent) 75%, var(--primary-text-color)); background:color-mix(in srgb, var(--fp-accent) 14%, transparent); }
    main { max-width:1200px; margin:0 auto; padding:18px 16px 32px; container:fp-main / inline-size; }
    section[hidden] { display:none; }
    .grid2 { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(0,1fr); gap:16px; align-items:start; }
    .col { display:flex; flex-direction:column; gap:14px; min-width:0; }
    .cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:14px; }
    @container fp-main (max-width: 820px) { .grid2 { grid-template-columns:minmax(0,1fr); } }
    /* Tiles: rounded, shadowed, no border */
    .card { background:var(--fp-card); border-radius:20px; padding:16px; min-width:0;
            box-shadow:0 1px 2px rgba(31,35,40,.05), 0 6px 18px color-mix(in srgb, var(--fp-accent) 8%, transparent); }
    .h { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; }
    .h b { font-size:15px; }
    .muted { color:var(--fp-muted); } .small { font-size:12px; } .note { font-size:13px; color:var(--fp-muted); }
    .hero { display:flex; align-items:center; gap:16px; }
    .hero .t { flex:1; min-width:0; }
    .hero .big { font-size:20px; font-weight:800; letter-spacing:-.01em; }
    .chips { display:flex; flex-direction:column; gap:6px; align-items:flex-end; }
    .chip { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; border-radius:999px; padding:5px 10px; white-space:nowrap;
            color:color-mix(in srgb, var(--c, var(--fp-accent)) 80%, var(--primary-text-color)); background:color-mix(in srgb, var(--c, var(--fp-accent)) 12%, transparent); }
    .bins { width:104px; height:62px; flex:none; border-radius:14px; background:color-mix(in srgb, #2f6fde 10%, transparent); display:flex; justify-content:center; padding-top:4px; }
    .bins svg { height:100%; width:auto; }
    .child .top { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    .ring { position:relative; display:inline-grid; place-items:center; flex:none; }
    .ring svg { position:absolute; inset:0; }
    .rin { position:relative; font-size:12px; font-weight:800; }
    .avatar { width:36px; height:36px; border-radius:50%; display:grid; place-items:center; font-weight:800; font-size:15px; }
    .stats { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; }
    .stat { border-radius:12px; padding:9px 10px; background:color-mix(in srgb, var(--c) 10%, transparent); }
    .stat .v { font-size:22px; font-weight:800; letter-spacing:-.02em; color:color-mix(in srgb, var(--c) 82%, var(--primary-text-color)); }
    .stat .k { font-size:11.5px; color:var(--fp-muted); }
    .lines { display:flex; flex-direction:column; gap:7px; font-size:12.5px; margin-top:12px; }
    .line { display:flex; gap:8px; align-items:center; min-width:0; }
    .line span:last-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .dot { width:7px; height:7px; border-radius:50%; flex:none; background:var(--c, var(--fp-accent)); }
    .timeline { position:relative; display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px; }
    .timeline::before { content:""; position:absolute; left:8px; right:8px; top:7px; height:2px; background:color-mix(in srgb, var(--fp-accent) 16%, transparent); }
    .stop { position:relative; min-width:0; font-size:12.5px; }
    .stop .pt { display:block; width:16px; height:16px; border-radius:50%; background:var(--c); border:3px solid var(--fp-card); box-shadow:0 0 0 1px var(--c); }
    .stop b { display:block; font-size:13px; margin-top:8px; }
    .stop span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    @container fp-main (max-width: 520px) { .timeline { grid-template-columns:repeat(2, minmax(0,1fr)); } .stats { grid-template-columns:repeat(2, minmax(0,1fr)); } }
    .meal { display:flex; align-items:center; gap:12px; }
    .meal .t { flex:1; min-width:0; }
    .meal .t b { display:block; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .sep { border-top:1px dashed var(--fp-line); margin-top:12px; padding-top:12px; display:flex; justify-content:space-between; gap:10px; font-size:13px; }
    .banner2 { height:70px; border-radius:14px; overflow:hidden; display:flex; justify-content:flex-end; margin-bottom:12px; background:#fbf1e6; }
    .night-ui .banner2 { background:color-mix(in srgb, #fbf1e6 12%, var(--fp-card)); }
    .banner2 .fp-device { width:100%; height:100%; display:block; }
    .screens { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; }
    .who { display:flex; align-items:center; gap:10px; min-width:0; }
    .who b { display:block; font-size:13px; }
    .btns { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
    /* Buttons: outlined, never filled */
    .btn { font:inherit; font-size:12.5px; font-weight:600; min-height:34px; padding:6px 12px; border-radius:999px; cursor:pointer;
           background:transparent; color:var(--primary-text-color); border:1px solid var(--fp-line); }
    .btn:hover { background:var(--fp-tile); }
    .btn.bad { color:color-mix(in srgb, var(--fp-bad) 85%, var(--primary-text-color)); border-color:color-mix(in srgb, var(--fp-bad) 40%, transparent); }
    .btn[disabled] { opacity:.5; cursor:default; }
    .count { display:flex; align-items:center; gap:14px; }
    .count .num { font-size:30px; font-weight:800; letter-spacing:-.02em; color:color-mix(in srgb, var(--fp-teal) 80%, var(--primary-text-color)); line-height:1.1; }
    .rows { display:flex; flex-direction:column; gap:6px; font-size:13px; }
    .row { display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--fp-tile); border-radius:12px; padding:9px 12px; min-width:0; }
    .row.bad { background:color-mix(in srgb, var(--fp-bad) 10%, transparent); }
    .row > span:first-child { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .row label { display:flex; gap:10px; align-items:center; min-width:0; cursor:pointer; }
    .row.done { color:var(--fp-muted); text-decoration:line-through; }
    .bar { height:8px; border-radius:4px; background:color-mix(in srgb, var(--primary-text-color) 9%, transparent); overflow:hidden; }
    .bar > i { display:block; height:100%; border-radius:4px; background:var(--c, var(--fp-accent)); }
    .avg { display:grid; grid-template-columns:minmax(0,1fr) 44px; gap:4px 10px; align-items:center; font-size:12.5px; }
    .avg .bar { grid-column:1 / -1; margin-bottom:6px; }
    .picker { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
    .chip.sel { box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--fp-accent) 40%, transparent); }
    .chip { cursor:default; border:0; font-family:inherit; }
    button.chip { cursor:pointer; }
    .week { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:10px; }
    .day { min-height:260px; padding:10px; }
    .day.today { box-shadow:inset 0 0 0 1.5px var(--fp-accent), 0 6px 18px color-mix(in srgb, var(--fp-accent) 8%, transparent); }
    .ev { margin-top:8px; font-size:12px; border-radius:10px; padding:6px 8px; background:color-mix(in srgb, var(--c) 12%, transparent); overflow-wrap:anywhere; }
    @container fp-main (max-width: 900px) { .week { grid-template-columns:repeat(2, minmax(0,1fr)); } .day { min-height:0; } }
    .menu { display:grid; grid-template-columns:70px minmax(0,1fr) minmax(0,1fr); gap:6px; font-size:13px; align-items:center; }
    .menu .cell { background:var(--fp-tile); border-radius:12px; padding:9px 10px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .menu .cell.now { box-shadow:inset 0 0 0 1px var(--fp-accent); }
    .add { display:flex; gap:8px; margin-top:12px; }
    .add input { flex:1; min-width:0; font:inherit; font-size:13px; padding:8px 12px; border-radius:999px; border:1px solid var(--fp-line); background:transparent; color:inherit; }
    .seg { display:flex; gap:6px; flex-wrap:wrap; }
    .switch { display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:13px; }
    .empty { font-size:13px; color:var(--fp-muted); padding:6px 0; }
  `;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._tab = "today";
    this._child = null;
    this._week = 0;
    this._inv = null;
    this._events = []; // [calendarId, event][] of the calendars, from yesterday to next week
    this._meals = [];
    this._todos = {}; // to-do list entity -> items
    this._sig = "";
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener("change", (ev) => this._onChange(ev));
    this.shadowRoot.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && ev.target.matches?.("input[data-add]")) this._addItem(ev.target);
    });
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (first) this._start();
    else if (this._inv && this._signature() !== this._sig) this._render();
    const menu = this.shadowRoot.querySelector("ha-menu-button");
    if (menu) menu.hass = hass;
  }
  get hass() {
    return this._hass;
  }
  set narrow(v) {
    this._narrow = v;
    const menu = this.shadowRoot.querySelector("ha-menu-button");
    if (menu) menu.narrow = v;
  }
  set route(r) {
    const tab = String(r?.path || "").replace(/^\//, "").split("/")[0];
    if (FP_TABS.includes(tab)) this._tab = tab;
  }
  set panel(p) {
    this._panel = p;
  }

  connectedCallback() {
    this._timer = setInterval(() => this._fetch(), 5 * 60 * 1000);
  }
  disconnectedCallback() {
    clearInterval(this._timer);
  }

  async _start() {
    await fpLoadStrings(this._hass);
    try {
      this._inv = await this._hass.callWS({ type: "family_panel/inventory" });
    } catch (_e) {
      this._inv = null;
      this.shadowRoot.innerHTML = `<style>${FamilyPanel.STYLE}</style><main><div class="card note">${fpEsc(fpT("failed"))}</div></main>`;
      return;
    }
    this._render();
    await this._fetch();
  }

  // ── Data that are not states: calendar events and to-do items ──
  async _fetchEvents(ids, from, to) {
    const out = [];
    await Promise.all(
      ids.map(async (id) => {
        try {
          const list = await this._hass.callApi("GET", `calendars/${id}?start=${encodeURIComponent(from.toISOString())}&end=${encodeURIComponent(to.toISOString())}`);
          for (const ev of list || []) out.push([id, ev]);
        } catch (_e) {
          /* a calendar that fails is left out */
        }
      }),
    );
    return out;
  }
  async _fetch() {
    if (!this._inv || !this._hass) return;
    const start = fpAddDays(fpStartOfDay(Date.now()), -1 + Math.min(0, this._week * 7));
    const end = fpAddDays(fpStartOfDay(Date.now()), 9 + Math.max(0, this._week * 7));
    const lists = [...new Set([...this._inv.shopping, ...this._inv.chores.filter((id) => id.startsWith("todo.")), ...this._homeworkLists()])];
    const [events, meals] = await Promise.all([
      this._fetchEvents(this._inv.calendars, start, end),
      this._fetchEvents(
        this._inv.meals.filter((id) => id.startsWith("calendar.")),
        fpAddDays(fpStartOfDay(Date.now()), -1),
        fpAddDays(fpStartOfDay(Date.now()), 8),
      ),
    ]);
    const todos = {};
    await Promise.all(
      lists.map(async (id) => {
        try {
          todos[id] = (await this._hass.callWS({ type: "todo/item/list", entity_id: id })).items || [];
        } catch (_e) {
          todos[id] = [];
        }
      }),
    );
    this._events = events;
    this._meals = meals;
    this._todos = todos;
    this._render();
  }
  _homeworkLists() {
    return (this._inv?.children || []).map((c) => c.school?.entities?.homework_list).filter((id) => id?.startsWith("todo."));
  }

  /** The states the panel shows, so that it is drawn again only when one of them changes. */
  _watched() {
    const inv = this._inv;
    const ids = [...inv.waste, ...inv.countdowns, ...inv.shopping, ...inv.chores, ...inv.persons, inv.saint, inv.workday];
    for (const c of inv.children) ids.push(...Object.values(c.school?.entities || {}), ...Object.values(c.family_link?.entities || {}));
    return ids.filter(Boolean);
  }
  _signature() {
    const h = this._hass;
    return `${h.themes?.darkMode}|${h.locale?.language}|${this._watched()
      .map((id) => `${h.states[id]?.state}@${h.states[id]?.last_updated}`)
      .join(",")}`;
  }

  // ── Drawing ──
  _night() {
    const t = this._inv?.settings?.illustration_theme;
    return t === "night" || (t !== "day" && !!this._hass?.themes?.darkMode);
  }
  _render() {
    if (!this._inv) return;
    this._sig = this._signature();
    const now = Date.now();
    const kids = this._inv.children.map((c) => fpChild(this._hass, c, now));
    if (!this._child || !kids.some((k) => k.id === this._child)) this._child = kids[0]?.id || null;
    const attention = fpAttention(kids, now);
    const tomorrow = fpSchoolTomorrow(this._hass, kids, this._inv.workday);
    const night = this._night();
    const sections = {
      today: () => this._today(kids, tomorrow, now),
      school: () => this._school(kids),
      agenda: () => this._agenda(now),
      meals: () => this._mealsTab(now),
      chores: () => this._choresTab(),
      screens: () => this._screensTab(kids),
      settings: () => this._settings(kids),
    };
    const scroll = this.shadowRoot.host.parentElement?.scrollTop;
    const subtitle = `${fpDate(this._hass, now, { weekday: "long", day: "numeric", month: "long" })}${tomorrow ? ` · ${fpT(tomorrow.school ? "tomorrow_school" : "tomorrow_no_school").toLowerCase()}` : ""}`;
    this.shadowRoot.innerHTML = `<style>${FamilyPanel.STYLE}</style>
      <div class="banner${night ? " night" : ""}">
        <svg class="hills" viewBox="0 0 1216 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 66 Q180 46 380 62 T780 56 T1216 52 V90 H0Z" fill="var(--fp-hill)"/><path d="M0 76 Q260 64 520 74 T1216 70 V90 H0Z" fill="var(--fp-hill2)"/>
          <rect y="80" width="1216" height="10" fill="var(--fp-ground)"/></svg>
        ${fpSceneSvg(night)}
        <div class="htext">
          <ha-menu-button></ha-menu-button>
          <span class="hicon">${icon("family", 22)}</span>
          <div class="tt"><div class="trow"><span class="n">${fpEsc(fpT("title"))}</span>
            <span class="pill${attention ? "" : " ok"}" title="${fpEsc(attention ? fpT("to_handle", { n: attention }) : fpT("all_good"))}">${fpEsc(attention ? fpT("to_handle", { n: attention }) : fpT("all_good"))}</span></div>
            <span class="s">${fpEsc(subtitle)}</span></div>
        </div>
        <div class="hbtns"><button class="hbtn" data-action="refresh" aria-label="${fpEsc(fpT("refresh"))}" title="${fpEsc(fpT("refresh"))}">${icon("refresh", 17)}</button></div>
      </div>
      <nav class="tabs" role="tablist">${FP_TABS.map((t) => `<button class="tab${t === this._tab ? " active" : ""}" role="tab" aria-selected="${t === this._tab}" data-tab="${t}">${fpEsc(fpT(`tab_${t}`))}</button>`).join("")}</nav>
      <main class="${night || this._hass.themes?.darkMode ? "night-ui" : ""}">${FP_TABS.map((t) => `<section data-tab="${t}"${t === this._tab ? "" : " hidden"}>${t === this._tab ? sections[t]() : ""}</section>`).join("")}</main>`;
    const menu = this.shadowRoot.querySelector("ha-menu-button");
    if (menu) {
      menu.hass = this._hass;
      menu.narrow = this._narrow;
    }
    if (scroll && this.shadowRoot.host.parentElement) this.shadowRoot.host.parentElement.scrollTop = scroll;
  }

  // ── Today ──
  _today(kids, tomorrow, now) {
    const inv = this._inv;
    const waste = fpWaste(this._hass, inv.waste, now);
    const tonight = waste.filter((w) => w.days <= 1);
    const saint = fpState(this._hass, inv.saint);
    const countdown = fpCountdowns(this._hass, inv.countdowns, now)[0];
    const chips = [
      ...tonight.map((w) => `<span class="chip" style="--c:var(--fp-info)">${icon("bin", 13)}${fpEsc(fpT("waste_tonight", { type: w.type }))}</span>`),
      fpValid(saint) ? `<span class="chip">${icon("sun", 13)}${fpEsc(fpT("saint", { name: saint.state }))}</span>` : "",
    ].join("");
    const tmr = fpAddDays(now, 1);
    const title = tomorrow ? fpT(tomorrow.school ? "tomorrow_school" : "tomorrow_no_school") : fpT("tomorrow_unknown");
    const detail = [
      tomorrow?.first ? fpT("tomorrow_detail", { day: fpWeekday(this._hass, tmr), time: fpTime(this._hass, tomorrow.first) }) : fpWeekday(this._hass, tmr),
      countdown ? `${countdown.name} · ${countdown.days ? fpT("countdown", { n: countdown.days }) : fpT("countdown_today")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const hero = `<div class="card hero">${SCHOOL_PIC}<div class="t"><div class="big">${fpEsc(title)}</div><div class="note">${fpEsc(detail)}</div></div>
      ${chips ? `<div class="chips">${chips}</div>` : ""}${inv.waste.length ? `<div class="bins">${fpDevice(FP_BINS_SVG, "hero")}</div>` : ""}</div>`;
    const childCards = kids.length
      ? `<div class="cards">${kids.map((k, i) => this._childCard(k, i)).join("")}</div>`
      : `<div class="card empty">${fpEsc(fpT("empty_family"))}</div>`;
    return `<div class="grid2"><div class="col">${hero}${childCards}${this._timeline(now)}</div>
      <div class="col">${this._mealCard(now)}${this._screenCard(kids)}${countdown ? this._countdownCard(countdown) : ""}</div></div>`;
  }
  _choresOf(name) {
    const id = this._inv.chores.find((c) => c.toLowerCase().includes(String(name).toLowerCase().split(" ")[0]));
    return id && this._todos[id] ? fpProgress(this._todos[id]) : null;
  }
  _childCard(k, i) {
    const color = FP_PALETTE[(i + 4) % FP_PALETTE.length];
    const chores = this._choresOf(k.name);
    const avatar = `<span class="avatar" style="background:color-mix(in srgb, ${color} 16%, transparent);color:${color}">${fpEsc(fpInitial(k.name))}</span>`;
    const stats = [
      [k.homeworkCount, fpT("homework"), "var(--fp-warn)"],
      k.toSign !== null ? [k.toSign, fpT("to_sign"), "var(--fp-bad)"] : k.average !== null ? [fpFmtNum(this._hass, k.average), fpT("average"), "var(--fp-good)"] : null,
      k.messages !== null ? [k.messages, fpT("messages"), "var(--fp-info)"] : null,
    ].filter(Boolean);
    const lines = k.homework.slice(0, 3).map((h) => `<div class="line"><span class="dot" style="--c:var(--fp-warn)"></span><span><b>${fpEsc(h.subject || "—")}</b>${h.text ? ` · ${fpEsc(h.text)}` : ""}${h.day ? ` · ${fpEsc(fpWeekday(this._hass, h.day, "short"))}` : ""}</span></div>`);
    return `<div class="card child"><div class="top">${chores ? ring(chores.pct, color, 48, avatar) : avatar}
      <div><b>${fpEsc(k.name)}</b><div class="small muted">${fpEsc([FP_SOURCES[k.source] || k.source, chores ? fpT("tasks_done", { done: chores.done, total: chores.total }) : ""].filter(Boolean).join(" · "))}</div></div></div>
      ${k.source ? `<div class="stats">${stats.map(([v, l, c]) => `<div class="stat" style="--c:${c}"><div class="v">${fpEsc(v ?? 0)}</div><div class="k">${fpEsc(l)}</div></div>`).join("")}</div>` : ""}
      ${lines.length ? `<div class="lines">${lines.join("")}</div>` : k.source ? `<div class="lines"><div class="line muted">${fpEsc(fpT("no_homework"))}</div></div>` : ""}</div>`;
  }
  _timeline(now) {
    const end = fpAddDays(fpStartOfDay(now), 2).getTime();
    const evs = this._events
      .map(([cal, ev]) => fpEvent(cal, ev, this._inv.calendars.indexOf(cal)))
      .filter((e) => !e.allDay && Date.parse(e.start) >= now - 30 * 60 * 1000 && Date.parse(e.start) < end)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 4);
    if (!this._inv.calendars.length) return "";
    const today = fpDayKey(now);
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("tonight_tomorrow"))}</b><span class="small muted">${fpEsc(fpT("calendars_n", { n: this._inv.calendars.length }))}</span></div>
      ${
        evs.length
          ? `<div class="timeline">${evs
              .map(
                (e) =>
                  `<div class="stop" style="--c:${FP_PALETTE[e.index % FP_PALETTE.length]}"><span class="pt"></span><b>${fpEsc(`${e.day === today ? "" : `${fpWeekday(this._hass, e.start, "short")} `}${fpTime(this._hass, e.start)}`)}</b><span>${fpEsc(e.summary)}</span>${e.where ? `<span class="small muted">${fpEsc(e.where)}</span>` : ""}</div>`,
              )
              .join("")}</div>`
          : `<div class="empty">${fpEsc(fpT("no_events"))}</div>`
      }</div>`;
  }
  _mealCard(now) {
    if (!this._inv.meals.length && !this._inv.shopping.length) return "";
    const week = fpMealWeek(this._meals);
    const today = week[fpDayKey(now)] || {};
    const tomorrow = week[fpDayKey(fpAddDays(now, 1))] || {};
    const toBuy = this._inv.shopping.reduce((n, id) => n + (this._todos[id] || []).filter((x) => x.status !== "completed").length, 0);
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("meals"))}</b></div>
      <div class="meal">${PLATE_PIC}<div class="t"><span class="small muted">${fpEsc(fpT("tonight"))}</span><b>${fpEsc(today.dinner || fpT("to_plan"))}</b></div></div>
      <div class="sep"><span><span class="muted">${fpEsc(fpT("tomorrow"))}</span> · <b>${fpEsc(tomorrow.dinner || tomorrow.lunch || fpT("to_plan"))}</b></span>${this._inv.shopping.length ? `<span class="small" style="color:color-mix(in srgb, var(--fp-warn) 85%, var(--primary-text-color));font-weight:700">${fpEsc(fpT("items_n", { n: toBuy }))}</span>` : ""}</div></div>`;
  }
  _screenCard(kids) {
    const fl = kids.filter((k) => k.screen);
    if (!fl.length) return "";
    return `<div class="card"><div class="h"><b>${fpEsc(fpT("screen_time"))}</b><span class="small muted">Family Link</span></div>
      <div class="banner2">${fpDevice(FP_FAMILY_LINK_SVG, "today")}</div>
      <div class="screens">${fl
        .map((k) => {
          const pct = k.screen.limit ? Math.round((k.screen.used / k.screen.limit) * 100) : 0;
          const c = k.screen.reached ? "var(--fp-bad)" : pct >= 70 ? "var(--fp-warn)" : "var(--fp-good)";
          return `<div class="who">${ring(pct, c, 52, k.screen.limit ? `${Math.min(pct, 999)}%` : "—", 6)}<div><b>${fpEsc(k.name)}</b><span class="small muted">${fpEsc(k.screen.limit ? fpT("used_of", { used: fpMinutes(k.screen.used), limit: fpMinutes(k.screen.limit) }) : fpMinutes(k.screen.used))}</span></div></div>`;
        })
        .join("")}</div>
      ${fl.length === 1 ? this._screenButtons(fl[0]) : ""}</div>`;
  }
  _screenButtons(k) {
    const s = k.screen;
    return `<div class="btns">${s.bonusId ? `<button class="btn" data-action="press" data-entity="${fpEsc(s.bonusId)}">${fpEsc(fpT("add_15"))}</button>` : ""}${
      s.lockId ? `<button class="btn${s.locked ? "" : " bad"}" data-action="toggle" data-entity="${fpEsc(s.lockId)}">${fpEsc(fpT(s.locked ? "unlock" : "lock"))}</button>` : ""
    }${s.ringId ? `<button class="btn" data-action="press" data-entity="${fpEsc(s.ringId)}">${fpEsc(fpT("ring"))}</button>` : ""}</div>`;
  }
  _countdownCard(c) {
    return `<div class="card count">${CALENDAR_PIC}<div><div class="small muted">${fpEsc(c.name)}</div><div class="num">${fpEsc(c.days ? fpT("countdown", { n: c.days }) : fpT("countdown_today"))}</div><div class="small muted">${fpEsc(fpDate(this._hass, c.day, { weekday: "long", day: "numeric", month: "long" }))}</div></div></div>`;
  }

  // ── School ──
  _school(kids) {
    const school = kids.filter((k) => k.source);
    if (!school.length) return `<div class="card empty">${fpEsc(fpT("empty_family"))}</div>`;
    const k = school.find((x) => x.id === this._child) || school[0];
    const picker = school.length > 1 ? `<div class="picker">${school.map((x) => `<button class="chip${x.id === k.id ? " sel" : ""}" data-child="${fpEsc(x.id)}">${fpEsc(x.name)}</button>`).join("")}</div>` : "";
    const lessons = k.lessons.length
      ? `<div class="rows">${k.lessons
          .map((l) => `<div class="row${l.canceled ? " bad" : ""}"><span><b>${fpEsc(fpTime(this._hass, l.start))}</b> ${fpEsc(l.subject)}</span><span class="small ${l.canceled || l.status ? "" : "muted"}" style="${l.canceled ? "color:var(--fp-bad);font-weight:600" : ""}">${fpEsc(l.canceled ? fpT("canceled") : l.status || l.room)}</span></div>`)
          .join("")}</div>`
      : `<div class="empty">${fpEsc(fpT("no_lessons"))}</div>`;
    const homework = k.homework.length
      ? `<div class="rows">${k.homework
          .slice(0, 8)
          .map((h) => `<div class="row"><span><b>${fpEsc(h.subject || "—")}</b>${h.text ? ` · ${fpEsc(h.text)}` : ""}</span><span class="small muted">${fpEsc(h.day ? fpWeekday(this._hass, h.day, "short") : "")}</span></div>`)
          .join("")}</div>`
      : `<div class="empty">${fpEsc(fpT("no_homework"))}</div>`;
    const life = [
      k.absences !== null ? [fpT("absences"), k.absences] : null,
      k.delays !== null ? [fpT("delays"), k.delays] : null,
      k.messages !== null ? [fpT("unread"), k.messages] : null,
      k.toSign !== null ? [fpT("to_sign"), k.toSign] : null,
    ].filter(Boolean);
    const avgs = k.averages.length
      ? k.averages
          .map((a) => {
            const pct = Math.round((a.value / a.outOf) * 100);
            const c = pct >= 70 ? "var(--fp-good)" : pct >= 50 ? "var(--fp-info)" : "var(--fp-warn)";
            return `<div class="avg"><span>${fpEsc(a.subject)}</span><b style="text-align:right">${fpEsc(fpFmtNum(this._hass, a.value))}</b><div class="bar" style="--c:${c}"><i style="width:${pct}%"></i></div></div>`;
          })
          .join("")
      : `<div class="empty">${fpEsc(fpT("no_grades"))}</div>`;
    return `${picker}<div class="cards">
      <div class="card"><div class="h"><b>${fpEsc(fpT("next_lessons"))}</b><span class="small muted">${fpEsc(fpWeekday(this._hass, fpAddDays(Date.now(), 1)))}</span></div>${lessons}</div>
      <div class="card"><div class="h"><b>${fpEsc(fpT("homework_list"))}</b></div>${homework}
        ${life.length ? `<div class="h" style="margin-top:16px"><b>${fpEsc(fpT("school_life"))}</b></div><div class="rows">${life.map(([l, v]) => `<div class="row"><span>${fpEsc(l)}</span><b>${fpEsc(v)}</b></div>`).join("")}</div>` : ""}</div>
      <div class="card"><div class="h"><b>${fpEsc(fpT("grades"))}</b>${k.average !== null ? `<b style="font-size:22px;color:var(--fp-good)">${fpEsc(fpFmtNum(this._hass, k.average))}</b>` : ""}</div>${avgs}</div></div>`;
  }

  // ── Agenda ──
  _agenda(now) {
    if (!this._inv.calendars.length) return `<div class="card empty">${fpEsc(fpT("no_events"))}</div>`;
    const monday = fpAddDays(fpStartOfDay(now), -((new Date(now).getDay() + 6) % 7) + this._week * 7);
    const today = fpDayKey(now);
    const events = this._events.map(([cal, ev]) => fpEvent(cal, ev, this._inv.calendars.indexOf(cal)));
    const days = Array.from({ length: 7 }, (_, i) => fpAddDays(monday, i));
    return `<div class="h"><b>${fpEsc(fpT("week_of", { date: fpDate(this._hass, monday) }))}</b><div class="btns" style="margin:0">
        <button class="btn" data-action="week" data-step="-1" aria-label="${fpEsc(fpT("previous"))}">${icon("left", 14)}</button>
        <button class="btn" data-action="week" data-step="0">${fpEsc(fpT("today"))}</button>
        <button class="btn" data-action="week" data-step="1" aria-label="${fpEsc(fpT("next"))}">${icon("right", 14)}</button></div></div>
      <div class="week">${days
        .map((d) => {
          const key = fpDayKey(d);
          const evs = events.filter((e) => e.day === key).sort((a, b) => a.start.localeCompare(b.start));
          return `<div class="card day${key === today ? " today" : ""}"><div class="small ${key === today ? "" : "muted"}" style="${key === today ? "color:var(--fp-accent);font-weight:700" : ""}">${fpEsc(fpDate(this._hass, d, { weekday: "short", day: "numeric" }))}</div>
            ${evs.map((e) => `<div class="ev" style="--c:${FP_PALETTE[e.index % FP_PALETTE.length]}">${e.allDay ? "" : `<b>${fpEsc(fpTime(this._hass, e.start))}</b> `}${fpEsc(e.summary)}</div>`).join("")}</div>`;
        })
        .join("")}</div>
      <div class="btns">${this._inv.calendars.map((id, i) => `<span class="chip" style="--c:${FP_PALETTE[i % FP_PALETTE.length]}"><span class="dot"></span>${fpEsc(this._hass.states[id]?.attributes?.friendly_name || id)}</span>`).join("")}</div>`;
  }

  // ── Meals ──
  _mealsTab(now) {
    const week = fpMealWeek(this._meals);
    const today = fpDayKey(now);
    const menu = this._inv.meals.length
      ? `<div class="menu"><span></span><span class="small muted">${fpEsc(fpT("lunch"))}</span><span class="small muted">${fpEsc(fpT("dinner"))}</span>${Array.from({ length: 7 }, (_, i) => {
          const d = fpAddDays(fpStartOfDay(now), i);
          const m = week[fpDayKey(d)] || {};
          const cur = fpDayKey(d) === today;
          return `<b style="${cur ? "color:var(--fp-accent)" : ""}">${fpEsc(fpWeekday(this._hass, d, "short"))}</b><span class="cell">${fpEsc(m.lunch || "—")}</span><span class="cell${cur ? " now" : ""}"${m.dinner ? "" : ' style="color:var(--fp-muted)"'}>${fpEsc(m.dinner || fpT("to_plan"))}</span>`;
        }).join("")}</div>`
      : `<div class="empty">${fpEsc(fpT("no_meals"))}</div>`;
    const lists = this._inv.shopping.map((id) => this._todoCard(id, fpT("shopping"), true)).join("");
    return `<div class="grid2"><div class="card"><div class="h"><b>${fpEsc(fpT("week_menu"))}</b></div>${menu}</div><div class="col">${lists || `<div class="card empty">${fpEsc(fpT("shopping"))} · ${fpEsc(fpT("not_found"))}</div>`}</div></div>`;
  }
  _todoCard(id, fallback, adding) {
    const items = this._todos[id] || [];
    const name = this._hass.states[id]?.attributes?.friendly_name || fallback;
    const open = items.filter((x) => x.status !== "completed");
    const done = items.filter((x) => x.status === "completed");
    return `<div class="card"><div class="h"><b>${fpEsc(name)}</b><span class="small muted">${fpEsc(fpT("items_n", { n: open.length }))}</span></div>
      <div class="rows">${[...open, ...done]
        .slice(0, 14)
        .map((x) => `<div class="row${x.status === "completed" ? " done" : ""}"><label><input type="checkbox" data-todo="${fpEsc(id)}" data-uid="${fpEsc(x.uid)}"${x.status === "completed" ? " checked" : ""}> <span>${fpEsc(x.summary)}</span></label>${x.due ? `<span class="small muted">${fpEsc(fpWeekday(this._hass, x.due, "short"))}</span>` : ""}</div>`)
        .join("")}</div>
      ${adding ? `<div class="add"><input data-add="${fpEsc(id)}" placeholder="${fpEsc(fpT("add_item"))}" aria-label="${fpEsc(fpT("add_item"))}"><button class="btn" data-action="add" data-entity="${fpEsc(id)}" aria-label="${fpEsc(fpT("add_item"))}">${icon("plus", 14)}</button></div>` : ""}</div>`;
  }

  // ── Chores ──
  _choresTab() {
    const lists = this._inv.chores.filter((id) => id.startsWith("todo."));
    if (!lists.length) return `<div class="card empty">${fpEsc(fpT("no_chores"))}</div>`;
    const today = fpDayKey(Date.now());
    const all = lists.flatMap((id) => this._todos[id] || []);
    const p = fpProgress(all);
    return `<div class="card" style="margin-bottom:14px"><div class="h"><b>${fpEsc(fpT("chores"))}</b><b style="color:var(--fp-accent);font-size:18px">${p.done} / ${p.total}</b></div><div class="bar"><i style="width:${p.pct}%"></i></div></div>
      <div class="cards">${lists
        .map((id) => {
          const items = this._todos[id] || [];
          const q = fpProgress(items);
          return `<div class="card"><div class="h"><b>${fpEsc(this._hass.states[id]?.attributes?.friendly_name || id)}</b><b style="color:var(--fp-accent)">${q.done} / ${q.total}</b></div><div class="rows">${items
            .slice(0, 12)
            .map((x) => {
              const late = x.status !== "completed" && x.due && String(x.due).slice(0, 10) < today;
              const tag = x.status === "completed" ? `<span class="small" style="color:var(--fp-good);font-weight:600">${fpEsc(fpT("done"))}</span>` : late ? `<span class="small" style="color:var(--fp-bad);font-weight:600">${fpEsc(fpT("overdue"))}</span>` : x.due ? `<span class="small muted">${fpEsc(fpT("due", { day: fpWeekday(this._hass, x.due, "short") }))}</span>` : "";
              return `<div class="row${late ? " bad" : ""}"><label><input type="checkbox" data-todo="${fpEsc(id)}" data-uid="${fpEsc(x.uid)}"${x.status === "completed" ? " checked" : ""}> <span>${fpEsc(x.summary)}</span></label>${tag}</div>`;
            })
            .join("")}</div></div>`;
        })
        .join("")}</div>`;
  }

  // ── Screens ──
  _screensTab(kids) {
    const fl = kids.filter((k) => k.screen);
    if (!fl.length) return `<div class="card empty">${fpEsc(fpT("no_family_link"))}</div>`;
    return `<div class="cards">${fl
      .map((k, i) => {
        const s = k.screen;
        const pct = s.limit ? Math.min(100, Math.round((s.used / s.limit) * 100)) : 0;
        const c = s.reached ? "var(--fp-bad)" : pct >= 70 ? "var(--fp-warn)" : "var(--fp-good)";
        return `<div class="card"><div class="banner2">${fpDevice(FP_FAMILY_LINK_SVG, `scr${i}`)}</div>
          <div class="h"><b>${fpEsc(k.name)}</b><span class="small" style="color:${c};font-weight:700">${fpEsc(s.reached ? fpT("limit_reached") : s.limit ? fpT("used_of", { used: fpMinutes(s.used), limit: fpMinutes(s.limit) }) : fpMinutes(s.used))}</span></div>
          ${s.limit ? `<div class="bar" style="--c:${c};height:10px"><i style="width:${pct}%"></i></div>` : ""}
          <div class="rows" style="margin-top:12px">${s.remaining !== null ? `<div class="row"><span>${fpEsc(fpT("remaining", { time: fpMinutes(s.remaining) }))}</span></div>` : ""}${s.bedtime ? `<div class="row"><span>${fpEsc(fpT("bedtime"))}</span><b>${fpEsc(s.bedtime)}</b></div>` : ""}${s.blocked !== null ? `<div class="row"><span>${fpEsc(fpT("blocked_apps"))}</span><b>${fpEsc(s.blocked)}</b></div>` : ""}${s.locked ? `<div class="row bad"><span>${fpEsc(fpT("locked"))}</span>${icon("lock", 14)}</div>` : ""}</div>
          ${this._screenButtons(k)}</div>`;
      })
      .join("")}</div>`;
  }

  // ── Settings ──
  _settings(kids) {
    const inv = this._inv;
    const admin = !!this._hass.user?.is_admin;
    const st = inv.settings || {};
    const name = (id) => this._hass.states[id]?.attributes?.friendly_name || id;
    const members = [
      ...kids.map((k) => `<div class="row"><span><b>${fpEsc(k.name)}</b> · ${fpEsc(fpT("child"))}</span><span class="small muted">${fpEsc([FP_SOURCES[k.source] || k.source, k.screen ? "Family Link" : ""].filter(Boolean).join(" · "))}</span></div>`),
      ...inv.persons.filter((id) => !kids.some((k) => name(id).toLowerCase().startsWith(k.name.toLowerCase().split(" ")[0]))).map((id) => `<div class="row"><span><b>${fpEsc(name(id))}</b> · ${fpEsc(fpT("adult"))}</span><span class="small muted">${fpEsc(id)}</span></div>`),
    ];
    const src = [
      [fpT("school_source"), kids.filter((k) => k.source).length],
      [fpT("family_link"), kids.filter((k) => k.screen).length],
      [fpT("calendars"), inv.calendars.length],
      [fpT("meal_plans"), inv.meals.length],
      [fpT("shopping_lists"), inv.shopping.length],
      [fpT("chore_lists"), inv.chores.length],
      [fpT("waste"), inv.waste.length],
      [fpT("countdowns"), inv.countdowns.length],
      [fpT("saint_of_day"), inv.saint ? 1 : 0],
    ];
    const themes = ["auto", "day", "night"];
    return `<div class="cards">
      <div class="card"><div class="h"><b>${fpEsc(fpT("members"))}</b></div><div class="rows">${members.join("") || `<div class="empty">${fpEsc(fpT("empty_family"))}</div>`}</div></div>
      <div class="card"><div class="h"><b>${fpEsc(fpT("sources"))}</b></div><div class="rows">${src.map(([l, n]) => `<div class="row"><span>${fpEsc(l)}</span><span class="small" style="font-weight:600;color:${n ? "var(--fp-good)" : "var(--fp-muted)"}">${fpEsc(n ? (n > 1 ? fpT("found_n", { n }) : fpT("connected")) : fpT("not_found"))}</span></div>`).join("")}</div>
        <p class="note">${fpEsc(fpT("options_hint"))}</p></div>
      <div class="card"><div class="h"><b>${fpEsc(fpT("appearance"))}</b></div>
        <div class="small muted" style="margin-bottom:8px">${fpEsc(fpT("illustration_theme"))}</div>
        <div class="seg">${themes.map((t) => `<button class="chip${st.illustration_theme === t ? " sel" : ""}" data-theme="${t}"${admin ? "" : " disabled"}>${fpEsc(fpT(`theme_${t}`))}</button>`).join("")}</div>
        <label class="switch" style="margin-top:16px"><span><b>${fpEsc(fpT("admin_only"))}</b><br><span class="small muted">${fpEsc(fpT("admin_only_hint"))}</span></span>
          <input type="checkbox" data-setting="admin_only"${st.admin_only ? " checked" : ""}${admin ? "" : " disabled"}></label></div></div>`;
  }

  // ── Actions ──
  async _onClick(ev) {
    const el = ev.composedPath().find((n) => n instanceof Element && (n.dataset?.tab || n.dataset?.action || n.dataset?.child || n.dataset?.theme));
    if (!el) return;
    const d = el.dataset;
    if (d.tab && el.classList.contains("tab")) {
      this._tab = d.tab;
      history.replaceState(null, "", `/${this._panel?.url_path || "family"}/${d.tab}`);
      this._render();
    } else if (d.child) {
      this._child = d.child;
      this._render();
    } else if (d.theme && !el.disabled) {
      await this._saveSetting({ illustration_theme: d.theme });
    } else if (d.action === "refresh") {
      el.classList.add("spin");
      this._inv = { ...(await this._hass.callWS({ type: "family_panel/inventory" })) };
      await this._fetch();
    } else if (d.action === "week") {
      this._week = +d.step ? this._week + +d.step : 0;
      this._render();
      await this._fetch();
    } else if (d.action === "press") {
      await this._hass.callService("button", "press", {}, { entity_id: d.entity });
    } else if (d.action === "toggle") {
      await this._hass.callService("switch", "toggle", {}, { entity_id: d.entity });
    } else if (d.action === "add") {
      this._addItem(this.shadowRoot.querySelector(`input[data-add="${CSS.escape(d.entity)}"]`));
    }
  }
  async _onChange(ev) {
    const t = ev.target;
    if (t.dataset?.todo) {
      await this._hass.callService("todo", "update_item", { item: t.dataset.uid, status: t.checked ? "completed" : "needs_action" }, { entity_id: t.dataset.todo });
      await this._fetch();
    } else if (t.dataset?.setting) {
      await this._saveSetting({ [t.dataset.setting]: t.checked });
    }
  }
  async _addItem(input) {
    const text = input?.value.trim();
    if (!text) return;
    await this._hass.callService("todo", "add_item", { item: text }, { entity_id: input.dataset.add });
    await this._fetch();
  }
  async _saveSetting(changes) {
    const res = await this._hass.callWS({ type: "family_panel/update_settings", ...changes });
    this._inv = { ...this._inv, settings: res.settings };
    this._render();
  }
}

if (!customElements.get("family-panel")) customElements.define("family-panel", FamilyPanel);
console.info(`%c FAMILY-PANEL %c v${FAMILY_PANEL_VERSION} `, `color:#fff;background:${FP_ACCENT};font-weight:700`, "color:#7c4ddb");
