// Resolves the "@/" import alias (see jsconfig.json) to ./src so the tests can import app modules.
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const srcDir = fileURLToPath(new URL('../src/', import.meta.url))

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('@/')) return nextResolve(specifier, context)

  const base = path.join(srcDir, specifier.slice(2))
  const file = [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js')].find(existsSync)
  return nextResolve(pathToFileURL(file).href, context)
}
