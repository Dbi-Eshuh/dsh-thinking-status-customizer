/** CSS-only browser customizer for the visible DSH thinking status. */

/** The only DSH status selector this plugin styles or queries. */
export const STATUS_SELECTOR = '[data-conversation-scroll] [role="status"][aria-live="polite"]'

/** Browser-local persistence key, intentionally separate from DSH data. */
export const STORAGE_KEY = 'dsh-thinking-status-customizer:v1'

/** Maximum Unicode code points allowed in the replacement label. */
export const MAX_TEXT_CODE_POINTS = 80

const ROOT_ATTRIBUTE = 'data-dsh-thinking-status-customizer'
const TEXT_PROPERTY = '--dsh-thinking-status-customizer-text'
const COLOR_A_PROPERTY = '--dsh-thinking-status-customizer-color-a'
const COLOR_B_PROPERTY = '--dsh-thinking-status-customizer-color-b'
const STYLE_ID = 'dsh-thinking-status-customizer-style'
const SETTINGS_ID = 'dsh-thinking-status-customizer-settings'
const BUTTON_ID = 'dsh-thinking-status-customizer-button'

/** User-controlled display settings. */
export interface Settings {
  enabled: boolean
  text: string
  colorA: string
  colorB: string
}

/** Result of validating a candidate settings object. */
export type SettingsValidation =
  | { ok: true; value: Settings }
  | { ok: false; message: string }

/** Minimal Cordis client Context used by this dependency-free plugin. */
export interface ClientEffectOwner {
  /** Register a cleanup-aware effect that ends with this client plugin. */
  effect(execute: () => () => void, label?: string): unknown
}

/** Defaults used when storage is missing, corrupted, or invalid. */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  enabled: true,
  text: '正在吃饭中...',
  colorA: '#7c3aed',
  colorB: '#22c55e',
})

/**
 * Escape text as one CSS string token for use in a custom property's `content`.
 * @param value - Validated replacement text.
 * @returns A quoted CSS string token that cannot terminate into CSS syntax.
 */
export function escapeCssString(value: string): string {
  let escaped = ''
  for (const character of value) {
    const codePoint = character.codePointAt(0)!
    if (character === '\\') escaped += '\\\\'
    else if (character === '"') escaped += '\\"'
    else if (codePoint === 0) escaped += '\\FFFD '
    else if (codePoint <= 0x1f || codePoint === 0x7f) escaped += `\\${codePoint.toString(16)} `
    else escaped += character
  }
  return `"${escaped}"`
}

/**
 * Validate settings entered through the dialog or read from localStorage.
 * @param value - Unknown candidate value.
 * @returns Normalized settings or a user-facing validation message.
 */
export function validateSettings(value: unknown): SettingsValidation {
  if (!isRecord(value)) return { ok: false, message: '设置数据不是对象。' }
  if (typeof value.enabled !== 'boolean') return { ok: false, message: '启用状态无效。' }
  if (typeof value.text !== 'string') return { ok: false, message: '状态文字无效。' }
  const text = value.text.trim()
  if (text.length === 0) return { ok: false, message: '状态文字不能为空。' }
  if (Array.from(text).length > MAX_TEXT_CODE_POINTS) {
    return { ok: false, message: `状态文字最多 ${MAX_TEXT_CODE_POINTS} 个 Unicode 字符。` }
  }
  if (!isColor(value.colorA) || !isColor(value.colorB)) {
    return { ok: false, message: '颜色必须是 #RRGGBB。' }
  }
  return {
    ok: true,
    value: { enabled: value.enabled, text, colorA: value.colorA, colorB: value.colorB },
  }
}

/**
 * Read browser-local settings without exposing storage failures to the page.
 * @param storage - The browser localStorage implementation.
 * @returns Valid saved settings, or defaults after a missing/corrupt value.
 */
export function loadSettings(storage: Storage | undefined): Settings {
  if (storage === undefined) return { ...DEFAULT_SETTINGS }
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { ...DEFAULT_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    const result = validateSettings(parsed)
    return result.ok ? result.value : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Apply the client customizer through one Cordis-owned effect.
 * @param ctx - Browser plugin context supplied by DSH.
 */
export function apply(ctx: ClientEffectOwner): void {
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    return mountThinkingStatusCustomizer(document)
  }, 'dsh-thinking-status-customizer: browser UI')
}

