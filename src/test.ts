import * as fs from 'fs'
import { PositionedElement, Scope, VariableDeclaration, FunctionDeclaration, StructDeclaration, EnumDeclaration, MemberField, Declaration, ContainerDeclaration } from './ast'
import { Lexer, Lexeme, S, P, any, Either, Opt } from './libparse'
import { T, bare_decl_scope } from './parser'
import c from 'chalk'
import { ZigHost } from '.'


const is = (d: any, d2: any) => d.constructor === d2


const host = new ZigHost()


function printVisit(d: PositionedElement, pub = false, indent = '') {

  var mp = (d: PositionedElement) => printVisit(d, pub, indent + '  ')
  var p = (s: string) => console.log(indent + s)
  var pu = (s: Declaration) => s.is_public ? 'pub ' : ''

  if (
    (d.is(VariableDeclaration) || d instanceof ContainerDeclaration)
    && !d.is(Scope) && pub && !d.is_public) return

  if (d.is(Scope)) {
    d.declarations.forEach(mp)
  } else if (d.is(VariableDeclaration)) {
    p(c.gray.bold(pu(d) + d.varconst) + ' ' + d.name)
  } else if (d.is(FunctionDeclaration)) {
    p(c.green.bold(pu(d) + 'fn') + ' ' + d.name)
    d.declarations.forEach(mp)
  } else if (d.is(StructDeclaration)) {
    p(c.red.bold(pu(d) + 'struct') + ' ' + d.name)
    d.declarations.forEach(mp)
  } else if (d.is(EnumDeclaration)) {
    p(c.cyan.bold(pu(d) + 'enum') + ' ' + d.name)
    d.declarations.forEach(mp)
  } else if (d.is(MemberField)) {
    p(c.yellowBright('.' + d.name))
  } else {
    p(c.red.bold('/!\\ ' + d.constructor.name))
  }
}

export function tree(paths: string[], opt = 'tree' as string) {
  for (var path of paths) {
    const contents = fs.readFileSync(path, 'utf-8')
    process.stdout.write(c.bold.magentaBright(`File`) + ' ' + c.magentaBright(path) + ` ${Math.round(contents.length / 1024)}kb`)
    const f = host.addFile(path, contents)
    console.info(` lex(${f.lex_hrtime[0] > 0 ? c.red.bold('%ds') : '%ds'} %dms) parse(${f.parse_hrtime[0] > 0 ? c.red.bold('%ds') : '%ds'} %dms)`, f.lex_hrtime[0], f.lex_hrtime[1] / 1000000, f.parse_hrtime[0], f.parse_hrtime[1] / 1000000)
    if (opt !== 'silent') {
      // for (var l of f.lexer.lexed) {
      //   process.stdout.write(`'${l.str}' `)
      // }
      // console.log()
      printVisit(f.scope, opt === 'pub')
    }
  }
}

// export function completion()


const args = process.argv.slice(2).map((a, i) => new Lexeme(/./, a, 0, 0, i, 0, 0))

const tree_cmd = S`tree ${Opt(Either('pub', 'silent'))} ${P(any)}`.map(([pub, s]) => tree(s.map(s => s.str), pub ? pub.str : 'tree'))

const commands = tree_cmd
commands.parse(args)