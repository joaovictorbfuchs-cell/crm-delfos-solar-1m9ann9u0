import fs from 'fs'
import path from 'path'

const assetsDir = path.resolve(process.cwd(), 'src/assets')
const files = fs.readdirSync(assetsDir)
const stats = {}

files.forEach((f) => {
  const fp = path.join(assetsDir, f)
  const st = fs.statSync(fp)
  stats[f] = {
    bytes: st.size,
    kb: (st.size / 1024).toFixed(2),
    mb: (st.size / (1024 * 1024)).toFixed(2),
  }
})

console.log('--- ASSETS STATS ---')
console.log(JSON.stringify(stats, null, 2))
console.log('--------------------')
