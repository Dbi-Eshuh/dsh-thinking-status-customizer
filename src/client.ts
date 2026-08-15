/** CSS-only browser customizer for the visible DSH thinking status. */

import builtinAnimationUrl from '../assets/animations/dance-reference-transparent.gif'
import {
  en, type MessageKey, type MessageParams, translate, type Translate, zh,
} from './locales.js'

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
const GRADIENT_PROPERTY = '--dsh-thinking-status-customizer-gradient'
const FLOW_START_PROPERTY = '--dsh-thinking-status-customizer-flow-start'
const FLOW_END_PROPERTY = '--dsh-thinking-status-customizer-flow-end'
const FLOW_SIZE_PROPERTY = '--dsh-thinking-status-customizer-flow-size'
const FLOW_DIRECTION_PROPERTY = '--dsh-thinking-status-customizer-flow-direction'
const IMAGE_PROPERTY = '--dsh-thinking-status-customizer-image'
const IMAGE_SIZE_PROPERTY = '--dsh-thinking-status-customizer-image-size'
const MODE_ATTRIBUTE = 'data-dsh-thinking-status-customizer-mode'
const STYLE_ID = 'dsh-thinking-status-customizer-style'
const SETTINGS_ID = 'dsh-thinking-status-customizer-settings'
const BUTTON_ID = 'dsh-thinking-status-customizer-button'
const LOCALE_NAMESPACE = 'dsh-thinking-status-customizer'

/** User-controlled display settings. */
export interface Settings {
  enabled: boolean
  mode: 'text' | 'image' | 'image-text'
  text: string
  colors: readonly string[]
  direction: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top'
  flowMode: 'loop' | 'alternate'
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
  /** DSH browser locale service. */
  locale: LocaleFace
}

/** Public locale face consumed from the DSH client composition. */
export interface LocaleFace {
  /** Observe DSH locale changes. */
  subscribe(listener: () => void): () => void
  /** Register this plugin's bilingual dictionary. */
  register(namespace: string, dictionaries: { zh: Record<string, string>; en: Record<string, string> }): () => void
  /** Bind a live translator to this plugin's dictionary namespace. */
  bind(namespace: string): (key: string, params?: Record<string, unknown>) => string
}

/** Required DSH client service. */
export const inject = ['locale']

/** Defaults used when storage is missing, corrupted, or invalid. */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  enabled: true,
  mode: 'text',
  text: '正在吃饭中...',
  colors: Object.freeze(['#7c3aed', '#22c55e']),
  direction: 'left-to-right',
  flowMode: 'loop',
  imageSource: BUILTIN_IMAGE_SOURCE,
  imageSize: 48,
})

const zhTranslate: Translate = (key, params) => translate('zh', key, params)

/** Translation source used by the plugin-owned DOM. */
export interface Localization {
  /** Translate against the active DSH locale. */
  t: Translate
  /** Observe active-locale changes. */
  subscribe(listener: () => void): () => void
}

const DEFAULT_LOCALIZATION: Localization = {
  t: zhTranslate,
  subscribe: () => () => {},
}

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
export function validateSettings(value: unknown, t: Translate = zhTranslate): SettingsValidation {
  if (!isRecord(value)) return { ok: false, message: t('validation.notObject') }
  if (typeof value.enabled !== 'boolean') return { ok: false, message: t('validation.enabled') }
  const mode = value.mode === undefined ? DEFAULT_SETTINGS.mode : value.mode
  if (mode !== 'text' && mode !== 'image' && mode !== 'image-text') {
    return { ok: false, message: t('validation.mode') }
  }
  if (typeof value.text !== 'string') return { ok: false, message: t('validation.textType') }
  const text = value.text.trim()
  if (text.length === 0) return { ok: false, message: t('validation.textEmpty') }
  if (Array.from(text).length > MAX_TEXT_CODE_POINTS) {
    return { ok: false, message: t('validation.textMax', { max: MAX_TEXT_CODE_POINTS }) }
  }
  const colors = Array.isArray(value.colors)
    ? value.colors
    : isColor(value.colorA) && isColor(value.colorB)
      ? [value.colorA, value.colorB]
      : undefined
  if (colors === undefined || colors.length < 2 || colors.length > 5 || !colors.every(isColor)) {
    return { ok: false, message: t('validation.color') }
  }
  const direction = value.direction === undefined ? DEFAULT_SETTINGS.direction : value.direction
  if (!isFlowDirection(direction)) return { ok: false, message: t('validation.direction') }
  const flowMode = value.flowMode === undefined ? DEFAULT_SETTINGS.flowMode : value.flowMode
  if (flowMode !== 'loop' && flowMode !== 'alternate') {
    return { ok: false, message: t('validation.flowMode') }
  }
  const savedImageSource = value.imageSource === undefined ? DEFAULT_SETTINGS.imageSource : value.imageSource
  const imageSource = savedImageSource === LEGACY_BUILTIN_IMAGE_SOURCE ? BUILTIN_IMAGE_SOURCE : savedImageSource
  if (!isImageSource(imageSource)) {
    return { ok: false, message: isOversizedImageDataUrl(imageSource)
      ? t('validation.imageDataTooLarge')
      : t('validation.imageSource') }
  }
  const imageSize = value.imageSize === undefined ? DEFAULT_SETTINGS.imageSize : value.imageSize
  if (typeof imageSize !== 'number' || !Number.isInteger(imageSize) || imageSize < 24 || imageSize > 96) {
    return { ok: false, message: t('validation.imageSize') }
  }
  return {
    ok: true,
    value: { enabled: value.enabled, mode, text, colors: [...colors], direction, flowMode, imageSource, imageSize },
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
  const t = ctx.locale.bind(LOCALE_NAMESPACE) as Translate
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const unregister = ctx.locale.register(LOCALE_NAMESPACE, { zh, en })
    const unmount = mountThinkingStatusCustomizer(document, {
      t,
      subscribe: (listener) => ctx.locale.subscribe(listener),
    })
    return () => {
      unmount()
      unregister()
    }
  }, 'dsh-thinking-status-customizer: browser UI')
}

