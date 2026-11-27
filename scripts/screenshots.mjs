// Renders the sidebar panel with mock data (scripts/mock-states.mjs) and saves the README screenshots.
// Usage: npm run screenshots (CHROMIUM_PATH=/path/to/chrome to use an installed browser)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { eventsBetween, inventory, NOW, states, todos } from "./mock-states.mjs";
import { writeIfChanged } from "./screenshot-write.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const frontend = `${root}custom_components/family_panel/frontend/`;
// The panel is an ES module served from a fake origin whose /family_panel/ files come from the repository.
const ORIGIN = "http://ha.test";

const THEMES = {
  light: {
    "--primary-background-color": "#f2f0f7",
    "--secondary-background-color": "#ececec",
    "--card-background-color": "#ffffff",
    "--primary-text-color": "#1f2328",
    "--secondary-text-color": "#5b6470",
    "--divider-color": "rgba(0,0,0,.12)",
  },
  dark: {
    "--primary-background-color": "#111111",
    "--secondary-background-color": "#282828",
    "--card-background-color": "#1c1c1c",
    "--primary-text-color": "#e1e1e1",
    "--secondary-text-color": "#a0a6b2",
    "--divider-color": "rgba(225,225,225,.14)",
  },
};

// Every capture, light and dark: each tab the README shows, at a desktop width
export const shots = ["panel-today", "panel-school", "panel-agenda", "panel-meals", "panel-chores", "panel-screens"].flatMap((file) => [
  { file, tab: file.slice(6), theme: "light", width: 1280 },
  { file: `${file}-dark`, tab: file.slice(6), theme: "dark", width: 1280 },
]);

const pageHtml = (theme, width) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { --primary-color: #03a9f4; ${Object.entries(THEMES[theme])
    .map(([k, v]) => `${k}:${v};`)
    .join("")} }
  body { margin: 0; background: var(--primary-background-color); color: var(--primary-text-color);
         font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: ${width}px; }
</style></head><body><div id="root"></div></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

async function open(s) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: s.width, height: 900 } });
  await page.clock.setFixedTime(NOW);
  page.on("pageerror", (err) => console.error(`${s.file}: ${err.message}`));
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/family_panel/") && path.endsWith(".js"))
      return route.fulfill({ contentType: "text/javascript", body: readFileSync(`${frontend}${path.slice(14)}`, "utf8") });
    if (path.startsWith("/family_panel/i18n/")) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ contentType: "text/html", body: pageHtml(s.theme, s.width) });
  });
  await page.goto(`${ORIGIN}/`);
  await page.addScriptTag({ url: "/family_panel/family-panel.js", type: "module" });
  await page.evaluate(
    async ({ s, states, inventory, todos, events }) => {
      const hass = {
        states,
        language: "en",
        locale: { language: "en", time_format: "12" },
        user: { is_admin: true },
        themes: { darkMode: s.theme === "dark" },
        callWS: async (msg) => (msg.type === "todo/item/list" ? { items: todos[msg.entity_id] || [] } : msg.type === "family_panel/update_settings" ? { settings: inventory.settings } : inventory),
        callApi: async (_m, path) => {
          const [, id, query] = /^calendars\/([^?]+)\?(.*)$/.exec(path);
          const q = new URLSearchParams(query);
          return events[id].filter((e) => (e.start.dateTime || e.start.date) < q.get("end") && (e.end.dateTime || e.end.date) > q.get("start").slice(0, 10));
        },
        callService: async () => {},
      };
      await customElements.whenDefined("family-panel");
      const el = document.createElement("family-panel");
      el.panel = { url_path: "family", config: { version: "test" } };
      el.route = { path: `/${s.tab}` };
      el.hass = hass;
      document.getElementById("root").appendChild(el);
    },
    { s, states, inventory, todos, events: Object.fromEntries([...new Set(inventory.calendars.concat(inventory.meals))].map((id) => [id, eventsBetween(id, "0000", "9999")])) },
  );
  await page.waitForTimeout(800);
  return page;
}

for (const s of shots) {
  const page = await open(s);
  const box = await page.locator("#root").boundingBox();
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: s.width, height: Math.ceil(box.height) }, animations: "disabled" });
  // Rewritten only when the pixels change: an identical picture never shows up as a modified file.
  const written = writeIfChanged(`${root}screenshots/${s.file}.png`, png);
  console.log(`screenshots/${s.file}.png${written ? "" : " (unchanged)"}`);
  await page.close();
}

await browser.close();
