# dsh-thinking-status-customizer

An installable DSH Web bundle that changes only the visible running/thinking label with CSS. It owns a small floating settings button; the DSH status element, its original text, its clock span, and its accessibility DOM remain untouched.

## Install and remove

Build this checkout first, then add it to a Web profile from its parent directory:

```sh
npm install
npm run build
dsh plugin --profile web add ./dsh-thinking-status-customizer
dsh --profile web --dump-config
```

Remove it with:

```sh
dsh plugin --profile web remove dsh-thinking-status-customizer
```

The bundle patch inserts one row. Its `dsh.client` declaration loads only on the `web` platform and immediately registers the browser plugin.

## Behavior and privacy

Use the floating **思考状态** button to enable or disable the replacement, set a label, choose two colors, save, or restore defaults. Settings are stored only in the browser's `localStorage` under `dsh-thinking-status-customizer:v1`; no setting, status text, or model interaction leaves the browser. Corrupt or unavailable storage falls back to defaults without throwing.

The stylesheet is deliberately limited to `[data-conversation-scroll] [role="status"][aria-live="polite"]`. It uses pseudo-elements and plugin-owned root custom properties; it does not observe or mutate DSH `TurnStatus` nodes, rewrite `textContent`, or target unrelated live-status elements. Disabling or unloading removes the style, settings DOM, root attributes/custom properties, observer, and listeners immediately.

## Compatibility

This is compatible only with a DSH Web UI that exposes the exact selector above. If a future DSH UI changes that semantic markup, the plugin remains harmless but has no visual effect; its dialog shows that it is waiting for a matching status. The client bundle is intentionally self-contained and uses the DSH module-loader wrapper, not private DSH build helpers.

## Release and pack workflow

```sh
npm install
npm run check
npm test
npm run build
npm pack --dry-run
npm pack
```

`lib/index.js` and `lib/client.js` are committed so consuming a tarball does not require build permission. Inspect the generated `.tgz` before distributing it; do not commit that temporary tarball.

## Model Experience

None. This plugin adds no tool, prompt, model-visible input, output, session event, or model behavior. It affects only browser-local presentation of an already-rendered running status.
