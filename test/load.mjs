// Imports the assembled panel module (npm test builds it first) with minimal DOM stand-ins: no browser needed.
class FakeRoot {
  constructor() {
    this.innerHTML = "";
    this.listeners = {};
  }
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  }
  querySelector() {
    return null;
  }
  get host() {
    return { parentElement: null };
  }
}
globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = new FakeRoot();
    return this.shadowRoot;
  }
};
const defined = new Map();
globalThis.customElements = { define: (n, c) => defined.set(n, c), get: (n) => defined.get(n) };
globalThis.history = { replaceState() {} };
globalThis.Element = class {};
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
const quiet = console.info;
console.info = () => {};
export const fp = await import("../custom_components/family_panel/frontend/family-panel.js");
console.info = quiet;
export { defined };
