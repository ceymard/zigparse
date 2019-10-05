

import * as fs from 'fs'
import { Lexer, Node } from './libparse'
import { T, ROOT } from './grammar'
import * as a from './ast'
import ch from 'chalk'

const f = fs.readFileSync(process.argv[2], 'utf-8')
const l = new Lexer(Object.values(T))
const input = l.feed(f)
const res = ROOT.parse(input) as a.FileBlock

// console.log(res.statements)
show_node(res)

function show_node(n: Node, indent = '', prefix = '') {
  var suppl = [] as string[]
  if (n instanceof a.Identifier)
    suppl.push(ch.green('value') + ': ' + n.value)
  else if (n instanceof a.Literal)
    suppl.push(ch.yellow(n.value))

  console.log(indent + prefix + n.constructor.name + (suppl.length ? '(' + suppl.join(', ') + ')' : ''))
  for (var c of n.children) {
    var p = ''
    for (var x in n) {
      if ((n as any)[x] === c)
        p = ch.magenta(x) + ': '
    }
    show_node(c, indent + '  ', p)
  }
}
// console.log(f)