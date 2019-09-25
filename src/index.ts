
import { Lexer } from "./libparse"
import { T, bare_decl_scope, resolvable_outer_expr } from './parser'


export interface Symbol {
  name: string
  type: 'array' | 'number' | 'struct' | 'enum' | 'union' | 'enum-member'
}

// go to definition
// completion provider
// documentSymbolProvider
// signature help
// handle refactoring, especially across files !


export function getCompletions(path: string, cts: string, src_pos: number, log: (st: string) => any = () => null) {
  // const cts = fs.readFileSync(name, 'utf-8')
  const l = new Lexer(Object.values(T))
  const input = l.feed(cts)

  // This is how to reverse match something to get the parsing rule...
  var pos = l.getLexemeAt(src_pos)
  var parse_res = bare_decl_scope(null)().parse(input)

  if (!pos || !parse_res) return null

  // TODO errors
  // TODO parse expression and get type

  if (input[pos].is('.'))
    // we check if we have a dot
    pos = pos - 1

  var rule = resolvable_outer_expr
  var res = rule.tryParse(pos, input, -1)

  var sc = parse_res.findScope(input[pos])
  // console.log(sc)
  if (!res) return null
  var decl = sc.getDecl(res[1].expr)

  if (decl)
    return [decl.name]

  return null

}

