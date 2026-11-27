// Entry point: the modules in their order. scripts/build-frontend.mjs (scripts/bundle.mjs) concatenates them in this
// order into the single module the integration serves.
import "./core.js";
import "./scene.js";
import "./model.js";
import "./panel.js";
// The assembled module's own exports (the other `export`s only join the modules)
export { FAMILY_PANEL_VERSION, FP_EN, fpEsc, fpNum, fpMinutes } from "./core.js";
export { fpChild, fpAttention, fpSchoolTomorrow, fpWaste, fpCountdowns, fpMealWeek, fpProgress } from "./model.js";
export { fpSceneSvg } from "./scene.js";
export { FamilyPanel } from "./panel.js";
