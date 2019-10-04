

import * as fs from 'fs'
import { Lexer } from './libparse'
import { T, ROOT } from './grammar'
import * as a from './ast'

const f = fs.readFileSync(process.argv[2], 'utf-8')
const l = new Lexer(Object.values(T))
const input = l.feed(f)
const res = ROOT.parse(input) as a.FileBlock

console.log(res.statements)
// console.log(f)