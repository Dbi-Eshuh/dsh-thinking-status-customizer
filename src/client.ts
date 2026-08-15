/** CSS-only browser customizer for the visible DSH thinking status. */

import builtinAnimationUrl from '../assets/animations/dance-reference-transparent.gif'

/** The only DSH status selector this plugin styles or queries. */
export const STATUS_SELECTOR = '[data-conversation-scroll] [role="status"][aria-live="polite"]'

/** Browser-local persistence key, intentionally separate from DSH data. */
export const STORAGE_KEY = 'dsh-thinking-status-customizer:v1'

/** Maximum Unicode code points allowed in the replacement label. */
export const MAX_TEXT_CODE_POINTS = 80

/** Largest local animation accepted by the browser settings panel. */
export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024

/** Files above this size use a temporary object URL instead of localStorage. */
export const MAX_PERSISTED_IMAGE_FILE_BYTES = 2 * 1024 * 1024

/** Maximum Data URL length accepted for CSS and browser-local persistence. */
export const MAX_IMAGE_DATA_URL_CHARS = 3 * 1024 * 1024

/** Persisted token for the animation bundled into the client module. */
export const BUILTIN_IMAGE_SOURCE = 'builtin:dance-reference-transparent'

const LEGACY_BUILTIN_IMAGE_SOURCE = 'builtin:shigure-ui-dance-pixel-v4-hybrid-144f'

const ROOT_ATTRIBUTE = 'data-dsh-thinking-status-customizer'
const TEXT_PROPERTY = '--dsh-thinking-status-customizer-text'
const COLOR_A_PROPERTY = '--dsh-thinking-status-customizer-color-a'
const COLOR_B_PROPERTY = '--dsh-thinking-status-customizer-color-b'
const IMAGE_PROPERTY = '--dsh-thinking-status-customizer-image'
const IMAGE_SIZE_PROPERTY = '--dsh-thinking-status-customizer-image-size'
const MODE_ATTRIBUTE = 'data-dsh-thinking-status-customizer-mode'
const STYLE_ID = 'dsh-thinking-status-customizer-style'
const SETTINGS_ID = 'dsh-thinking-status-customizer-settings'
const BUTTON_ID = 'dsh-thinking-status-customizer-button'

