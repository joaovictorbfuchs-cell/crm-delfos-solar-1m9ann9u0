// probe
import zlib from 'node:zlib'
import fs from 'node:fs'

export function decodeCommit() {
  const buf = fs.readFileSync('.git/objects/d5/7fd268c55c1799f75e1fffb1444a6c6e706539')
  const decomp = zlib.inflateSync(buf)
  return decomp.toString('utf8')
}
