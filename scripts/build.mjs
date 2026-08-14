import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'

const packageId = 'dsh-thinking-status-customizer'

await mkdir('lib', { recursive: true })

await build({
  bundle: true,
  entryPoints: ['src/host.ts'],
  format: 'esm',
  outfile: 'lib/index.js',
  platform: 'node',
  target: 'node22',
})

const client = await build({
  bundle: true,
  entryPoints: ['src/client.ts'],
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  write: false,
})

const body = client.outputFiles[0].text
const wrapper = `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;\n${body}\nreturn module.exports;\n} });\n`

await writeFile('lib/client.js', wrapper)