/**
 * Mount the settings UI and CSS replacement. Exported for package-local tests.
 * @param doc - The browser document receiving only plugin-owned nodes.
 * @param localization - DSH locale-backed translation source.
 * @returns A disposer that completely restores native visuals.
 */
export function mountThinkingStatusCustomizer(
  doc: Document,
  localization: Localization = DEFAULT_LOCALIZATION,
): () => void {
  const browser = doc.defaultView
  if (browser === null) return () => {}

  const root = doc.documentElement
  const style = createStyle(doc)
  const controls = createControls(doc, localization.t)
  const storage = getStorage(browser)
  let settings = loadSettings(storage)
  let temporaryImageUrl: string | undefined
  let disposed = false
  let statusNotice: { key: MessageKey; params?: MessageParams } | undefined

  const setStatus = (key: MessageKey, params?: MessageParams): void => {
    statusNotice = { key, ...(params === undefined ? {} : { params }) }
    controls.status.textContent = localization.t(key, params)
  }

  const applyVisualState = (next: Settings): void => {
    if (!next.enabled) {
      clearVisualState(root)
      return
    }
    root.setAttribute(ROOT_ATTRIBUTE, 'enabled')
    root.setAttribute(MODE_ATTRIBUTE, next.mode)
    root.style.setProperty(TEXT_PROPERTY, escapeCssString(next.text))
    applyFlowProperties(root.style, next)
    root.style.setProperty(IMAGE_PROPERTY, imageSourceToCssUrl(next.imageSource))
    root.style.setProperty(IMAGE_SIZE_PROPERTY, `${next.imageSize}px`)
  }

  const syncControls = (): void => {
    controls.enabled.checked = settings.enabled
    controls.mode.value = settings.mode
    controls.text.value = settings.text
    controls.colorCount.value = String(settings.colors.length)
    controls.colors.forEach((control, index) => {
      control.input.value = settings.colors[index] ?? DEFAULT_SETTINGS.colors[index % DEFAULT_SETTINGS.colors.length]!
      control.value.textContent = control.input.value.toUpperCase()
    })
    syncColorFields(controls)
    controls.direction.value = settings.direction
    controls.flowMode.value = settings.flowMode
    controls.imageSource.value = settings.imageSource
    controls.imageSize.value = String(settings.imageSize)
    syncModeFields(controls, settings.mode)
    renderPreview(controls, settings)
  }

  const readDraftSettings = (): Record<string, unknown> => ({
    enabled: controls.enabled.checked,
    mode: controls.mode.value,
    text: controls.text.value,
    colors: controls.colors.slice(0, Number(controls.colorCount.value)).map(({ input }) => input.value),
    direction: controls.direction.value,
    flowMode: controls.flowMode.value,
    imageSource: controls.imageSource.value,
    imageSize: Number(controls.imageSize.value),
  })

  const updateCompatibilityStatus = (): void => {
    const matched = doc.querySelector(STATUS_SELECTOR) !== null
    controls.compatibility.textContent = localization.t(
      matched ? 'compatibility.connected' : 'compatibility.waiting',
    )
    controls.compatibility.dataset.state = matched ? 'matched' : 'waiting'
  }

  const syncTranslations = (): void => {
    syncControlTranslations(controls, localization.t)
    updateCompatibilityStatus()
    if (statusNotice !== undefined) {
      controls.status.textContent = localization.t(statusNotice.key, statusNotice.params)
    } else if (controls.status.textContent !== '') {
      const validation = validateSettings(readDraftSettings(), localization.t)
      controls.status.textContent = validation.ok ? '' : validation.message
    }
  }

  const updateDraftPreview = (): void => {
    const mode = parseMode(controls.mode.value)
    syncModeFields(controls, mode)
    syncColorFields(controls)
    renderPreview(controls, {
      enabled: controls.enabled.checked,
      mode,
      text: controls.text.value.trim() || settings.text,
      colors: controls.colors.slice(0, Number(controls.colorCount.value)).map(({ input }) => input.value),
      direction: parseFlowDirection(controls.direction.value),
      flowMode: controls.flowMode.value === 'alternate' ? 'alternate' : 'loop',
      imageSource: isImageSource(controls.imageSource.value) ? controls.imageSource.value : settings.imageSource,
      imageSize: Number.parseInt(controls.imageSize.value, 10) || settings.imageSize,
    })
    controls.colors.forEach(({ input, value }) => { value.textContent = input.value.toUpperCase() })
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
    const result = validateSettings(readDraftSettings(), localization.t)
    if (!result.ok) {
      statusNotice = undefined
      controls.status.textContent = result.message
      return
    }
    settings = result.value
    syncControls()
    applyVisualState(settings)
    if (isTemporaryImageSource(settings.imageSource)) setStatus('status.appliedTemporary')
    else if (persist()) setStatus('status.saved')
    else setStatus('status.storageRejected')
  }

  const restoreDefaults = (): void => {
    if (temporaryImageUrl !== undefined) {
      browser.URL.revokeObjectURL(temporaryImageUrl)
      temporaryImageUrl = undefined
    }
    settings = { ...DEFAULT_SETTINGS }
    syncControls()
    applyVisualState(settings)
    setStatus(persist() ? 'status.defaultsRestored' : 'status.defaultsStorageRejected')
  }

  const openDialog = (): void => {
    controls.dialog.hidden = false
    controls.button.setAttribute('aria-expanded', 'true')
    controls.button.setAttribute('aria-label', localization.t('trigger.close'))
    updateCompatibilityStatus()
    controls.text.focus()
  }

  const closeDialog = (): void => {
    controls.dialog.hidden = true
    controls.button.setAttribute('aria-expanded', 'false')
    controls.button.setAttribute('aria-label', localization.t('trigger.open'))
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
    setStatus('status.synced')
  }
  const onImageFile = (): void => {
    const file = controls.imageFile.files?.[0]
    if (file === undefined) return
    if (!['image/gif', 'image/png', 'image/webp', 'image/apng'].includes(file.type)) {
      setStatus('status.invalidImageType')
      controls.imageFile.value = ''
      return
    }
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      setStatus('status.imageTooLarge', { max: MAX_IMAGE_FILE_BYTES / 1024 / 1024 })
      controls.imageFile.value = ''
      return
    }
    if (temporaryImageUrl !== undefined) browser.URL.revokeObjectURL(temporaryImageUrl)
    if (file.size > MAX_PERSISTED_IMAGE_FILE_BYTES) {
      temporaryImageUrl = browser.URL.createObjectURL(file)
      controls.imageSource.value = temporaryImageUrl
      updateDraftPreview()
      setStatus('status.temporaryImageLoaded')
      return
    }
    const reader = new browser.FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return
      controls.imageSource.value = reader.result
      updateDraftPreview()
      setStatus('status.imageLoaded')
    }, { once: true })
    reader.addEventListener('error', () => {
      setStatus('status.imageReadFailed')
    }, { once: true })
    reader.readAsDataURL(file)
  }
  const onImageSourceInput = (): void => {
    if (isOversizedImageDataUrl(controls.imageSource.value)) {
      setStatus('validation.imageDataTooLarge')
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
  controls.colorCount.addEventListener('change', updateDraftPreview)
  controls.direction.addEventListener('change', updateDraftPreview)
  controls.flowMode.addEventListener('change', updateDraftPreview)
  for (const { input } of controls.colors) input.addEventListener('input', updateDraftPreview)
  controls.restore.addEventListener('click', restoreDefaults)
  controls.close.addEventListener('click', closeDialog)
  controls.dialog.addEventListener('keydown', onDialogKeydown)
  browser.addEventListener('storage', onStorage)
  const unsubscribeLocale = localization.subscribe(syncTranslations)

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
    controls.colorCount.removeEventListener('change', updateDraftPreview)
    controls.direction.removeEventListener('change', updateDraftPreview)
    controls.flowMode.removeEventListener('change', updateDraftPreview)
    for (const { input } of controls.colors) input.removeEventListener('input', updateDraftPreview)
    controls.restore.removeEventListener('click', restoreDefaults)
    controls.close.removeEventListener('click', closeDialog)
    controls.dialog.removeEventListener('keydown', onDialogKeydown)
    browser.removeEventListener('storage', onStorage)
    unsubscribeLocale()
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
  animation-direction: var(${FLOW_DIRECTION_PROPERTY});
  background: var(${GRADIENT_PROPERTY});
  background-clip: text;
  background-position: var(${FLOW_START_PROPERTY});
  background-repeat: repeat;
  background-size: var(${FLOW_SIZE_PROPERTY});
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
  animation-direction: var(${FLOW_DIRECTION_PROPERTY});
  background-clip: border-box, text;
  background-image: var(${IMAGE_PROPERTY}), var(${GRADIENT_PROPERTY});
  background-position: left center, var(${FLOW_START_PROPERTY});
  background-repeat: no-repeat, repeat;
  background-size: var(${IMAGE_SIZE_PROPERTY}) var(${IMAGE_SIZE_PROPERTY}), var(${FLOW_SIZE_PROPERTY});
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
  from { background-position: var(${FLOW_START_PROPERTY}); }
  to { background-position: var(${FLOW_END_PROPERTY}); }
}
@keyframes dsh-thinking-status-customizer-image-text-flow {
  from { background-position: left center, var(${FLOW_START_PROPERTY}); }
  to { background-position: left center, var(${FLOW_END_PROPERTY}); }
}
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTRIBUTE}="enabled"][${MODE_ATTRIBUTE}="text"] ${STATUS_SELECTOR}::before {
    animation: none;
    background-position: center;
    background-size: 100% 100%;
  }
  html[${ROOT_ATTRIBUTE}="enabled"][${MODE_ATTRIBUTE}="image-text"] ${STATUS_SELECTOR}::before {
    animation: none;
    background-position: left center, center;
    background-size: var(${IMAGE_SIZE_PROPERTY}) var(${IMAGE_SIZE_PROPERTY}), 100% 100%;
  }
  #${SETTINGS_ID} .dsh-thinking-status-customizer-preview[data-mode='image-text']::before {
    animation: none;
    background-position: left center, center;
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
  animation-direction: var(${FLOW_DIRECTION_PROPERTY});
  background: var(${GRADIENT_PROPERTY});
  background-clip: text;
  background-position: var(${FLOW_START_PROPERTY});
  background-repeat: repeat;
  background-size: var(${FLOW_SIZE_PROPERTY});
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
  animation-direction: var(${FLOW_DIRECTION_PROPERTY});
  background-clip: border-box, text;
  background-image: var(${IMAGE_PROPERTY}), var(${GRADIENT_PROPERTY});
  background-position: left center, var(${FLOW_START_PROPERTY});
  background-repeat: no-repeat, repeat;
  background-size: var(${IMAGE_SIZE_PROPERTY}) var(${IMAGE_SIZE_PROPERTY}), var(${FLOW_SIZE_PROPERTY});
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
#${SETTINGS_ID} .dsh-thinking-status-customizer-flow-settings {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
#${SETTINGS_ID} .dsh-thinking-status-customizer-flow-settings[hidden] { display: none; }
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
  #${SETTINGS_ID} .dsh-thinking-status-customizer-flow-settings { grid-template-columns: 1fr; }
}
`
  return style
}

/** Create the namespaced floating settings button and dialog. */
function createControls(doc: Document, t: Translate): Controls {
  const button = doc.createElement('button')
  button.id = BUTTON_ID
  button.type = 'button'
  button.setAttribute('aria-controls', SETTINGS_ID)
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-haspopup', 'dialog')
  button.setAttribute('aria-label', t('trigger.open'))
  const triggerDot = doc.createElement('span')
  triggerDot.className = 'dsh-thinking-status-customizer-trigger-dot'
  triggerDot.setAttribute('aria-hidden', 'true')
  const triggerText = doc.createElement('span')
  triggerText.textContent = t('trigger.label')
  button.append(triggerDot, triggerText)

  const dialog = doc.createElement('section')
  dialog.id = SETTINGS_ID
  dialog.hidden = true
  dialog.setAttribute('aria-label', t('dialog.label'))
  dialog.setAttribute('role', 'dialog')

  const header = doc.createElement('header')
  header.className = 'dsh-thinking-status-customizer-header'
  const heading = doc.createElement('div')
  heading.className = 'dsh-thinking-status-customizer-heading'
  const title = doc.createElement('h2')
  title.textContent = t('dialog.title')

  const compatibility = doc.createElement('p')
  compatibility.className = 'dsh-thinking-status-customizer-compatibility'
  compatibility.setAttribute('aria-live', 'polite')
  compatibility.dataset.dshThinkingStatusCustomizerCompatibility = ''

  const close = doc.createElement('button')
  close.type = 'button'
  close.className = 'dsh-thinking-status-customizer-icon-button'
  close.textContent = '×'
  close.setAttribute('aria-label', t('dialog.close'))
  heading.append(title, compatibility)
  header.append(heading, close)

  const form = doc.createElement('form')
  const body = doc.createElement('div')
  body.className = 'dsh-thinking-status-customizer-body'

  const previewCard = doc.createElement('div')
  previewCard.className = 'dsh-thinking-status-customizer-preview-card'
  const previewLabel = doc.createElement('span')
  previewLabel.className = 'dsh-thinking-status-customizer-eyebrow'
  previewLabel.textContent = t('preview.label')
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
  enabledTitle.textContent = t('enabled.title')
  const enabledHint = doc.createElement('span')
  enabledHint.className = 'dsh-thinking-status-customizer-hint'
  enabledHint.textContent = t('enabled.hint')
  const enabledSwitch = doc.createElement('span')
  enabledSwitch.className = 'dsh-thinking-status-customizer-switch'
  enabledSwitch.setAttribute('aria-hidden', 'true')
  enabledCopy.append(enabledTitle, enabledHint)
  enabledLabel.append(enabledCopy, enabled, enabledSwitch)

  const mode = doc.createElement('select')
  mode.name = 'mode'
  mode.setAttribute('aria-label', t('mode.label'))
  const textMode = doc.createElement('option')
  textMode.value = 'text'
  textMode.textContent = t('mode.text')
  const imageMode = doc.createElement('option')
  imageMode.value = 'image'
  imageMode.textContent = t('mode.image')
  const imageTextMode = doc.createElement('option')
  imageTextMode.value = 'image-text'
  imageTextMode.textContent = t('mode.imageText')
  mode.append(textMode, imageMode, imageTextMode)
  const modeLabel = labelFor(doc, mode, '')
  modeLabel.className = 'dsh-thinking-status-customizer-field'
  const modeTitle = doc.createElement('span')
  modeTitle.className = 'dsh-thinking-status-customizer-label-title'
  modeTitle.textContent = t('mode.label')
  modeLabel.prepend(modeTitle)

  const text = doc.createElement('input')
  text.type = 'text'
  text.name = 'text'
  text.required = true
  text.className = 'dsh-thinking-status-customizer-text-input'
  text.setAttribute('aria-label', t('text.label'))
  const textLabel = labelFor(doc, text, '')
  textLabel.className = 'dsh-thinking-status-customizer-field'
  const textTitle = doc.createElement('span')
  textTitle.className = 'dsh-thinking-status-customizer-label-title'
  textTitle.textContent = t('text.label')
  const textHint = doc.createElement('span')
  textHint.className = 'dsh-thinking-status-customizer-hint'
  textHint.textContent = t('text.hint', { max: MAX_TEXT_CODE_POINTS })
  textLabel.prepend(textTitle, textHint)

  const imageSource = doc.createElement('input')
  imageSource.type = 'text'
  imageSource.className = 'dsh-thinking-status-customizer-text-input'
  imageSource.name = 'imageSource'
  imageSource.setAttribute('aria-label', t('image.source.label'))
  imageSource.placeholder = t('image.source.placeholder')
  const imageSourceLabel = labelFor(doc, imageSource, '')
  imageSourceLabel.className = 'dsh-thinking-status-customizer-field'
  imageSourceLabel.dataset.modeField = 'image image-text'
  const imageSourceTitle = doc.createElement('span')
  imageSourceTitle.className = 'dsh-thinking-status-customizer-label-title'
  imageSourceTitle.textContent = t('image.source.label')
  const imageSourceHint = doc.createElement('span')
  imageSourceHint.className = 'dsh-thinking-status-customizer-hint'
  imageSourceHint.textContent = t('image.source.hint')
  imageSourceLabel.prepend(imageSourceTitle, imageSourceHint)

  const imageFile = doc.createElement('input')
  imageFile.type = 'file'
  imageFile.name = 'imageFile'
  imageFile.accept = 'image/gif,image/png,image/webp,.apng'
  imageFile.setAttribute('aria-label', t('image.file.aria'))
  const imageFileLabel = labelFor(doc, imageFile, '')
  imageFileLabel.className = 'dsh-thinking-status-customizer-field'
  imageFileLabel.dataset.modeField = 'image image-text'
  const imageFileTitle = doc.createElement('span')
  imageFileTitle.className = 'dsh-thinking-status-customizer-label-title'
  imageFileTitle.textContent = t('image.file.label')
  const imageFileHint = doc.createElement('span')
  imageFileHint.className = 'dsh-thinking-status-customizer-hint'
  imageFileHint.textContent = t('image.file.hint', {
    max: MAX_IMAGE_FILE_BYTES / 1024 / 1024,
    persisted: MAX_PERSISTED_IMAGE_FILE_BYTES / 1024 / 1024,
  })
  imageFileLabel.prepend(imageFileTitle, imageFileHint)

  const imageSize = doc.createElement('input')
  imageSize.type = 'number'
  imageSize.name = 'imageSize'
  imageSize.min = '24'
  imageSize.max = '96'
  imageSize.step = '1'
  imageSize.setAttribute('aria-label', t('image.size.aria'))
  const imageSizeLabel = labelFor(doc, imageSize, '')
  imageSizeLabel.className = 'dsh-thinking-status-customizer-field'
  imageSizeLabel.dataset.modeField = 'image image-text'
  const imageSizeTitle = doc.createElement('span')
  imageSizeTitle.className = 'dsh-thinking-status-customizer-label-title'
  imageSizeTitle.textContent = t('image.size.label')
  imageSizeLabel.prepend(imageSizeTitle)

  const colorCount = doc.createElement('select')
  colorCount.name = 'colorCount'
  colorCount.setAttribute('aria-label', t('color.count'))
  for (let count = 2; count <= 5; count += 1) {
    const option = doc.createElement('option')
    option.value = String(count)
    option.textContent = String(count)
    colorCount.append(option)
  }
  const colorCountLabel = labelFor(doc, colorCount, '')
  colorCountLabel.className = 'dsh-thinking-status-customizer-field'
  const colorCountTitle = doc.createElement('span')
  colorCountTitle.className = 'dsh-thinking-status-customizer-label-title'
  colorCountTitle.textContent = t('color.count')
  colorCountLabel.prepend(colorCountTitle)

  const colorGrid = doc.createElement('div')
  colorGrid.className = 'dsh-thinking-status-customizer-color-grid'
  const colors: ColorControl[] = []
  for (let index = 0; index < 5; index += 1) {
    const input = doc.createElement('input')
    input.type = 'color'
    input.name = `color${index + 1}`
    input.setAttribute('aria-label', t('color.item', { index: index + 1 }))
    const label = labelFor(doc, input, '')
    label.className = 'dsh-thinking-status-customizer-field'
    const title = doc.createElement('span')
    title.className = 'dsh-thinking-status-customizer-label-title'
    title.textContent = t('color.item', { index: index + 1 })
    const control = doc.createElement('span')
    control.className = 'dsh-thinking-status-customizer-color-control'
    const value = doc.createElement('span')
    value.className = 'dsh-thinking-status-customizer-color-value'
    control.append(input, value)
    label.prepend(title)
    label.append(control)
    colorGrid.append(label)
    colors.push({ input, label, title, value })
  }

  const direction = doc.createElement('select')
  direction.name = 'direction'
  direction.setAttribute('aria-label', t('direction.label'))
  const directionOptions = [
    optionFor(doc, 'left-to-right', t('direction.leftToRight')),
    optionFor(doc, 'right-to-left', t('direction.rightToLeft')),
    optionFor(doc, 'top-to-bottom', t('direction.topToBottom')),
    optionFor(doc, 'bottom-to-top', t('direction.bottomToTop')),
  ]
  direction.append(...directionOptions)
  const directionLabel = labelFor(doc, direction, '')
  directionLabel.className = 'dsh-thinking-status-customizer-field'
  const directionTitle = doc.createElement('span')
  directionTitle.className = 'dsh-thinking-status-customizer-label-title'
  directionTitle.textContent = t('direction.label')
  directionLabel.prepend(directionTitle)

  const flowMode = doc.createElement('select')
  flowMode.name = 'flowMode'
  flowMode.setAttribute('aria-label', t('flowMode.label'))
  const flowModeOptions = [
    optionFor(doc, 'loop', t('flowMode.loop')),
    optionFor(doc, 'alternate', t('flowMode.alternate')),
  ]
  flowMode.append(...flowModeOptions)
  const flowModeLabel = labelFor(doc, flowMode, '')
  flowModeLabel.className = 'dsh-thinking-status-customizer-field'
  const flowModeTitle = doc.createElement('span')
  flowModeTitle.className = 'dsh-thinking-status-customizer-label-title'
  flowModeTitle.textContent = t('flowMode.label')
  flowModeLabel.prepend(flowModeTitle)

  const flowSettings = doc.createElement('div')
  flowSettings.className = 'dsh-thinking-status-customizer-flow-settings'
  flowSettings.append(colorCountLabel, directionLabel, flowModeLabel)

  const actions = doc.createElement('div')
  actions.className = 'dsh-thinking-status-customizer-actions'
  const save = doc.createElement('button')
  save.type = 'submit'
  save.textContent = t('action.save')
  save.className = 'dsh-thinking-status-customizer-action dsh-thinking-status-customizer-action-primary'
  const restore = doc.createElement('button')
  restore.type = 'button'
  restore.textContent = t('action.restore')
  restore.className = 'dsh-thinking-status-customizer-action dsh-thinking-status-customizer-action-secondary'
  actions.append(restore, save)

  const status = doc.createElement('p')
  status.className = 'dsh-thinking-status-customizer-status'
  status.setAttribute('aria-live', 'polite')
  status.dataset.dshThinkingStatusCustomizerStatus = ''
  textLabel.dataset.modeField = 'text image-text'
  flowSettings.dataset.modeField = 'text image-text'
  colorGrid.dataset.modeField = 'text image-text'
  body.append(previewCard, enabledLabel, modeLabel, textLabel, flowSettings, colorGrid, imageSourceLabel, imageFileLabel, imageSizeLabel)
  form.append(body, status, actions)
  dialog.append(header, form)
  return {
    button,
    triggerText,
    dialog,
    title,
    form,
    enabled,
    enabledTitle,
    enabledHint,
    mode,
    modeTitle,
    textMode,
    imageMode,
    imageTextMode,
    text,
    textTitle,
    textHint,
    colorCount,
    colorCountTitle,
    colors,
    direction,
    directionTitle,
    directionOptions,
    flowMode,
    flowModeTitle,
    flowModeOptions,
    imageSource,
    imageSourceTitle,
    imageSourceHint,
    imageFile,
    imageFileTitle,
    imageFileHint,
    imageSize,
    imageSizeTitle,
    previewLabel,
    preview,
    save,
    restore,
    close,
    status,
    compatibility,
  }
}

/** Update plugin-owned copy without recreating controls or losing draft values. */
function syncControlTranslations(controls: Controls, t: Translate): void {
  controls.button.setAttribute('aria-label', t(controls.dialog.hidden ? 'trigger.open' : 'trigger.close'))
  controls.triggerText.textContent = t('trigger.label')
  controls.dialog.setAttribute('aria-label', t('dialog.label'))
  controls.title.textContent = t('dialog.title')
  controls.close.setAttribute('aria-label', t('dialog.close'))
  controls.previewLabel.textContent = t('preview.label')
  controls.enabledTitle.textContent = t('enabled.title')
  controls.enabledHint.textContent = t('enabled.hint')
  controls.mode.setAttribute('aria-label', t('mode.label'))
  controls.modeTitle.textContent = t('mode.label')
  controls.textMode.textContent = t('mode.text')
  controls.imageMode.textContent = t('mode.image')
  controls.imageTextMode.textContent = t('mode.imageText')
  controls.text.setAttribute('aria-label', t('text.label'))
  controls.textTitle.textContent = t('text.label')
  controls.textHint.textContent = t('text.hint', { max: MAX_TEXT_CODE_POINTS })
  controls.imageSource.setAttribute('aria-label', t('image.source.label'))
  controls.imageSource.placeholder = t('image.source.placeholder')
  controls.imageSourceTitle.textContent = t('image.source.label')
  controls.imageSourceHint.textContent = t('image.source.hint')
  controls.imageFile.setAttribute('aria-label', t('image.file.aria'))
  controls.imageFileTitle.textContent = t('image.file.label')
  controls.imageFileHint.textContent = t('image.file.hint', {
    max: MAX_IMAGE_FILE_BYTES / 1024 / 1024,
    persisted: MAX_PERSISTED_IMAGE_FILE_BYTES / 1024 / 1024,
  })
  controls.imageSize.setAttribute('aria-label', t('image.size.aria'))
  controls.imageSizeTitle.textContent = t('image.size.label')
  controls.colorCount.setAttribute('aria-label', t('color.count'))
  controls.colorCountTitle.textContent = t('color.count')
  controls.colors.forEach((control, index) => {
    control.input.setAttribute('aria-label', t('color.item', { index: index + 1 }))
    control.title.textContent = t('color.item', { index: index + 1 })
  })
  controls.direction.setAttribute('aria-label', t('direction.label'))
  controls.directionTitle.textContent = t('direction.label')
  controls.directionOptions[0]!.textContent = t('direction.leftToRight')
  controls.directionOptions[1]!.textContent = t('direction.rightToLeft')
  controls.directionOptions[2]!.textContent = t('direction.topToBottom')
  controls.directionOptions[3]!.textContent = t('direction.bottomToTop')
  controls.flowMode.setAttribute('aria-label', t('flowMode.label'))
  controls.flowModeTitle.textContent = t('flowMode.label')
  controls.flowModeOptions[0]!.textContent = t('flowMode.loop')
  controls.flowModeOptions[1]!.textContent = t('flowMode.alternate')
  controls.save.textContent = t('action.save')
  controls.restore.textContent = t('action.restore')
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

/** Create one select option without coupling its visible copy to its value. */
function optionFor(doc: Document, value: string, text: string): HTMLOptionElement {
  const option = doc.createElement('option')
  option.value = value
  option.textContent = text
  return option
}

/** Remove every plugin-owned root visual marker. */
function clearVisualState(root: HTMLElement): void {
  root.removeAttribute(ROOT_ATTRIBUTE)
  root.removeAttribute(MODE_ATTRIBUTE)
  root.style.removeProperty(TEXT_PROPERTY)
  root.style.removeProperty(GRADIENT_PROPERTY)
  root.style.removeProperty(FLOW_START_PROPERTY)
  root.style.removeProperty(FLOW_END_PROPERTY)
  root.style.removeProperty(FLOW_SIZE_PROPERTY)
  root.style.removeProperty(FLOW_DIRECTION_PROPERTY)
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

/** Narrow the persisted flow direction. */
function isFlowDirection(value: unknown): value is Settings['direction'] {
  return value === 'left-to-right' || value === 'right-to-left'
    || value === 'top-to-bottom' || value === 'bottom-to-top'
}

/** Normalize a browser select value to one supported flow direction. */
function parseFlowDirection(value: string): Settings['direction'] {
  return isFlowDirection(value) ? value : DEFAULT_SETTINGS.direction
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

/** Show only the color inputs selected by the user. */
function syncColorFields(controls: Controls): void {
  const count = Number(controls.colorCount.value)
  controls.colors.forEach(({ label }, index) => { label.hidden = index >= count })
}

/** Render one draft without changing the live status. */
function renderPreview(controls: Controls, settings: Settings): void {
  controls.preview.dataset.mode = settings.mode
  controls.preview.textContent = settings.mode === 'text' ? settings.text : ''
  controls.preview.style.setProperty(TEXT_PROPERTY, escapeCssString(settings.text))
  applyFlowProperties(controls.preview.style, settings)
  controls.preview.style.setProperty(IMAGE_PROPERTY, imageSourceToCssUrl(settings.imageSource))
  controls.preview.style.setProperty(IMAGE_SIZE_PROPERTY, `${Math.min(96, Math.max(24, settings.imageSize))}px`)
}

/** Apply a validated gradient and motion settings to one CSS declaration. */
function applyFlowProperties(style: CSSStyleDeclaration, settings: Settings): void {
  const vertical = settings.direction === 'top-to-bottom' || settings.direction === 'bottom-to-top'
  const forward = settings.direction === 'left-to-right' || settings.direction === 'top-to-bottom'
  const start = vertical ? `0 ${forward ? '-100%' : '100%'}` : `${forward ? '-100%' : '100%'} 0`
  const end = vertical ? `0 ${forward ? '100%' : '-100%'}` : `${forward ? '100%' : '-100%'} 0`
  style.setProperty(GRADIENT_PROPERTY, buildGradient(settings.colors, vertical ? '180deg' : '90deg'))
  style.setProperty(FLOW_START_PROPERTY, start)
  style.setProperty(FLOW_END_PROPERTY, end)
  style.setProperty(FLOW_SIZE_PROPERTY, vertical ? '100% 300%' : '300% 100%')
  style.setProperty(FLOW_DIRECTION_PROPERTY, settings.flowMode === 'alternate' ? 'alternate' : 'normal')
}

/** Build a seamless mirrored gradient from two to five validated colors. */
function buildGradient(colors: readonly string[], angle: string): string {
  const mirrored = [...colors, ...colors.slice(0, -1).reverse()]
  const last = mirrored.length - 1
  const stops = mirrored.map((color, index) => `${color} ${Math.round(index / last * 100)}%`)
  return `linear-gradient(${angle}, ${stops.join(', ')})`
}

/** Normalize the browser select value to one supported display mode. */
function parseMode(value: string): Settings['mode'] {
  if (value === 'image' || value === 'image-text') return value
  return 'text'
}

interface Controls {
  button: HTMLButtonElement
  triggerText: HTMLElement
  dialog: HTMLElement
  title: HTMLElement
  form: HTMLFormElement
  enabled: HTMLInputElement
  enabledTitle: HTMLElement
  enabledHint: HTMLElement
  mode: HTMLSelectElement
  modeTitle: HTMLElement
  textMode: HTMLOptionElement
  imageMode: HTMLOptionElement
  imageTextMode: HTMLOptionElement
  text: HTMLInputElement
  textTitle: HTMLElement
  textHint: HTMLElement
  colorCount: HTMLSelectElement
  colorCountTitle: HTMLElement
  colors: ColorControl[]
  direction: HTMLSelectElement
  directionTitle: HTMLElement
  directionOptions: HTMLOptionElement[]
  flowMode: HTMLSelectElement
  flowModeTitle: HTMLElement
  flowModeOptions: HTMLOptionElement[]
  imageSource: HTMLInputElement
  imageSourceTitle: HTMLElement
  imageSourceHint: HTMLElement
  imageFile: HTMLInputElement
  imageFileTitle: HTMLElement
  imageFileHint: HTMLElement
  imageSize: HTMLInputElement
  imageSizeTitle: HTMLElement
  previewLabel: HTMLElement
  preview: HTMLElement
  save: HTMLButtonElement
  restore: HTMLButtonElement
  close: HTMLButtonElement
  status: HTMLParagraphElement
  compatibility: HTMLParagraphElement
}

interface ColorControl {
  input: HTMLInputElement
  label: HTMLLabelElement
  title: HTMLElement
  value: HTMLElement
}