/**
 * Mount the settings UI and CSS replacement. Exported for package-local tests.
 * @param doc - The browser document receiving only plugin-owned nodes.
 * @returns A disposer that completely restores native visuals.
 */
export function mountThinkingStatusCustomizer(doc: Document): () => void {
  const browser = doc.defaultView
  if (browser === null) return () => {}

  const root = doc.documentElement
  const style = createStyle(doc)
  const controls = createControls(doc)
  const storage = getStorage(browser)
  let settings = loadSettings(storage)
  let disposed = false

  const applyVisualState = (next: Settings): void => {
    if (!next.enabled) {
      clearVisualState(root)
      return
    }
    root.setAttribute(ROOT_ATTRIBUTE, 'enabled')
    root.style.setProperty(TEXT_PROPERTY, escapeCssString(next.text))
    root.style.setProperty(COLOR_A_PROPERTY, next.colorA)
    root.style.setProperty(COLOR_B_PROPERTY, next.colorB)
  }

  const syncControls = (): void => {
    controls.enabled.checked = settings.enabled
    controls.text.value = settings.text
    controls.colorA.value = settings.colorA
    controls.colorB.value = settings.colorB
  }

  const updateCompatibilityStatus = (): void => {
    controls.compatibility.textContent = doc.querySelector(STATUS_SELECTOR) === null
      ? '等待 DSH 思考状态出现。'
      : '已检测到 DSH 思考状态。'
  }

  const persist = (): boolean => {
    if (storage === undefined) return false
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(settings))
      return true
    } catch {
      return false
    }
  }

  const save = (): void => {
    const result = validateSettings({
      enabled: controls.enabled.checked,
      text: controls.text.value,
      colorA: controls.colorA.value,
      colorB: controls.colorB.value,
    })
    if (!result.ok) {
      controls.status.textContent = result.message
      return
    }
    settings = result.value
    syncControls()
    applyVisualState(settings)
    controls.status.textContent = persist()
      ? '已保存并应用。'
      : '已应用；浏览器拒绝本地存储，刷新后会恢复默认值。'
  }

  const restoreDefaults = (): void => {
    settings = { ...DEFAULT_SETTINGS }
    syncControls()
    applyVisualState(settings)
    controls.status.textContent = persist()
      ? '已恢复默认值。'
      : '已恢复默认视觉；浏览器拒绝本地存储。'
  }

  const openDialog = (): void => {
    controls.dialog.hidden = false
    controls.button.setAttribute('aria-expanded', 'true')
    updateCompatibilityStatus()
    controls.text.focus()
  }

  const closeDialog = (): void => {
    controls.dialog.hidden = true
    controls.button.setAttribute('aria-expanded', 'false')
    controls.button.focus()
  }

  const onSubmit = (event: Event): void => {
    event.preventDefault()
    save()
  }
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    settings = loadSettings(storage)
    syncControls()
    applyVisualState(settings)
    controls.status.textContent = '已同步另一个标签页的设置。'
  }

  controls.button.addEventListener('click', openDialog)
  controls.form.addEventListener('submit', onSubmit)
  controls.restore.addEventListener('click', restoreDefaults)
  controls.close.addEventListener('click', closeDialog)
  browser.addEventListener('storage', onStorage)

  doc.head.append(style)
  doc.body.append(controls.button, controls.dialog)
  syncControls()
  applyVisualState(settings)
  updateCompatibilityStatus()

  return () => {
    if (disposed) return
    disposed = true
    controls.button.removeEventListener('click', openDialog)
    controls.form.removeEventListener('submit', onSubmit)
    controls.restore.removeEventListener('click', restoreDefaults)
    controls.close.removeEventListener('click', closeDialog)
    browser.removeEventListener('storage', onStorage)
    clearVisualState(root)
    style.remove()
    controls.button.remove()
    controls.dialog.remove()
  }
}

