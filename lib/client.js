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
    controls.colorAValue.textContent = settings.colorA.toUpperCase();
    controls.colorBValue.textContent = settings.colorB.toUpperCase();
    controls.preview.textContent = settings.text;
    controls.preview.style.setProperty(COLOR_A_PROPERTY, settings.colorA);
    controls.preview.style.setProperty(COLOR_B_PROPERTY, settings.colorB);
  };
  const updateCompatibilityStatus = () => {
    const matched = doc.querySelector(STATUS_SELECTOR) !== null;
    controls.compatibility.textContent = matched ? "\u5DF2\u8FDE\u63A5 DSH \u601D\u8003\u72B6\u6001" : "\u7B49\u5F85 DSH \u601D\u8003\u72B6\u6001\u51FA\u73B0";
    controls.compatibility.dataset.state = matched ? "matched" : "waiting";
  };
  const updateDraftPreview = () => {
    controls.preview.textContent = controls.text.value.trim() || settings.text;
    controls.preview.style.setProperty(COLOR_A_PROPERTY, controls.colorA.value);
    controls.preview.style.setProperty(COLOR_B_PROPERTY, controls.colorB.value);
    controls.colorAValue.textContent = controls.colorA.value.toUpperCase();
    controls.colorBValue.textContent = controls.colorB.value.toUpperCase();
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
  const onDialogKeydown = (event) => {
    if (event.key === "Escape") closeDialog();
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
  controls.text.addEventListener("input", updateDraftPreview);
  controls.colorA.addEventListener("input", updateDraftPreview);
  controls.colorB.addEventListener("input", updateDraftPreview);
  controls.restore.addEventListener("click", restoreDefaults);
  controls.close.addEventListener("click", closeDialog);
  controls.dialog.addEventListener("keydown", onDialogKeydown);
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
    controls.text.removeEventListener("input", updateDraftPreview);
    controls.colorA.removeEventListener("input", updateDraftPreview);
    controls.colorB.removeEventListener("input", updateDraftPreview);
    controls.restore.removeEventListener("click", restoreDefaults);
    controls.close.removeEventListener("click", closeDialog);
    controls.dialog.removeEventListener("keydown", onDialogKeydown);
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
  align-items: center;
  background: var(--dsw-alias-button-floating-fill);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 18px;
  bottom: 20px;
  box-shadow: var(--dsw-shadow-lv2);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  display: inline-flex;
  font: var(--dsw-font-s-14);
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  position: fixed;
  right: 20px;
  transition: background var(--ds-transition-duration-fast) var(--ds-ease-in-out),
    border-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),
    transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);
  z-index: 1100;
}
#${BUTTON_ID}:hover {
  background: var(--dsw-alias-button-floating-hover);
  transform: translateY(-1px);
}
#${BUTTON_ID}:focus-visible,
#${SETTINGS_ID} button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
#${BUTTON_ID} .dsh-thinking-status-customizer-trigger-dot {
  background: var(--dsw-alias-state-business-primary);
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--dsw-alias-state-business-tertiary);
  height: 7px;
  width: 7px;
}
#${SETTINGS_ID} {
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-inverted);
  border-radius: 24px;
  bottom: 68px;
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  max-height: calc(100vh - 92px);
  max-width: calc(100vw - 32px);
  overflow: auto;
  position: fixed;
  right: 20px;
  width: 380px;
  z-index: 1100;
}
#${SETTINGS_ID}[hidden] { display: none; }
#${SETTINGS_ID} * { box-sizing: border-box; }
#${SETTINGS_ID} .dsh-thinking-status-customizer-header {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 20px 16px 12px 24px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-heading { min-width: 0; }
#${SETTINGS_ID} h2 {
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-base-strong-16);
  margin: 0;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-compatibility {
  align-items: center;
  color: var(--dsw-alias-label-tertiary);
  display: flex;
  font: var(--dsw-font-xxs-12);
  gap: 6px;
  margin: 4px 0 0;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-compatibility::before {
  background: var(--dsw-alias-label-caption);
  border-radius: 50%;
  content: '';
  flex: none;
  height: 6px;
  width: 6px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-compatibility[data-state='matched']::before {
  background: var(--dsw-alias-state-success-primary);
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-icon-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  display: inline-flex;
  flex: none;
  font: 20px/1 var(--dsw-font-family);
  height: 28px;
  justify-content: center;
  padding: 0;
  width: 28px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-icon-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
#${SETTINGS_ID} form { margin: 0; }
#${SETTINGS_ID} .dsh-thinking-status-customizer-body {
  display: grid;
  gap: 18px;
  padding: 0 24px 18px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-preview-card {
  background: var(--dsw-specific-tip);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  display: grid;
  gap: 5px;
  padding: 12px 14px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-eyebrow {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-strong-11);
  letter-spacing: .04em;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-preview {
  animation: dsh-thinking-status-customizer-flow 1.8s linear infinite;
  background: linear-gradient(90deg, var(${COLOR_A_PROPERTY}) 0%, var(${COLOR_A_PROPERTY}) 35%, var(${COLOR_B_PROPERTY}) 50%, var(${COLOR_A_PROPERTY}) 65%, var(${COLOR_A_PROPERTY}) 100%);
  background-clip: text;
  background-position: 100% 0;
  background-size: 250% 100%;
  color: transparent;
  font: var(--dsw-font-s-strong-14);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-toggle-row {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-toggle-copy { display: grid; gap: 2px; }
#${SETTINGS_ID} .dsh-thinking-status-customizer-label-title {
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-s-strong-14);
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-hint {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxs-12);
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-switch-input {
  height: 1px;
  opacity: 0;
  position: absolute;
  width: 1px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-switch {
  background: var(--dsw-alias-button-primary-dimmed);
  border-radius: 10px;
  flex: none;
  height: 20px;
  padding: 2px;
  transition: background var(--ds-transition-duration-fast) var(--ds-ease-in-out);
  width: 36px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-switch::after {
  background: var(--dsw-alias-button-elevated-fill);
  border-radius: 50%;
  box-shadow: var(--dsw-shadow-lv1);
  content: '';
  display: block;
  height: 16px;
  transform: translateX(0);
  transition: transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);
  width: 16px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-switch-input:checked + .dsh-thinking-status-customizer-switch {
  background: var(--dsw-alias-state-business-primary);
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-switch-input:checked + .dsh-thinking-status-customizer-switch::after { transform: translateX(16px); }
#${SETTINGS_ID} .dsh-thinking-status-customizer-switch-input:focus-visible + .dsh-thinking-status-customizer-switch {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-field { display: grid; gap: 7px; }
#${SETTINGS_ID} .dsh-thinking-status-customizer-text-input {
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-s-14);
  height: 38px;
  outline: none;
  padding: 0 12px;
  width: 100%;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-text-input:focus { border-color: var(--dsw-alias-brand-primary); }
#${SETTINGS_ID} .dsh-thinking-status-customizer-color-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr 1fr;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-color-control {
  align-items: center;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  display: flex;
  gap: 9px;
  height: 38px;
  padding: 5px 9px 5px 6px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-color-control:focus-within { border-color: var(--dsw-alias-brand-primary); }
#${SETTINGS_ID} input[type='color'] {
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  height: 26px;
  padding: 0;
  width: 30px;
}
#${SETTINGS_ID} input[type='color']::-webkit-color-swatch-wrapper { padding: 0; }
#${SETTINGS_ID} input[type='color']::-webkit-color-swatch { border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; }
#${SETTINGS_ID} .dsh-thinking-status-customizer-color-value {
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
  font-variant-numeric: tabular-nums;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-status {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxs-12);
  margin: -6px 24px 10px;
  min-height: 18px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-actions {
  align-items: center;
  border-top: 1px solid var(--dsw-alias-border-l1);
  display: flex;
  justify-content: space-between;
  padding: 14px 24px 18px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-action {
  align-items: center;
  border: 0;
  border-radius: 18px;
  cursor: pointer;
  display: inline-flex;
  font: var(--dsw-font-s-14);
  height: 36px;
  justify-content: center;
  padding: 0 14px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-action-secondary { background: transparent; color: var(--dsw-alias-label-secondary); }
#${SETTINGS_ID} .dsh-thinking-status-customizer-action-secondary:hover { background: var(--dsw-alias-interactive-bg-hover); }
#${SETTINGS_ID} .dsh-thinking-status-customizer-action-primary {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
  min-width: 76px;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-action-primary:hover { background: var(--dsw-alias-button-primary-hover); }
@media (max-width: 480px) {
  #${BUTTON_ID} { bottom: 12px; right: 12px; }
  #${SETTINGS_ID} { bottom: 60px; left: 12px; max-height: calc(100vh - 76px); max-width: none; right: 12px; width: auto; }
  #${SETTINGS_ID} .dsh-thinking-status-customizer-color-grid { grid-template-columns: 1fr; }
}
`;
  return style;
}
function createControls(doc) {
  const button = doc.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.setAttribute("aria-controls", SETTINGS_ID);
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-label", "\u6253\u5F00\u601D\u8003\u72B6\u6001\u6837\u5F0F\u8BBE\u7F6E");
  const triggerDot = doc.createElement("span");
  triggerDot.className = "dsh-thinking-status-customizer-trigger-dot";
  triggerDot.setAttribute("aria-hidden", "true");
  const triggerText = doc.createElement("span");
  triggerText.textContent = "\u601D\u8003\u72B6\u6001";
  button.append(triggerDot, triggerText);
  const dialog = doc.createElement("section");
  dialog.id = SETTINGS_ID;
  dialog.hidden = true;
  dialog.setAttribute("aria-label", "\u601D\u8003\u72B6\u6001\u6837\u5F0F\u8BBE\u7F6E");
  dialog.setAttribute("role", "dialog");
  const header = doc.createElement("header");
  header.className = "dsh-thinking-status-customizer-header";
  const heading = doc.createElement("div");
  heading.className = "dsh-thinking-status-customizer-heading";
  const title = doc.createElement("h2");
  title.textContent = "\u601D\u8003\u72B6\u6001\u6837\u5F0F";
  const compatibility = doc.createElement("p");
  compatibility.className = "dsh-thinking-status-customizer-compatibility";
  compatibility.setAttribute("aria-live", "polite");
  compatibility.dataset.dshThinkingStatusCustomizerCompatibility = "";
  const close = doc.createElement("button");
  close.type = "button";
  close.className = "dsh-thinking-status-customizer-icon-button";
  close.textContent = "\xD7";
  close.setAttribute("aria-label", "\u5173\u95ED\u601D\u8003\u72B6\u6001\u8BBE\u7F6E");
  heading.append(title, compatibility);
  header.append(heading, close);
  const form = doc.createElement("form");
  const body = doc.createElement("div");
  body.className = "dsh-thinking-status-customizer-body";
  const previewCard = doc.createElement("div");
  previewCard.className = "dsh-thinking-status-customizer-preview-card";
  const previewLabel = doc.createElement("span");
  previewLabel.className = "dsh-thinking-status-customizer-eyebrow";
  previewLabel.textContent = "\u5B9E\u65F6\u9884\u89C8";
  const preview = doc.createElement("span");
  preview.className = "dsh-thinking-status-customizer-preview";
  previewCard.append(previewLabel, preview);
  const enabled = doc.createElement("input");
  enabled.type = "checkbox";
  enabled.name = "enabled";
  enabled.id = "dsh-thinking-status-customizer-enabled";
  enabled.className = "dsh-thinking-status-customizer-switch-input";
  const enabledLabel = doc.createElement("label");
  enabledLabel.className = "dsh-thinking-status-customizer-toggle-row";
  enabledLabel.htmlFor = enabled.id;
  const enabledCopy = doc.createElement("span");
  enabledCopy.className = "dsh-thinking-status-customizer-toggle-copy";
  const enabledTitle = doc.createElement("span");
  enabledTitle.className = "dsh-thinking-status-customizer-label-title";
  enabledTitle.textContent = "\u542F\u7528\u81EA\u5B9A\u4E49\u663E\u793A";
  const enabledHint = doc.createElement("span");
  enabledHint.className = "dsh-thinking-status-customizer-hint";
  enabledHint.textContent = "\u4FDD\u5B58\u540E\u6062\u590D DSH \u5185\u7F6E\u72B6\u6001\u6587\u5B57";
  const enabledSwitch = doc.createElement("span");
  enabledSwitch.className = "dsh-thinking-status-customizer-switch";
  enabledSwitch.setAttribute("aria-hidden", "true");
  enabledCopy.append(enabledTitle, enabledHint);
  enabledLabel.append(enabledCopy, enabled, enabledSwitch);
  const text = doc.createElement("input");
  text.type = "text";
  text.name = "text";
  text.required = true;
  text.className = "dsh-thinking-status-customizer-text-input";
  text.setAttribute("aria-label", "\u66FF\u6362\u6587\u5B57");
  const textLabel = labelFor(doc, text, "");
  textLabel.className = "dsh-thinking-status-customizer-field";
  const textTitle = doc.createElement("span");
  textTitle.className = "dsh-thinking-status-customizer-label-title";
  textTitle.textContent = "\u66FF\u6362\u6587\u5B57";
  const textHint = doc.createElement("span");
  textHint.className = "dsh-thinking-status-customizer-hint";
  textHint.textContent = `\u6700\u591A ${MAX_TEXT_CODE_POINTS} \u4E2A\u5B57\u7B26`;
  textLabel.prepend(textTitle, textHint);
  const colorA = doc.createElement("input");
  colorA.type = "color";
  colorA.name = "colorA";
  colorA.setAttribute("aria-label", "\u6D41\u5149\u989C\u8272 A");
  const colorALabel = labelFor(doc, colorA, "");
  colorALabel.className = "dsh-thinking-status-customizer-field";
  const colorATitle = doc.createElement("span");
  colorATitle.className = "dsh-thinking-status-customizer-label-title";
  colorATitle.textContent = "\u6D41\u5149\u989C\u8272 A";
  const colorAControl = doc.createElement("span");
  colorAControl.className = "dsh-thinking-status-customizer-color-control";
  const colorAValue = doc.createElement("span");
  colorAValue.className = "dsh-thinking-status-customizer-color-value";
  colorAControl.append(colorA, colorAValue);
  colorALabel.prepend(colorATitle);
  colorALabel.append(colorAControl);
  const colorB = doc.createElement("input");
  colorB.type = "color";
  colorB.name = "colorB";
  colorB.setAttribute("aria-label", "\u6D41\u5149\u989C\u8272 B");
  const colorBLabel = labelFor(doc, colorB, "");
  colorBLabel.className = "dsh-thinking-status-customizer-field";
  const colorBTitle = doc.createElement("span");
  colorBTitle.className = "dsh-thinking-status-customizer-label-title";
  colorBTitle.textContent = "\u6D41\u5149\u989C\u8272 B";
  const colorBControl = doc.createElement("span");
  colorBControl.className = "dsh-thinking-status-customizer-color-control";
  const colorBValue = doc.createElement("span");
  colorBValue.className = "dsh-thinking-status-customizer-color-value";
  colorBControl.append(colorB, colorBValue);
  colorBLabel.prepend(colorBTitle);
  colorBLabel.append(colorBControl);
  const colorGrid = doc.createElement("div");
  colorGrid.className = "dsh-thinking-status-customizer-color-grid";
  colorGrid.append(colorALabel, colorBLabel);
  const actions = doc.createElement("div");
  actions.className = "dsh-thinking-status-customizer-actions";
  const save = doc.createElement("button");
  save.type = "submit";
  save.textContent = "\u4FDD\u5B58\u8BBE\u7F6E";
  save.className = "dsh-thinking-status-customizer-action dsh-thinking-status-customizer-action-primary";
  const restore = doc.createElement("button");
  restore.type = "button";
  restore.textContent = "\u6062\u590D\u9ED8\u8BA4\u503C";
  restore.className = "dsh-thinking-status-customizer-action dsh-thinking-status-customizer-action-secondary";
  actions.append(restore, save);
  const status = doc.createElement("p");
  status.className = "dsh-thinking-status-customizer-status";
  status.setAttribute("aria-live", "polite");
  status.dataset.dshThinkingStatusCustomizerStatus = "";
  body.append(previewCard, enabledLabel, textLabel, colorGrid);
  form.append(body, status, actions);
  dialog.append(header, form);
  return {
    button,
    dialog,
    form,
    enabled,
    text,
    colorA,
    colorB,
    colorAValue,
    colorBValue,
    preview,
    restore,
    close,
    status,
    compatibility
  };
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
