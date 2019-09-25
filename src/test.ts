import * as fs from 'fs'
import { PositionedElement } from './ast'
import { Lexer } from './libparse'
import { T, bare_decl_scope } from './parser'

function printVisit(pos: PositionedElement, indent = '') {

}

export function run(path: string) {
  const contents = fs.readFileSync(path, 'utf-8')
  const lex = new Lexer(Object.values(T))
  lex.feed(contents)

  printVisit(bare_decl_scope(null)().parse(lex.lexed)!)
}

run(process.argv[2])