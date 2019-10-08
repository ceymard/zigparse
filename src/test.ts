

import * as fs from 'fs'
import { Lexer } from './libparse'
import { T, ROOT } from './grammar'
import * as a from './ast'
import { print_node } from './print'

for (var filename of process.argv.slice(2)) {
  console.log(`--> ${filename}`)
  const f = fs.readFileSync(filename, 'utf-8')
  const l = new Lexer(Object.values(T))
  const input = l.feed(f)
  const res = ROOT.parse(input) as a.FileBlock
  res._onParsed()
  // console.log(res.getNodeAt(158))
  if (false)
    print_node(res)
  // console.log(res.statements[0])
  // console.log(f)
}

