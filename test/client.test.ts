import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    expect(validateSettings({ ...DEFAULT_SETTINGS, text: ' '.repeat(2) }).ok).toBe(false)
    expect(validateSettings({ ...DEFAULT_SETTINGS, text: 'x'.repeat(MAX_TEXT_CODE_POINTS + 1) }).ok).toBe(false)
    expect(validateSettings({ ...DEFAULT_SETTINGS, colorA: '#12345G' }).ok).toBe(false)
  })
})

describe('lifecycle', () => {
  it('removes plugin DOM, visual state, listener-owned behavior, and observer on cleanup and reload', () => {
    const dom = page()
    const disconnected = vi.fn()
    class FakeObserver {
      constructor(_callback: MutationCallback) {}
      observe = vi.fn()
      disconnect = disconnected
    }
    Object.defineProperty(dom.window, 'MutationObserver', { value: FakeObserver })

    const cleanup = mountThinkingStatusCustomizer(dom.window.document)
    const root = dom.window.document.documentElement
    expect(dom.window.document.getElementById('dsh-thinking-status-customizer-button')).not.toBeNull()
    expect(root.hasAttribute('data-dsh-thinking-status-customizer')).toBe(true)

    cleanup()
    expect(disconnected).toHaveBeenCalledOnce()
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
