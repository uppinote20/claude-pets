// Lets Node load hooks/*.ts that import one another without an extension, as Claude Code's engine
// does: an extensionless relative import resolves to the `.ts` file beside it. Import this first,
// then import the hooks dynamically.
// @handbook 4.4-readme-asset-generation
import { register } from 'node:module'

const hook = `
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\\.[cm]?[jt]sx?$/.test(specifier) && context.parentURL !== undefined) {
    const url = new URL(specifier + '.ts', context.parentURL)
    if (existsSync(fileURLToPath(url))) {
      return next(url.href, context)
    }
  }

  return next(specifier, context)
}
`

register(`data:text/javascript,${encodeURIComponent(hook)}`)
