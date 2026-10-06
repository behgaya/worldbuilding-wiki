// npm run check: lists every [[link]] whose target is missing or not public, and media problems.
// Errors (missing, invalid, ambiguous) exit with code 1; warnings don't.
import { checkLinks } from '../server/utils/entries.ts'

const problems = await checkLinks()
for (const p of problems) {
  const subject = p.plain ? p.slug : `[[${p.slug}]]`
  console.log(`${p.level === 'error' ? 'ERROR' : 'WARN '} ${p.kind}: ${p.file} | ${p.where} | ${subject}`)
}

const errors = problems.filter((p) => p.level === 'error').length
const warnings = problems.length - errors
console.log(`\n${errors} error(s), ${warnings} warning(s)`)
process.exit(errors ? 1 : 0)