/** Build the exact-selector CSS and the settings chrome stylesheet. */
function createStyle(doc: Document): HTMLStyleElement {
  const style = doc.createElement('style')
  style.id = STYLE_ID
  style.dataset.dshThinkingStatusCustomizer = 'style'
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
`
  return style
}

/** Create the namespaced floating settings button and dialog. */
function createControls(doc: Document): Controls {
  const button = doc.createElement('button')
  button.id = BUTTON_ID
  button.type = 'button'
  button.textContent = '思考状态'
  button.setAttribute('aria-controls', SETTINGS_ID)
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-haspopup', 'dialog')
  button.setAttribute('aria-label', '打开思考状态样式设置')

  const dialog = doc.createElement('section')
  dialog.id = SETTINGS_ID
  dialog.hidden = true
  dialog.setAttribute('aria-label', '思考状态样式设置')
  dialog.setAttribute('role', 'dialog')

  const title = doc.createElement('h2')
  title.textContent = '思考状态样式'

  const compatibility = doc.createElement('p')
  compatibility.setAttribute('aria-live', 'polite')
  compatibility.dataset.dshThinkingStatusCustomizerCompatibility = ''

  const form = doc.createElement('form')
  const enabled = doc.createElement('input')
  enabled.type = 'checkbox'
  enabled.name = 'enabled'
  const enabledLabel = labelFor(doc, enabled, '启用自定义显示')

  const text = doc.createElement('input')
  text.type = 'text'
  text.name = 'text'
  text.required = true
  text.setAttribute('aria-label', '替换文字')
  const textLabel = labelFor(doc, text, '替换文字（最多 80 个字符）')

  const colorA = doc.createElement('input')
  colorA.type = 'color'
  colorA.name = 'colorA'
  colorA.setAttribute('aria-label', '流光颜色 A')
  const colorALabel = labelFor(doc, colorA, '流光颜色 A')

  const colorB = doc.createElement('input')
  colorB.type = 'color'
  colorB.name = 'colorB'
  colorB.setAttribute('aria-label', '流光颜色 B')
  const colorBLabel = labelFor(doc, colorB, '流光颜色 B')

  const actions = doc.createElement('div')
  actions.className = 'dsh-thinking-status-customizer-actions'
  const save = doc.createElement('button')
  save.type = 'submit'
  save.textContent = '保存'
  const restore = doc.createElement('button')
  restore.type = 'button'
  restore.textContent = '恢复默认值'
  const close = doc.createElement('button')
  close.type = 'button'
  close.textContent = '关闭'
  actions.append(save, restore, close)

  const status = doc.createElement('p')
  status.setAttribute('aria-live', 'polite')
  status.dataset.dshThinkingStatusCustomizerStatus = ''
  form.append(enabledLabel, textLabel, colorALabel, colorBLabel, actions, status)
  dialog.append(title, compatibility, form)
  return { button, dialog, form, enabled, text, colorA, colorB, restore, close, status, compatibility }
}

/** Associate a label with a new input while keeping unique namespaced ids. */
function labelFor(doc: Document, input: HTMLInputElement, text: string): HTMLLabelElement {
  const label = doc.createElement('label')
  const id = `dsh-thinking-status-customizer-${input.name}`
  input.id = id
  label.htmlFor = id
  label.append(text, input)
  return label
}

/** Remove every plugin-owned root visual marker. */
function clearVisualState(root: HTMLElement): void {
  root.removeAttribute(ROOT_ATTRIBUTE)
  root.style.removeProperty(TEXT_PROPERTY)
  root.style.removeProperty(COLOR_A_PROPERTY)
  root.style.removeProperty(COLOR_B_PROPERTY)
}

/** Read localStorage without letting browser privacy policy abort plugin loading. */
function getStorage(browser: Window): Storage | undefined {
  try {
    return browser.localStorage
  } catch {
    return undefined
  }
}

/** Narrow unknown values without using hostile-input dependencies. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Validate the exact web color notation this plugin persists. */
function isColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)
}

interface Controls {
  button: HTMLButtonElement
  dialog: HTMLElement
  form: HTMLFormElement
  enabled: HTMLInputElement
  text: HTMLInputElement
  colorA: HTMLInputElement
  colorB: HTMLInputElement
  restore: HTMLButtonElement
  close: HTMLButtonElement
  status: HTMLParagraphElement
  compatibility: HTMLParagraphElement
}