/** User-controlled display settings. */
export interface Settings {
  enabled: boolean
  mode: 'text' | 'image' | 'image-text'
  text: string
  colorA: string
  colorB: string
  imageSource: string
  imageSize: number
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
  mode: 'text',
  text: '正在吃饭中...',
  colorA: '#7c3aed',
  colorB: '#22c55e',
  imageSource: BUILTIN_IMAGE_SOURCE,
  imageSize: 48,
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

/** Convert a validated image source to one CSS `url()` token. */
export function imageSourceToCssUrl(source: string): string {
  const resolved = source === BUILTIN_IMAGE_SOURCE ? builtinAnimationUrl : source
  return `url(${escapeCssString(resolved)})`
}

/**
 * Validate settings entered through the dialog or read from localStorage.
 * @param value - Unknown candidate value.
 * @returns Normalized settings or a user-facing validation message.
 */
export function validateSettings(value: unknown): SettingsValidation {
  if (!isRecord(value)) return { ok: false, message: '设置数据不是对象。' }
  if (typeof value.enabled !== 'boolean') return { ok: false, message: '启用状态无效。' }
  const mode = value.mode === undefined ? DEFAULT_SETTINGS.mode : value.mode
  if (mode !== 'text' && mode !== 'image' && mode !== 'image-text') {
    return { ok: false, message: '显示模式无效。' }
  }
  if (typeof value.text !== 'string') return { ok: false, message: '状态文字无效。' }
  const text = value.text.trim()
  if (text.length === 0) return { ok: false, message: '状态文字不能为空。' }
  if (Array.from(text).length > MAX_TEXT_CODE_POINTS) {
    return { ok: false, message: `状态文字最多 ${MAX_TEXT_CODE_POINTS} 个 Unicode 字符。` }
  }
  if (!isColor(value.colorA) || !isColor(value.colorB)) {
    return { ok: false, message: '颜色必须是 #RRGGBB。' }
  }
  const savedImageSource = value.imageSource === undefined ? DEFAULT_SETTINGS.imageSource : value.imageSource
  const imageSource = savedImageSource === LEGACY_BUILTIN_IMAGE_SOURCE ? BUILTIN_IMAGE_SOURCE : savedImageSource
  if (!isImageSource(imageSource)) {
    return { ok: false, message: isOversizedImageDataUrl(imageSource)
      ? 'Data URL 太大，请改用本地文件上传；大文件会使用临时对象 URL。'
      : '图片必须使用内置动画、HTTPS 地址或 GIF/APNG/WebP Data URL。' }
  }
  const imageSize = value.imageSize === undefined ? DEFAULT_SETTINGS.imageSize : value.imageSize
  if (typeof imageSize !== 'number' || !Number.isInteger(imageSize) || imageSize < 24 || imageSize > 96) {
    return { ok: false, message: '图片尺寸必须是 24 到 96 像素的整数。' }
  }
  return {
    ok: true,
    value: { enabled: value.enabled, mode, text, colorA: value.colorA, colorB: value.colorB, imageSource, imageSize },
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
  let temporaryImageUrl: string | undefined
  let disposed = false

  const applyVisualState = (next: Settings): void => {
    if (!next.enabled) {
      clearVisualState(root)
      return
    }
    root.setAttribute(ROOT_ATTRIBUTE, 'enabled')
    root.setAttribute(MODE_ATTRIBUTE, next.mode)
    root.style.setProperty(TEXT_PROPERTY, escapeCssString(next.text))
    root.style.setProperty(COLOR_A_PROPERTY, next.colorA)
    root.style.setProperty(COLOR_B_PROPERTY, next.colorB)
    root.style.setProperty(IMAGE_PROPERTY, imageSourceToCssUrl(next.imageSource))
    root.style.setProperty(IMAGE_SIZE_PROPERTY, `${next.imageSize}px`)
  }

  const syncControls = (): void => {
    controls.enabled.checked = settings.enabled
    controls.mode.value = settings.mode
    controls.text.value = settings.text
    controls.colorA.value = settings.colorA
    controls.colorB.value = settings.colorB
    controls.colorAValue.textContent = settings.colorA.toUpperCase()
    controls.colorBValue.textContent = settings.colorB.toUpperCase()
    controls.imageSource.value = settings.imageSource
    controls.imageSize.value = String(settings.imageSize)
    syncModeFields(controls, settings.mode)
    renderPreview(controls, settings)
  }

  const updateCompatibilityStatus = (): void => {
    const matched = doc.querySelector(STATUS_SELECTOR) !== null
    controls.compatibility.textContent = matched ? '已连接 DSH 思考状态' : '等待 DSH 思考状态出现'
    controls.compatibility.dataset.state = matched ? 'matched' : 'waiting'
  }

  const updateDraftPreview = (): void => {
    const mode = parseMode(controls.mode.value)
    syncModeFields(controls, mode)
    renderPreview(controls, {
      enabled: controls.enabled.checked,
      mode,
      text: controls.text.value.trim() || settings.text,
      colorA: controls.colorA.value,
      colorB: controls.colorB.value,
      imageSource: isImageSource(controls.imageSource.value) ? controls.imageSource.value : settings.imageSource,
      imageSize: Number.parseInt(controls.imageSize.value, 10) || settings.imageSize,
    })
    controls.colorAValue.textContent = controls.colorA.value.toUpperCase()
    controls.colorBValue.textContent = controls.colorB.value.toUpperCase()
  }

  const persist = (): boolean => {
    if (isTemporaryImageSource(settings.imageSource)) return false
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
      mode: controls.mode.value,
      text: controls.text.value,
      colorA: controls.colorA.value,
      colorB: controls.colorB.value,
      imageSource: controls.imageSource.value,
      imageSize: Number(controls.imageSize.value),
    })
    if (!result.ok) {
      controls.status.textContent = result.message
      return
    }
    settings = result.value
    syncControls()
    applyVisualState(settings)
    controls.status.textContent = isTemporaryImageSource(settings.imageSource)
      ? '已应用；大文件仅在当前标签页有效，刷新后需要重新选择。'
      : persist()
        ? '已保存并应用。'
        : '已应用；浏览器拒绝本地存储，刷新后会恢复默认值。'
  }

