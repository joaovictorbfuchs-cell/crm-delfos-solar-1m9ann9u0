import fs from 'fs'

const raw = fs.readFileSync('src/lib/pocketbase/schema.json', 'utf8')
const parsed = JSON.parse(raw)
const collections = parsed.collections.map((c) => c.name)
fs.writeFileSync(
  'scripts/output_cols.txt',
  `Count: ${collections.length}\nNames: ${collections.join(', ')}`,
)
console.log(`Saved ${collections.length} collections`)
