# DSH Thinking Status Customizer

[中文](README.zh.md)

A CSS-only DSH Web plugin that replaces the visible running status with custom text or a GIF, APNG, or WebP animation without modifying DSH source or rewriting the status DOM.

## Preview

### Dark theme

![DSH Web dark theme with the thinking status settings open](assets/harness-dark-preview.png)

### Light theme

![DSH Web light theme with the thinking status settings open](assets/harness-light-preview.png)

### Settings panel

![Thinking status settings](assets/settings-preview.png)

## Install

Install the tagged release into a Web profile, inspect the resolved configuration, then restart DSH Web:

```sh
dsh plugin --profile web add github:Dbi-Eshuh/dsh-thinking-status-customizer#v0.2.0
dsh --profile web --dump-config
```

Open the floating **思考状态** button after restart. Click the same button again, use the close button, or press Escape to close the panel. The dialog can enable or disable the visual replacement and switch among flowing text, an animated image, and a left-image/right-text combination. Image modes include a roughly 12-second dance GIF with a transparent background and also accept an HTTPS/Data URL or a local GIF, APNG, or WebP up to 20 MB. Local files above 2 MB remain uncompressed and use a temporary object URL, so they work only in the current tab and must be selected again after a reload.

The settings panel inherits DSH Web's light or dark theme tokens and previews text, color, animation, and size edits before they are saved.

Remove the plugin and restart DSH Web to restore the built-in presentation:

```sh
dsh plugin --profile web remove dsh-thinking-status-customizer
```

## Behavior and privacy

The default mode is the flowing text `正在吃饭中...`. Settings and Data URL images up to about 3 MB are stored only in browser `localStorage` under `dsh-thinking-status-customizer:v1`; larger local images use a temporary object URL and are not persisted. The plugin does not upload settings, status text, images, or model interaction. When an HTTPS image URL is configured, the browser requests that URL directly. Missing, corrupt, or unavailable storage resolves to defaults without stopping the page.

The stylesheet targets only `[data-conversation-scroll] [role="status"][aria-live="polite"]`. It adds a layout-participating pseudo-element and plugin-owned CSS properties; it does not observe the page, replace `textContent`, or target other live-status elements. Disabling or unloading the plugin removes its style, controls, attributes, CSS properties, and event listeners.

The original DSH status remains in the accessibility tree. This plugin therefore changes visual copy only; assistive technology continues to receive the built-in status text.

## Compatibility

The current release is tested with DSH Web `0.1.0-rc.6`. It relies on the semantic selector above because `ui-conversation` does not expose a running-status text provider in that release. A DSH update that changes the selector can make the visual replacement inactive; the plugin remains loaded and its dialog reports that it is waiting for a matching status.

This package uses only the public DSH bundle and client-module loading declarations. It does not patch `ui-conversation` or depend on private DSH build helpers.

## Develop and verify

```sh
npm install
npm run verify
```

`lib/index.js` and `lib/client.js` are committed so GitHub installation does not require an install-time build. `npm run verify` type-checks, tests, rebuilds, confirms the committed bundles match the source, and previews the package contents.

## Model Experience

None. The plugin adds no tool, prompt, model-visible input or output, session event, or model behavior. It changes only browser-local presentation of an existing running status.
