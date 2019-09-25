import * as fs from 'fs'
import { PositionedElement, Scope, VariableDeclaration, FunctionDeclaration, StructDeclaration, EnumDeclaration, MemberField } from './ast'
import { Lexer } from './libparse'
import { T, bare_decl_scope } from './parser'
import c from 'chalk'


const is = (d: any, d2: any) => d.constructor === d2

function printVisit(d: PositionedElement, indent = '') {
  var mp = (d: PositionedElement) => printVisit(d, indent + '  ')
  var p = (s: string) => console.log(indent + s)
  if (d.is(Scope)) {
    d.declarations.forEach(mp)
  } else if (d.is(VariableDeclaration)) {
    if (d.is_public)
      p(c.gray.bold(d.varconst) + ' ' + d.name)
  } else if (d.is(FunctionDeclaration)) {
    p(c.green.bold('fn') + ' ' + d.name)
    d.declarations.forEach(mp)
  } else if (d.is(StructDeclaration)) {
    p(c.red.bold('struct') + ' ' + d.name)
    d.declarations.forEach(mp)
  } else if (d.is(EnumDeclaration)) {
    p(c.cyan.bold('enum') + ' ' + d.name)
    d.declarations.forEach(mp)
  } else if (d.is(MemberField)) {
    p(c.yellowBright('.' + d.name))
  } else {
    p(c.red.bold('/!\\ ' + d.constructor.name))
  }
}

export function run(path: string) {
  const contents = fs.readFileSync(path, 'utf-8')
  const lex = new Lexer(Object.values(T))
  lex.feed(contents)

  printVisit(bare_decl_scope(null)().parse(lex.lexed)!)
}

run(process.argv[2])