window.__ModuleLoader__.load({ id: "dsh-thinking-status-customizer", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.ts
var client_exports = {};
__export(client_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  MAX_TEXT_CODE_POINTS: () => MAX_TEXT_CODE_POINTS,
  STATUS_SELECTOR: () => STATUS_SELECTOR,
  STORAGE_KEY: () => STORAGE_KEY,
  apply: () => apply,
  escapeCssString: () => escapeCssString,
  loadSettings: () => loadSettings,
  mountThinkingStatusCustomizer: () => mountThinkingStatusCustomizer,
  validateSettings: () => validateSettings
});
module.exports = __toCommonJS(client_exports);
var STATUS_SELECTOR = '[data-conversation-scroll] [role="status"][aria-live="polite"]';
var STORAGE_KEY = "dsh-thinking-status-customizer:v1";
var MAX_TEXT_CODE_POINTS = 80;
var ROOT_ATTRIBUTE = "data-dsh-thinking-status-customizer";
var TEXT_PROPERTY = "--dsh-thinking-status-customizer-text";
var COLOR_A_PROPERTY = "--dsh-thinking-status-customizer-color-a";
var COLOR_B_PROPERTY = "--dsh-thinking-status-customizer-color-b";
var STYLE_ID = "dsh-thinking-status-customizer-style";
var SETTINGS_ID = "dsh-thinking-status-customizer-settings";
var BUTTON_ID = "dsh-thinking-status-customizer-button";
var DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  text: "\u6B63\u5728\u5403\u996D\u4E2D...",
  colorA: "#7c3aed",
  colorB: "#22c55e"
});
function escapeCssString(value) {
  let escaped = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (character === "\\") escaped += "\\\\";
    else if (character === '"') escaped += '\\"';
    else if (codePoint === 0) escaped += "\\FFFD ";
    else if (codePoint <= 31 || codePoint === 127) escaped += `\\${codePoint.toString(16)} `;
    else escaped += character;
  }
  return `"${escaped}"`;
}
function validateSettings(value) {
  if (!isRecord(value)) return { ok: false, message: "\u8BBE\u7F6E\u6570\u636E\u4E0D\u662F\u5BF9\u8C61\u3002" };
  if (typeof value.enabled !== "boolean") return { ok: false, message: "\u542F\u7528\u72B6\u6001\u65E0\u6548\u3002" };
  if (typeof value.text !== "string") return { ok: false, message: "\u72B6\u6001\u6587\u5B57\u65E0\u6548\u3002" };
  const text = value.text.trim();
  if (text.length === 0) return { ok: false, message: "\u72B6\u6001\u6587\u5B57\u4E0D\u80FD\u4E3A\u7A7A\u3002" };
  if (Array.from(text).length > MAX_TEXT_CODE_POINTS) {
    return { ok: false, message: `\u72B6\u6001\u6587\u5B57\u6700\u591A ${MAX_TEXT_CODE_POINTS} \u4E2A Unicode \u5B57\u7B26\u3002` };
  }
  if (!isColor(value.colorA) || !isColor(value.colorB)) {
    return { ok: false, message: "\u989C\u8272\u5FC5\u987B\u662F #RRGGBB\u3002" };
  }
  return {
    ok: true,
    value: { enabled: value.enabled, text, colorA: value.colorA, colorB: value.colorB }
  };
}
function loadSettings(storage) {
  if (storage === void 0) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const result = validateSettings(parsed);
    return result.ok ? result.value : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function apply(ctx) {
  ctx.effect(() => {
    if (typeof document === "undefined") return () => {
    };
    return mountThinkingStatusCustomizer(document);
  }, "dsh-thinking-status-customizer: browser UI");
}
function mountThinkingStatusCustomizer(doc) {
  const browser = doc.defaultView;
  if (browser === null) return () => {
  };
  const root = doc.documentElement;
  const style = createStyle(doc);
  const controls = createControls(doc);
  const storage = getStorage(browser);
  let settings = loadSettings(storage);
  let disposed = false;
  const applyVisualState = (next) => {
    if (!next.enabled) {
      clearVisualState(root);
      return;
    }
    root.setAttribute(ROOT_ATTRIBUTE, "enabled");
    root.style.setProperty(TEXT_PROPERTY, escapeCssString(next.text));
    root.style.setProperty(COLOR_A_PROPERTY, next.colorA);
    root.style.setProperty(COLOR_B_PROPERTY, next.colorB);
  };
  const syncControls = () => {
    controls.enabled.checked = settings.enabled;
    controls.text.value = settings.text;
    controls.colorA.value = settings.colorA;
    controls.colorB.value = settings.colorB;
  };
  const updateCompatibilityStatus = () => {
    controls.compatibility.textContent = doc.querySelector(STATUS_SELECTOR) === null ? "\u7B49\u5F85 DSH \u601D\u8003\u72B6\u6001\u51FA\u73B0\u3002" : "\u5DF2\u68C0\u6D4B\u5230 DSH \u601D\u8003\u72B6\u6001\u3002";
  };
  const persist = () => {
    if (storage === void 0) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  };
  const save = () => {
    const result = validateSettings({
      enabled: controls.enabled.checked,
      text: controls.text.value,
      colorA: controls.colorA.value,
      colorB: controls.colorB.value
    });
    if (!result.ok) {
      controls.status.textContent = result.message;
      return;
    }
    settings = result.value;
    syncControls();
    applyVisualState(settings);
    controls.status.textContent = persist() ? "\u5DF2\u4FDD\u5B58\u5E76\u5E94\u7528\u3002" : "\u5DF2\u5E94\u7528\uFF1B\u6D4F\u89C8\u5668\u62D2\u7EDD\u672C\u5730\u5B58\u50A8\uFF0C\u5237\u65B0\u540E\u4F1A\u6062\u590D\u9ED8\u8BA4\u503C\u3002";
  };
  const restoreDefaults = () => {
    settings = { ...DEFAULT_SETTINGS };
    syncControls();
    applyVisualState(settings);
    controls.status.textContent = persist() ? "\u5DF2\u6062\u590D\u9ED8\u8BA4\u503C\u3002" : "\u5DF2\u6062\u590D\u9ED8\u8BA4\u89C6\u89C9\uFF1B\u6D4F\u89C8\u5668\u62D2\u7EDD\u672C\u5730\u5B58\u50A8\u3002";
  };
  const openDialog = () => {
    controls.dialog.hidden = false;
    controls.button.setAttribute("aria-expanded", "true");
    updateCompatibilityStatus();
    controls.text.focus();
  };
  const closeDialog = () => {
    controls.dialog.hidden = true;
    controls.button.setAttribute("aria-expanded", "false");
    controls.button.focus();
  };
  const onSubmit = (event) => {
    event.preventDefault();
    save();
  };
  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    settings = loadSettings(storage);
    syncControls();
    applyVisualState(settings);
    controls.status.textContent = "\u5DF2\u540C\u6B65\u53E6\u4E00\u4E2A\u6807\u7B7E\u9875\u7684\u8BBE\u7F6E\u3002";
  };
  controls.button.addEventListener("click", openDialog);
  controls.form.addEventListener("submit", onSubmit);
  controls.restore.addEventListener("click", restoreDefaults);
  controls.close.addEventListener("click", closeDialog);
  browser.addEventListener("storage", onStorage);
  doc.head.append(style);
  doc.body.append(controls.button, controls.dialog);
  syncControls();
  applyVisualState(settings);
  updateCompatibilityStatus();
  return () => {
    if (disposed) return;
    disposed = true;
    controls.button.removeEventListener("click", openDialog);
    controls.form.removeEventListener("submit", onSubmit);
    controls.restore.removeEventListener("click", restoreDefaults);
    controls.close.removeEventListener("click", closeDialog);
    browser.removeEventListener("storage", onStorage);
    clearVisualState(root);
    style.remove();
    controls.button.remove();
    controls.dialog.remove();
  };
}
function createStyle(doc) {
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.dataset.dshThinkingStatusCustomizer = "style";
  style.textContent = `
html[${ROOT_ATTRIBUTE}="enabled"] ${STATUS_SELECTOR} {
  animation: none !important;
  background: none !important;
  color: transparent !important;
  font-size: 0 !important;
  -webkit-text-fill-color: transparent !important;
}
html[${ROOT_ATTRIBUTE}="enabled"] ${STATUS_SELECTOR}::before {
  animation: dsh-thinking-status-customizer-flow 1.8s linear infinite;
  background: linear-gradient(
    90deg,
    var(${COLOR_A_PROPERTY}) 0%,
    var(${COLOR_A_PROPERTY}) 35%,
    var(${COLOR_B_PROPERTY}) 50%,
    var(${COLOR_A_PROPERTY}) 65%,
    var(${COLOR_A_PROPERTY}) 100%
  );
  background-clip: text;
  background-position: 100% 0;
  background-size: 250% 100%;
  color: transparent;
  content: var(${TEXT_PROPERTY});
  font: var(--dsw-font-s-strong-14);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
html[${ROOT_ATTRIBUTE}="enabled"] ${STATUS_SELECTOR} > span[aria-hidden="true"] {
  font: var(--dsw-font-xs-13);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
@keyframes dsh-thinking-status-customizer-flow {
  to { background-position: 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTRIBUTE}="enabled"] ${STATUS_SELECTOR}::before {
    animation: none;
    background-position: 0 0;
    background-size: 100% 100%;
  }
}
#${BUTTON_ID} {
  background: #161b22;
  border: 1px solid #4b5563;
  border-radius: 999px;
  bottom: 18px;
  color: #f9fafb;
  cursor: pointer;
  font: 14px/1.2 system-ui, sans-serif;
  padding: 10px 14px;
  position: fixed;
  right: 18px;
  z-index: 2147483647;
}
#${SETTINGS_ID} {
  background: #111827;
  border: 1px solid #4b5563;
  border-radius: 12px;
  bottom: 70px;
  box-shadow: 0 16px 48px rgb(0 0 0 / 35%);
  color: #f9fafb;
  font: 14px/1.4 system-ui, sans-serif;
  max-width: min(360px, calc(100vw - 32px));
  padding: 16px;
  position: fixed;
  right: 16px;
  width: 320px;
  z-index: 2147483647;
}
#${SETTINGS_ID} label { display: grid; gap: 5px; margin: 10px 0; }
#${SETTINGS_ID} input[type="text"], #${SETTINGS_ID} input[type="color"] { box-sizing: border-box; width: 100%; }
#${SETTINGS_ID} .dsh-thinking-status-customizer-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
#${SETTINGS_ID} button { cursor: pointer; }
#${SETTINGS_ID} [data-dsh-thinking-status-customizer-status] { min-height: 1.4em; }
`;
  return style;
}
function createControls(doc) {
  const button = doc.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.textContent = "\u601D\u8003\u72B6\u6001";
  button.setAttribute("aria-controls", SETTINGS_ID);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-label", "\u6253\u5F00\u601D\u8003\u72B6\u6001\u6837\u5F0F\u8BBE\u7F6E");
  const dialog = doc.createElement("section");
  dialog.id = SETTINGS_ID;
  dialog.hidden = true;
  dialog.setAttribute("aria-label", "\u601D\u8003\u72B6\u6001\u6837\u5F0F\u8BBE\u7F6E");
  dialog.setAttribute("role", "dialog");
  const title = doc.createElement("h2");
  title.textContent = "\u601D\u8003\u72B6\u6001\u6837\u5F0F";
  const compatibility = doc.createElement("p");
  compatibility.setAttribute("aria-live", "polite");
  compatibility.dataset.dshThinkingStatusCustomizerCompatibility = "";
  const form = doc.createElement("form");
  const enabled = doc.createElement("input");
  enabled.type = "checkbox";
  enabled.name = "enabled";
  const enabledLabel = labelFor(doc, enabled, "\u542F\u7528\u81EA\u5B9A\u4E49\u663E\u793A");
  const text = doc.createElement("input");
  text.type = "text";
  text.name = "text";
  text.required = true;
  text.setAttribute("aria-label", "\u66FF\u6362\u6587\u5B57");
  const textLabel = labelFor(doc, text, "\u66FF\u6362\u6587\u5B57\uFF08\u6700\u591A 80 \u4E2A\u5B57\u7B26\uFF09");
  const colorA = doc.createElement("input");
  colorA.type = "color";
  colorA.name = "colorA";
  colorA.setAttribute("aria-label", "\u4E3B\u989C\u8272");
  const colorALabel = labelFor(doc, colorA, "\u4E3B\u989C\u8272");
  const colorB = doc.createElement("input");
  colorB.type = "color";
  colorB.name = "colorB";
  colorB.setAttribute("aria-label", "\u5149\u6655\u548C\u6307\u793A\u70B9\u989C\u8272");
  const colorBLabel = labelFor(doc, colorB, "\u5149\u6655\u548C\u6307\u793A\u70B9\u989C\u8272");
  const actions = doc.createElement("div");
  actions.className = "dsh-thinking-status-customizer-actions";
  const save = doc.createElement("button");
  save.type = "submit";
  save.textContent = "\u4FDD\u5B58";
  const restore = doc.createElement("button");
  restore.type = "button";
  restore.textContent = "\u6062\u590D\u9ED8\u8BA4\u503C";
  const close = doc.createElement("button");
  close.type = "button";
  close.textContent = "\u5173\u95ED";
  actions.append(save, restore, close);
  const status = doc.createElement("p");
  status.setAttribute("aria-live", "polite");
  status.dataset.dshThinkingStatusCustomizerStatus = "";
  form.append(enabledLabel, textLabel, colorALabel, colorBLabel, actions, status);
  dialog.append(title, compatibility, form);
  return { button, dialog, form, enabled, text, colorA, colorB, restore, close, status, compatibility };
}
function labelFor(doc, input, text) {
  const label = doc.createElement("label");
  const id = `dsh-thinking-status-customizer-${input.name}`;
  input.id = id;
  label.htmlFor = id;
  label.append(text, input);
  return label;
}
function clearVisualState(root) {
  root.removeAttribute(ROOT_ATTRIBUTE);
  root.style.removeProperty(TEXT_PROPERTY);
  root.style.removeProperty(COLOR_A_PROPERTY);
  root.style.removeProperty(COLOR_B_PROPERTY);
}
function getStorage(browser) {
  try {
    return browser.localStorage;
  } catch {
    return void 0;
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
function isColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

return module.exports;
} });
