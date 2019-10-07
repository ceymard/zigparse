

import * as fs from 'fs'
import { Lexer } from './libparse'
import { T, ROOT } from './grammar'
import * as a from './ast'
import { print_node } from './print'

const f = fs.readFileSync(process.argv[2], 'utf-8')
const l = new Lexer(Object.values(T))
const input = l.feed(f)
const res = ROOT.parse(input) as a.FileBlock
res._onParsed()

print_node(res)

// console.log(f)