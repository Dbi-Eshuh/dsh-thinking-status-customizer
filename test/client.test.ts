import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  MAX_TEXT_CODE_POINTS,
  STATUS_SELECTOR,
  STORAGE_KEY,
  escapeCssString,
  loadSettings,
  mountThinkingStatusCustomizer,
  validateSettings,
} from '../src/client.js'

const cleanups: Array<() => void> = []

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()!()
})

function page(): JSDOM {
  return new JSDOM(`<!doctype html><html><head></head><body>
    <div role="status" aria-live="polite" id="unrelated">Unrelated status</div>
    <section data-conversation-scroll><div role="status" aria-live="polite" id="turn">正在吃饭中...<span aria-hidden>15s</span></div></section>
  </body></html>`, { url: 'https://dsh.test/' })
}

describe('thinking status CSS isolation', () => {
  it('uses the exact semantic selector and leaves unrelated status DOM unowned', () => {
    const dom = page()
    const cleanup = mountThinkingStatusCustomizer(dom.window.document)
    cleanups.push(cleanup)

    const style = dom.window.document.getElementById('dsh-thinking-status-customizer-style')!
    expect(STATUS_SELECTOR).toBe('[data-conversation-scroll] [role="status"][aria-live="polite"]')
    expect(style.textContent).toContain(STATUS_SELECTOR)
    expect(style.textContent).not.toContain('[role="status"] {')
    expect(style.textContent).toContain('font-size: 0 !important')
    expect(style.textContent).toContain('dsh-thinking-status-customizer-flow')
    const replacementRule = style.textContent!.split(`${STATUS_SELECTOR}::before {`)[1]!.split('}')[0]!
    expect(replacementRule).not.toContain('position: absolute')
    expect(dom.window.document.querySelector('#unrelated')?.textContent).toBe('Unrelated status')
    expect(dom.window.document.querySelector('#turn span')?.textContent).toBe('15s')
  })

  it('applies only an enabled root state and clears it after disabling', () => {
    const dom = page()
    const cleanup = mountThinkingStatusCustomizer(dom.window.document)
    cleanups.push(cleanup)
    const root = dom.window.document.documentElement
    const form = dom.window.document.querySelector('form')!
    const enabled = form.querySelector<HTMLInputElement>('input[name="enabled"]')!

    expect(root.getAttribute('data-dsh-thinking-status-customizer')).toBe('enabled')
    enabled.checked = false
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
    expect(root.hasAttribute('data-dsh-thinking-status-customizer')).toBe(false)
    expect(root.style.getPropertyValue('--dsh-thinking-status-customizer-text')).toBe('')
  })
})

describe('settings persistence and validation', () => {
  it('uses DSH theme tokens and previews edits before saving', () => {
    const dom = page()
    const cleanup = mountThinkingStatusCustomizer(dom.window.document)
    cleanups.push(cleanup)
    const document = dom.window.document
    const style = document.getElementById('dsh-thinking-status-customizer-style')!
    const trigger = document.getElementById('dsh-thinking-status-customizer-button') as HTMLButtonElement
    const dialog = document.getElementById('dsh-thinking-status-customizer-settings') as HTMLElement

    expect(style.textContent).toContain('var(--dsw-alias-bg-layer-2)')
    expect(style.textContent).toContain('var(--dsw-alias-button-floating-fill)')
    expect(style.textContent).not.toContain('#111827')
    trigger.click()
    expect(dialog.hidden).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(trigger.getAttribute('aria-label')).toBe('关闭思考状态样式设置')

    trigger.click()
    expect(dialog.hidden).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-label')).toBe('打开思考状态样式设置')

    trigger.click()
    expect(dialog.hidden).toBe(false)
    expect(dialog.querySelector('.dsh-thinking-status-customizer-preview')?.textContent).toBe(DEFAULT_SETTINGS.text)

    const text = dialog.querySelector<HTMLInputElement>('input[name="text"]')!
    text.value = '思考中...'
    text.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    expect(dialog.querySelector('.dsh-thinking-status-customizer-preview')?.textContent).toBe('思考中...')

    dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(dialog.hidden).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('persists a valid custom label and escapes it as one CSS string', () => {
    const dom = page()
    const cleanup = mountThinkingStatusCustomizer(dom.window.document)
    cleanups.push(cleanup)
    const form = dom.window.document.querySelector('form')!
    form.querySelector<HTMLInputElement>('input[name="text"]')!.value = '危险"; color: red; /*'
    form.querySelector<HTMLInputElement>('input[name="colorA"]')!.value = '#123456'
    form.querySelector<HTMLInputElement>('input[name="colorB"]')!.value = '#abcdef'
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))

    const saved = JSON.parse(dom.window.localStorage.getItem(STORAGE_KEY)!)
    expect(saved.text).toBe('危险"; color: red; /*')
    expect(dom.window.document.documentElement.style.getPropertyValue('--dsh-thinking-status-customizer-text'))
      .toBe(escapeCssString(saved.text))
    expect(escapeCssString('x"; color: red; /*')).toBe('"x\\"; color: red; /*"')
  })

  it('rejects invalid input and resolves corrupt storage to defaults', () => {
    const dom = page()
    dom.window.localStorage.setItem(STORAGE_KEY, '{not JSON')
    expect(loadSettings(dom.window.localStorage)).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings(undefined)).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.text).toBe('正在吃饭中...')
    expect(validateSettings({ ...DEFAULT_SETTINGS, text: ' '.repeat(2) }).ok).toBe(false)
    expect(validateSettings({ ...DEFAULT_SETTINGS, text: 'x'.repeat(MAX_TEXT_CODE_POINTS + 1) }).ok).toBe(false)
    expect(validateSettings({ ...DEFAULT_SETTINGS, colorA: '#12345G' }).ok).toBe(false)
  })
})

describe('lifecycle', () => {
  it('removes plugin DOM, visual state, and listener-owned behavior on cleanup and reload', () => {
    const dom = page()
    const cleanup = mountThinkingStatusCustomizer(dom.window.document)
    const root = dom.window.document.documentElement
    expect(dom.window.document.getElementById('dsh-thinking-status-customizer-button')).not.toBeNull()
    expect(root.hasAttribute('data-dsh-thinking-status-customizer')).toBe(true)

    cleanup()
    expect(dom.window.document.getElementById('dsh-thinking-status-customizer-style')).toBeNull()
    expect(dom.window.document.getElementById('dsh-thinking-status-customizer-button')).toBeNull()
    expect(dom.window.document.getElementById('dsh-thinking-status-customizer-settings')).toBeNull()
    expect(root.hasAttribute('data-dsh-thinking-status-customizer')).toBe(false)
    expect(root.style.cssText).not.toContain('dsh-thinking-status-customizer')

    const reloadedCleanup = mountThinkingStatusCustomizer(dom.window.document)
    cleanups.push(reloadedCleanup)
    expect(dom.window.document.getElementById('dsh-thinking-status-customizer-button')).not.toBeNull()
  })
})