  const restoreDefaults = (): void => {
    if (temporaryImageUrl !== undefined) {
      browser.URL.revokeObjectURL(temporaryImageUrl)
      temporaryImageUrl = undefined
    }
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
    controls.button.setAttribute('aria-label', '关闭思考状态样式设置')
    updateCompatibilityStatus()
    controls.text.focus()
  }

  const closeDialog = (): void => {
    controls.dialog.hidden = true
    controls.button.setAttribute('aria-expanded', 'false')
    controls.button.setAttribute('aria-label', '打开思考状态样式设置')
    controls.button.focus()
  }

  const toggleDialog = (): void => {
    if (controls.dialog.hidden) openDialog()
    else closeDialog()
  }

  const onSubmit = (event: Event): void => {
    event.preventDefault()
    save()
  }
  const onDialogKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') closeDialog()
  }
  const onStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    if (temporaryImageUrl !== undefined) {
      browser.URL.revokeObjectURL(temporaryImageUrl)
      temporaryImageUrl = undefined
    }
    settings = loadSettings(storage)
    syncControls()
    applyVisualState(settings)
    controls.status.textContent = '已同步另一个标签页的设置。'
  }
  const onImageFile = (): void => {
    const file = controls.imageFile.files?.[0]
    if (file === undefined) return
    if (!['image/gif', 'image/png', 'image/webp', 'image/apng'].includes(file.type)) {
      controls.status.textContent = '请选择 GIF、APNG 或 WebP 图片。'
      controls.imageFile.value = ''
      return
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      controls.status.textContent = `图片不能超过 ${MAX_IMAGE_FILE_BYTES / 1024 / 1024} MB。`
      controls.imageFile.value = ''
      return
    }
    if (temporaryImageUrl !== undefined) browser.URL.revokeObjectURL(temporaryImageUrl)
    if (file.size > MAX_PERSISTED_IMAGE_FILE_BYTES) {
      temporaryImageUrl = browser.URL.createObjectURL(file)
      controls.imageSource.value = temporaryImageUrl
      updateDraftPreview()
      controls.status.textContent = '大文件已载入；保存后仅在当前标签页有效，不会写入 localStorage。'
      return
    }
    const reader = new browser.FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return
      controls.imageSource.value = reader.result
      updateDraftPreview()
      controls.status.textContent = '图片已载入；保存设置后生效。'
    }, { once: true })
    reader.addEventListener('error', () => {
      controls.status.textContent = '无法读取所选图片。'
    }, { once: true })
    reader.readAsDataURL(file)
  }
  const onImageSourceInput = (): void => {
    if (isOversizedImageDataUrl(controls.imageSource.value)) {
      controls.status.textContent = 'Data URL 太大，请改用本地文件上传；大文件会使用临时对象 URL。'
    }
    updateDraftPreview()
  }

  controls.button.addEventListener('click', toggleDialog)
  controls.form.addEventListener('submit', onSubmit)
  controls.text.addEventListener('input', updateDraftPreview)
  controls.mode.addEventListener('change', updateDraftPreview)
  controls.imageSource.addEventListener('input', onImageSourceInput)
  controls.imageSize.addEventListener('input', updateDraftPreview)
  controls.imageFile.addEventListener('change', onImageFile)
  controls.colorA.addEventListener('input', updateDraftPreview)
  controls.colorB.addEventListener('input', updateDraftPreview)
  controls.restore.addEventListener('click', restoreDefaults)
  controls.close.addEventListener('click', closeDialog)
  controls.dialog.addEventListener('keydown', onDialogKeydown)
  browser.addEventListener('storage', onStorage)

  doc.head.append(style)
  doc.body.append(controls.button, controls.dialog)
  syncControls()
  applyVisualState(settings)
  updateCompatibilityStatus()

  return () => {
    if (disposed) return
    disposed = true
    controls.button.removeEventListener('click', toggleDialog)
    controls.form.removeEventListener('submit', onSubmit)
    controls.text.removeEventListener('input', updateDraftPreview)
    controls.mode.removeEventListener('change', updateDraftPreview)
    controls.imageSource.removeEventListener('input', onImageSourceInput)
    controls.imageSize.removeEventListener('input', updateDraftPreview)
    controls.imageFile.removeEventListener('change', onImageFile)
    controls.colorA.removeEventListener('input', updateDraftPreview)
    controls.colorB.removeEventListener('input', updateDraftPreview)
    controls.restore.removeEventListener('click', restoreDefaults)
    controls.close.removeEventListener('click', closeDialog)
    controls.dialog.removeEventListener('keydown', onDialogKeydown)
    browser.removeEventListener('storage', onStorage)
    if (temporaryImageUrl !== undefined) browser.URL.revokeObjectURL(temporaryImageUrl)
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
html[${ROOT_ATTRIBUTE}="enabled"][${MODE_ATTRIBUTE}="text"] ${STATUS_SELECTOR}::before {
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
html[${ROOT_ATTRIBUTE}="enabled"][${MODE_ATTRIBUTE}="image"] ${STATUS_SELECTOR}::before {
  background-image: var(${IMAGE_PROPERTY});
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  content: '';
  display: inline-block;
  height: var(${IMAGE_SIZE_PROPERTY});
  image-rendering: auto;
  vertical-align: middle;
  width: var(${IMAGE_SIZE_PROPERTY});
}
html[${ROOT_ATTRIBUTE}="enabled"][${MODE_ATTRIBUTE}="image-text"] ${STATUS_SELECTOR}::before {
  align-items: center;
  animation: dsh-thinking-status-customizer-image-text-flow 1.8s linear infinite;
  background-clip: border-box, text;
  background-image: var(${IMAGE_PROPERTY}), linear-gradient(
    90deg,
    var(${COLOR_A_PROPERTY}) 0%,
    var(${COLOR_A_PROPERTY}) 35%,
    var(${COLOR_B_PROPERTY}) 50%,
    var(${COLOR_A_PROPERTY}) 65%,
    var(${COLOR_A_PROPERTY}) 100%
  );
  background-position: left center, 100% 0;
  background-repeat: no-repeat, no-repeat;
  background-size: var(${IMAGE_SIZE_PROPERTY}) var(${IMAGE_SIZE_PROPERTY}), 250% 100%;
  color: transparent;
  content: var(${TEXT_PROPERTY});
  display: inline-flex;
  font: var(--dsw-font-s-strong-14);
  height: var(${IMAGE_SIZE_PROPERTY});
  image-rendering: auto;
  padding-left: calc(var(${IMAGE_SIZE_PROPERTY}) + 6px);
  vertical-align: middle;
  -webkit-background-clip: border-box, text;
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
@keyframes dsh-thinking-status-customizer-image-text-flow {
  to { background-position: left center, 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTRIBUTE}="enabled"][${MODE_ATTRIBUTE}="text"] ${STATUS_SELECTOR}::before {
    animation: none;
    background-position: 0 0;
    background-size: 100% 100%;
  }
  html[${ROOT_ATTRIBUTE}="enabled"][${MODE_ATTRIBUTE}="image-text"] ${STATUS_SELECTOR}::before {
    animation: none;
    background-position: left center, 0 0;
    background-size: var(${IMAGE_SIZE_PROPERTY}) var(${IMAGE_SIZE_PROPERTY}), 100% 100%;
  }
  #${SETTINGS_ID} .dsh-thinking-status-customizer-preview[data-mode='image-text']::before {
    animation: none;
    background-position: left center, 0 0;
    background-size: var(${IMAGE_SIZE_PROPERTY}) var(${IMAGE_SIZE_PROPERTY}), 100% 100%;
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
#${SETTINGS_ID} .dsh-thinking-status-customizer-preview[data-mode='image'] {
  animation: none;
  background-clip: border-box;
  background-image: var(${IMAGE_PROPERTY});
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  display: block;
  height: var(${IMAGE_SIZE_PROPERTY});
  image-rendering: auto;
  width: var(${IMAGE_SIZE_PROPERTY});
  -webkit-text-fill-color: initial;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-preview[data-mode='image-text'] {
  animation: none;
  background: none;
  color: inherit;
  overflow: visible;
  -webkit-text-fill-color: initial;
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-preview[data-mode='image-text']::before {
  align-items: center;
  animation: dsh-thinking-status-customizer-image-text-flow 1.8s linear infinite;
  background-clip: border-box, text;
  background-image: var(${IMAGE_PROPERTY}), linear-gradient(90deg, var(${COLOR_A_PROPERTY}) 0%, var(${COLOR_A_PROPERTY}) 35%, var(${COLOR_B_PROPERTY}) 50%, var(${COLOR_A_PROPERTY}) 65%, var(${COLOR_A_PROPERTY}) 100%);
  background-position: left center, 100% 0;
  background-repeat: no-repeat, no-repeat;
  background-size: var(${IMAGE_SIZE_PROPERTY}) var(${IMAGE_SIZE_PROPERTY}), 250% 100%;
  color: transparent;
  content: var(${TEXT_PROPERTY});
  display: inline-flex;
  font: var(--dsw-font-s-strong-14);
  height: var(${IMAGE_SIZE_PROPERTY});
  image-rendering: auto;
  padding-left: calc(var(${IMAGE_SIZE_PROPERTY}) + 6px);
  -webkit-background-clip: border-box, text;
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
#${SETTINGS_ID} .dsh-thinking-status-customizer-field[hidden] { display: none; }
#${SETTINGS_ID} select,
#${SETTINGS_ID} input[type='url'],
#${SETTINGS_ID} input[type='number'],
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
#${SETTINGS_ID} input[type='file'] {
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
  max-width: 100%;
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
`
  return style
}

/** Create the namespaced floating settings button and dialog. */
function createControls(doc: Document): Controls {
  const button = doc.createElement('button')
  button.id = BUTTON_ID
  button.type = 'button'
  button.setAttribute('aria-controls', SETTINGS_ID)
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-haspopup', 'dialog')
  button.setAttribute('aria-label', '打开思考状态样式设置')
  const triggerDot = doc.createElement('span')
  triggerDot.className = 'dsh-thinking-status-customizer-trigger-dot'
  triggerDot.setAttribute('aria-hidden', 'true')
  const triggerText = doc.createElement('span')
  triggerText.textContent = '思考状态'
  button.append(triggerDot, triggerText)

  const dialog = doc.createElement('section')
  dialog.id = SETTINGS_ID
  dialog.hidden = true
  dialog.setAttribute('aria-label', '思考状态样式设置')
  dialog.setAttribute('role', 'dialog')

  const header = doc.createElement('header')
  header.className = 'dsh-thinking-status-customizer-header'
  const heading = doc.createElement('div')
  heading.className = 'dsh-thinking-status-customizer-heading'
  const title = doc.createElement('h2')
  title.textContent = '思考状态样式'

  const compatibility = doc.createElement('p')
  compatibility.className = 'dsh-thinking-status-customizer-compatibility'
  compatibility.setAttribute('aria-live', 'polite')
  compatibility.dataset.dshThinkingStatusCustomizerCompatibility = ''

  const close = doc.createElement('button')
  close.type = 'button'
  close.className = 'dsh-thinking-status-customizer-icon-button'
  close.textContent = '×'
  close.setAttribute('aria-label', '关闭思考状态设置')
  heading.append(title, compatibility)
  header.append(heading, close)

  const form = doc.createElement('form')
  const body = doc.createElement('div')
  body.className = 'dsh-thinking-status-customizer-body'

  const previewCard = doc.createElement('div')
  previewCard.className = 'dsh-thinking-status-customizer-preview-card'
  const previewLabel = doc.createElement('span')
  previewLabel.className = 'dsh-thinking-status-customizer-eyebrow'
  previewLabel.textContent = '实时预览'
  const preview = doc.createElement('span')
  preview.className = 'dsh-thinking-status-customizer-preview'
  previewCard.append(previewLabel, preview)

  const enabled = doc.createElement('input')
  enabled.type = 'checkbox'
  enabled.name = 'enabled'
  enabled.id = 'dsh-thinking-status-customizer-enabled'
  enabled.className = 'dsh-thinking-status-customizer-switch-input'
  const enabledLabel = doc.createElement('label')
  enabledLabel.className = 'dsh-thinking-status-customizer-toggle-row'
  enabledLabel.htmlFor = enabled.id
  const enabledCopy = doc.createElement('span')
  enabledCopy.className = 'dsh-thinking-status-customizer-toggle-copy'
  const enabledTitle = doc.createElement('span')
  enabledTitle.className = 'dsh-thinking-status-customizer-label-title'
  enabledTitle.textContent = '启用自定义显示'
  const enabledHint = doc.createElement('span')
  enabledHint.className = 'dsh-thinking-status-customizer-hint'
  enabledHint.textContent = '保存后恢复 DSH 内置状态文字'
  const enabledSwitch = doc.createElement('span')
  enabledSwitch.className = 'dsh-thinking-status-customizer-switch'
  enabledSwitch.setAttribute('aria-hidden', 'true')
  enabledCopy.append(enabledTitle, enabledHint)
  enabledLabel.append(enabledCopy, enabled, enabledSwitch)

  const mode = doc.createElement('select')
  mode.name = 'mode'
  mode.setAttribute('aria-label', '显示模式')
  const textMode = doc.createElement('option')
  textMode.value = 'text'
  textMode.textContent = '流光文字'
  const imageMode = doc.createElement('option')
  imageMode.value = 'image'
  imageMode.textContent = '动态图片'
  const imageTextMode = doc.createElement('option')
  imageTextMode.value = 'image-text'
  imageTextMode.textContent = '图文组合'
  mode.append(textMode, imageMode, imageTextMode)
  const modeLabel = labelFor(doc, mode, '')
  modeLabel.className = 'dsh-thinking-status-customizer-field'
  const modeTitle = doc.createElement('span')
  modeTitle.className = 'dsh-thinking-status-customizer-label-title'
  modeTitle.textContent = '显示模式'
  modeLabel.prepend(modeTitle)

  const text = doc.createElement('input')
  text.type = 'text'
  text.name = 'text'
  text.required = true
  text.className = 'dsh-thinking-status-customizer-text-input'
  text.setAttribute('aria-label', '替换文字')
  const textLabel = labelFor(doc, text, '')
  textLabel.className = 'dsh-thinking-status-customizer-field'
  const textTitle = doc.createElement('span')
  textTitle.className = 'dsh-thinking-status-customizer-label-title'
  textTitle.textContent = '替换文字'
  const textHint = doc.createElement('span')
  textHint.className = 'dsh-thinking-status-customizer-hint'
  textHint.textContent = `最多 ${MAX_TEXT_CODE_POINTS} 个字符`
  textLabel.prepend(textTitle, textHint)

  const imageSource = doc.createElement('input')
  imageSource.type = 'text'
  imageSource.className = 'dsh-thinking-status-customizer-text-input'
  imageSource.name = 'imageSource'
  imageSource.setAttribute('aria-label', '动态图片来源')
  imageSource.placeholder = '内置动画或 HTTPS / Data URL'
  const imageSourceLabel = labelFor(doc, imageSource, '')
  imageSourceLabel.className = 'dsh-thinking-status-customizer-field'
  imageSourceLabel.dataset.modeField = 'image image-text'
  const imageSourceTitle = doc.createElement('span')
  imageSourceTitle.className = 'dsh-thinking-status-customizer-label-title'
  imageSourceTitle.textContent = '动态图片来源'
  const imageSourceHint = doc.createElement('span')
  imageSourceHint.className = 'dsh-thinking-status-customizer-hint'
  imageSourceHint.textContent = '默认使用内置透明背景舞蹈 GIF；HTTPS 或 Data URL 建议使用小文件，大文件请从本地选择'
  imageSourceLabel.prepend(imageSourceTitle, imageSourceHint)

  const imageFile = doc.createElement('input')
  imageFile.type = 'file'
  imageFile.name = 'imageFile'
  imageFile.accept = 'image/gif,image/png,image/webp,.apng'
  imageFile.setAttribute('aria-label', '上传动态图片')
  const imageFileLabel = labelFor(doc, imageFile, '')
  imageFileLabel.className = 'dsh-thinking-status-customizer-field'
  imageFileLabel.dataset.modeField = 'image image-text'
  const imageFileTitle = doc.createElement('span')
  imageFileTitle.className = 'dsh-thinking-status-customizer-label-title'
  imageFileTitle.textContent = '从本地选择'
  const imageFileHint = doc.createElement('span')
  imageFileHint.className = 'dsh-thinking-status-customizer-hint'
  imageFileHint.textContent = `GIF、APNG 或 WebP，最大 ${MAX_IMAGE_FILE_BYTES / 1024 / 1024} MB；超过 ${MAX_PERSISTED_IMAGE_FILE_BYTES / 1024 / 1024} MB 时仅当前标签页有效`
  imageFileLabel.prepend(imageFileTitle, imageFileHint)

  const imageSize = doc.createElement('input')
  imageSize.type = 'number'
  imageSize.name = 'imageSize'
  imageSize.min = '24'
  imageSize.max = '96'
  imageSize.step = '1'
  imageSize.setAttribute('aria-label', '图片尺寸')
  const imageSizeLabel = labelFor(doc, imageSize, '')
  imageSizeLabel.className = 'dsh-thinking-status-customizer-field'
  imageSizeLabel.dataset.modeField = 'image image-text'
  const imageSizeTitle = doc.createElement('span')
  imageSizeTitle.className = 'dsh-thinking-status-customizer-label-title'
  imageSizeTitle.textContent = '图片尺寸（像素）'
  imageSizeLabel.prepend(imageSizeTitle)

  const colorA = doc.createElement('input')
  colorA.type = 'color'
  colorA.name = 'colorA'
  colorA.setAttribute('aria-label', '流光颜色 A')
  const colorALabel = labelFor(doc, colorA, '')
  colorALabel.className = 'dsh-thinking-status-customizer-field'
  const colorATitle = doc.createElement('span')
  colorATitle.className = 'dsh-thinking-status-customizer-label-title'
  colorATitle.textContent = '流光颜色 A'
  const colorAControl = doc.createElement('span')
  colorAControl.className = 'dsh-thinking-status-customizer-color-control'
  const colorAValue = doc.createElement('span')
  colorAValue.className = 'dsh-thinking-status-customizer-color-value'
  colorAControl.append(colorA, colorAValue)
  colorALabel.prepend(colorATitle)
  colorALabel.append(colorAControl)

  const colorB = doc.createElement('input')
  colorB.type = 'color'
  colorB.name = 'colorB'
  colorB.setAttribute('aria-label', '流光颜色 B')
  const colorBLabel = labelFor(doc, colorB, '')
  colorBLabel.className = 'dsh-thinking-status-customizer-field'
  const colorBTitle = doc.createElement('span')
  colorBTitle.className = 'dsh-thinking-status-customizer-label-title'
  colorBTitle.textContent = '流光颜色 B'
  const colorBControl = doc.createElement('span')
  colorBControl.className = 'dsh-thinking-status-customizer-color-control'
  const colorBValue = doc.createElement('span')
  colorBValue.className = 'dsh-thinking-status-customizer-color-value'
  colorBControl.append(colorB, colorBValue)
  colorBLabel.prepend(colorBTitle)
  colorBLabel.append(colorBControl)
  const colorGrid = doc.createElement('div')
  colorGrid.className = 'dsh-thinking-status-customizer-color-grid'
  colorGrid.append(colorALabel, colorBLabel)

  const actions = doc.createElement('div')
  actions.className = 'dsh-thinking-status-customizer-actions'
  const save = doc.createElement('button')
  save.type = 'submit'
  save.textContent = '保存设置'
  save.className = 'dsh-thinking-status-customizer-action dsh-thinking-status-customizer-action-primary'
  const restore = doc.createElement('button')
  restore.type = 'button'
  restore.textContent = '恢复默认值'
  restore.className = 'dsh-thinking-status-customizer-action dsh-thinking-status-customizer-action-secondary'
  actions.append(restore, save)

  const status = doc.createElement('p')
  status.className = 'dsh-thinking-status-customizer-status'
  status.setAttribute('aria-live', 'polite')
  status.dataset.dshThinkingStatusCustomizerStatus = ''
  textLabel.dataset.modeField = 'text image-text'
  colorGrid.dataset.modeField = 'text image-text'
  body.append(previewCard, enabledLabel, modeLabel, textLabel, colorGrid, imageSourceLabel, imageFileLabel, imageSizeLabel)
  form.append(body, status, actions)
  dialog.append(header, form)
  return {
    button,
    dialog,
    form,
    enabled,
    mode,
    text,
    colorA,
    colorB,
    colorAValue,
    colorBValue,
    imageSource,
    imageFile,
    imageSize,
    preview,
    restore,
    close,
    status,
    compatibility,
  }
}

/** Associate a label with a new input while keeping unique namespaced ids. */
function labelFor(doc: Document, input: HTMLInputElement | HTMLSelectElement, text: string): HTMLLabelElement {
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
  root.removeAttribute(MODE_ATTRIBUTE)
  root.style.removeProperty(TEXT_PROPERTY)
  root.style.removeProperty(COLOR_A_PROPERTY)
  root.style.removeProperty(COLOR_B_PROPERTY)
  root.style.removeProperty(IMAGE_PROPERTY)
  root.style.removeProperty(IMAGE_SIZE_PROPERTY)
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

/** Accept only image sources that cannot load executable page schemes. */
function isImageSource(value: unknown): value is string {
  if (value === BUILTIN_IMAGE_SOURCE) return true
  if (typeof value !== 'string') return false
  if (/^https:\/\/\S+$/i.test(value)) return true
  if (isTemporaryImageSource(value)) return true
  return isDataImageSource(value) && value.length <= MAX_IMAGE_DATA_URL_CHARS
}

/** Recognize supported image Data URLs before applying the size guard. */
function isDataImageSource(value: string): boolean {
  return /^data:image\/(?:gif|png|webp);base64,[a-z0-9+/=\s]+$/i.test(value)
}

/** Identify a supported Data URL rejected only because it is too large. */
function isOversizedImageDataUrl(value: unknown): boolean {
  return typeof value === 'string' && isDataImageSource(value) && value.length > MAX_IMAGE_DATA_URL_CHARS
}

/** Identify a browser-owned object URL that cannot survive a reload. */
function isTemporaryImageSource(value: string): boolean {
  return /^blob:\S+$/i.test(value)
}

/** Toggle controls that belong to one display mode. */
function syncModeFields(controls: Controls, mode: Settings['mode']): void {
  for (const field of controls.dialog.querySelectorAll<HTMLElement>('[data-mode-field]')) {
    field.hidden = !field.dataset.modeField?.split(' ').includes(mode)
  }
}

/** Render one draft without changing the live status. */
function renderPreview(controls: Controls, settings: Settings): void {
  controls.preview.dataset.mode = settings.mode
  controls.preview.textContent = settings.mode === 'text' ? settings.text : ''
  controls.preview.style.setProperty(TEXT_PROPERTY, escapeCssString(settings.text))
  controls.preview.style.setProperty(COLOR_A_PROPERTY, settings.colorA)
  controls.preview.style.setProperty(COLOR_B_PROPERTY, settings.colorB)
  controls.preview.style.setProperty(IMAGE_PROPERTY, imageSourceToCssUrl(settings.imageSource))
  controls.preview.style.setProperty(IMAGE_SIZE_PROPERTY, `${Math.min(96, Math.max(24, settings.imageSize))}px`)
}

/** Normalize the browser select value to one supported display mode. */
function parseMode(value: string): Settings['mode'] {
  if (value === 'image' || value === 'image-text') return value
  return 'text'
}

interface Controls {
  button: HTMLButtonElement
  dialog: HTMLElement
  form: HTMLFormElement
  enabled: HTMLInputElement
  mode: HTMLSelectElement
  text: HTMLInputElement
  colorA: HTMLInputElement
  colorB: HTMLInputElement
  colorAValue: HTMLElement
  colorBValue: HTMLElement
  imageSource: HTMLInputElement
  imageFile: HTMLInputElement
  imageSize: HTMLInputElement
  preview: HTMLElement
  restore: HTMLButtonElement
  close: HTMLButtonElement
  status: HTMLParagraphElement
  compatibility: HTMLParagraphElement
}
