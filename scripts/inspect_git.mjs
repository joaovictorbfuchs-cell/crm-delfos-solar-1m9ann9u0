import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

function readLooseObject(sha) {
  const dir = sha.slice(0, 2)
  const file = sha.slice(2)
  const fullPath = path.join(process.cwd(), '.git', 'objects', dir, file)
  if (!fs.existsSync(fullPath)) return null
  const compressed = fs.readFileSync(fullPath)
  const decompressed = zlib.inflateSync(compressed)
  const nullIdx = decompressed.indexOf(0)
  const header = decompressed.subarray(0, nullIdx).toString('utf8')
  const content = decompressed.subarray(nullIdx + 1)
  const [type, sizeStr] = header.split(' ')
  return { type, size: parseInt(sizeStr, 10), content }
}

const tagSha = fs.readFileSync('.git/refs/tags/v0.0.1162', 'utf8').trim()
console.log('Tag SHA:', tagSha)
const obj = readLooseObject(tagSha)
console.log('Object type:', obj ? obj.type : 'not found')
if (obj && obj.type === 'tag') {
  console.log('Tag content:\n', obj.content.toString('utf8'))
} else if (obj && obj.type === 'commit') {
  console.log('Commit content:\n', obj.content.toString('utf8'))
}
