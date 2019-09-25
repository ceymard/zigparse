import { RawRule, Either, Seq, Rule, Z, ZF, Lexer, Lexeme, Opt, Token, any, balanced_expr, first, separated_by, S } from './libparse'
import { Variable, Declaration, Enum, Union, ContainerField, Scope, FunctionDecl, Struct } from './pseudo-ast'

export const T = {
  BLOCK_COMMENT: /([ \t]*\/\/\/[^\n]*\n)+/m,
  IDENT: /@?\w+|@"[^"]+"/,
  OP: new RegExp([
    /&=|&/,
    /\*%=|\*%|\*=|\*\*|\*/,
    /\^=?/,
    /\.\.\.|\.\.|\.\?|\.\*|\./,
    /=>|==|=/,
    /!=|!/,
    /<<=|<=|<<|</,
    /-%=|-%|->|-=|-/,
    /%=|%/,
    /\|=|\|\||\|/,
    /\+%=|\+%|\+=|\+\+|\+/,
    /\[\*c\]|\[\*\]/,
    /\?/,
    />>=|>=|>>|>/,
    /\/=|\/(?!\/)/,
    /~/
  ].map(r => r.source).join('|')),
  // /&=?|\*[\*=%]?=?|==?=?|\./,
  CONTROL: /\(|\{|\[|\]|\}|\)|;|:|,/,
  STR: /"([^"]|\\")*"/,
  CHAR: /'([^']|\\')*'/
}

const mkset = (l: Lexeme[]) => new Set(l.map(l => l.str))

const pub = Opt('pub')
const comptime = Opt('comptime')
const qualifiers = Either('var', 'const')
const struct_qualifiers = Z(Either('packed', 'aligned')).map(mkset)
const func_qualifiers = Z(Either(
  Seq('extern', Opt(T.STR)),
  'inline',
  'export'
))

const ident = Token(T.IDENT).map(i => i.str.replace(/@"/, '').replace(/"$/, ''))

function set_position<T extends Declaration>(decl: T, start: number, end: number) {
  decl.setPosition(start, end)
  return decl
}

// const inner_scope = Seq('{', '}')

export const bare_decl_scope = (until: RawRule<any> | null) => () => ZF(
  Either(
    container_decl,
    func_decl,
    var_decl,
    container_field(ContainerField)
  ),
  until
).map((objs) => new Scope()
  .addDeclarations(objs)
).map(set_position)

const decl_scope = Seq('{', bare_decl_scope('}'), '}').map(([_1, scope, _2]) => scope)

const scope = (): Rule<Scope> => Seq(
  '{', // missing if, switch, while and for constructs
  // called *payload in the grammar
  ZF(Either(
    var_decl,
    scope,
  ), '}'),
  '}'
).map(([_1, decls, _2]) => new Scope()
    .addDeclarations(decls)
).map(set_position)


const container_field = (base_type: typeof Variable) => Seq(
  ident,
  ':',
  ZF(any, Either('=', ')', '}', ',', ';')).map(t => t.map(t => t.str).join(' '))
  // ident
).map(([id, _, typ]) => new base_type()
  .setName(id)
  .setType(typ)
).map(set_position)


const func_decl = Seq(
  pub, Opt(func_qualifiers), 'fn', ident, balanced_expr('(', container_field(Variable), ')'), // function arguments, they contain variable declarations.
  ZF(any, Either(';', '{')).map(t => t.map(t => t.str).join(' ')), // return type, unparsed for now.
  Either(
    Token(';').map(() => null),
    scope
  )
).map(([pub, qual, _1, id, args, retr, maybe_scope]) => new FunctionDecl()
  .setPublic(pub)
  .setName(id)
  .addDeclarations(args)
  .addDeclarations(maybe_scope ? maybe_scope.declarations : null)
  .setReturnType(retr)
).map(set_position)


// const error_decl: Rule<Variable> = Seq(
//   pub,
//   'const',
//   ident,
//   '=',
//   'error',
//   '{',
//   separated_by(',', ident),
//   '}'
// ).map(([pub, _1, id, _2, _3, _4, idents]) => new Variable()
//   .setPublic(pub)
//   .setName(id)
//   .setType('error')

// )


const var_decl: Rule<Variable> = Seq(
  pub,
  qualifiers,
  ident,
  Opt(Seq(':', ZF(any, Either('=', '}', ',', ';'))).map(([_, t]) => t.map(t => t.str).join(' '))),
  '=',
  ZF(any, ';')
).map(([pub, qual, ident, typ]) => new Variable()
  .setPublic(pub)
  .setName(ident)
  .setType(typ)
).map(set_position)


// ContainerField <- IDENTIFIER (COLON TypeExpr)? (EQUAL Expr)?

const container_decl: Rule<Struct | Enum | Union> = Seq(
  pub,
  qualifiers,
  ident,
  '=',
  struct_qualifiers,
  Either(
    'struct',
    Seq('enum', balanced_expr('(', any, ')')).map(first),
    'union'
  ).map(a => a.str),
  decl_scope
).map(([pub, qual, ident, _1, quals, kind, scope]) => (kind === 'struct' ? new Struct() : kind === 'union' ? new Union() : new Enum())
  .setPublic(pub)
  .setName(ident)
  .addDeclarations(scope.declarations)
).map(set_position)

/**
 * A resolvable expression, where operators are ignored and we only care about
 * symbols (and function calls).
 */
const modified_ident = Seq(
  // several pointers and such.
  Z(Either('*', '&')),
  ident,
  Z(balanced_expr('[', any, ']')),
  // several chained array access
).map(([_, i]) => i)

const potential_fncall = Seq(
  modified_ident,
  Opt(balanced_expr('(', any, ')')),
).map(([i, c]) => c ? '(' + i : i)

export const resolvable_outer_expr = separated_by('.', potential_fncall).map((lst, start, end) => {
  return {
    expr: lst,
    start, end
  }
})


export class ZigHost {

  files: {[name: string]: {lexer: Lexer, scope: Scope}} = {}

  constructor() {
    // should call `zig builtin` to get this
    // this is a special import done to resolve @symbols.
    // this.addFile('--builtin--', '')
  }

  addFile(path: string, contents: string) {
    // const cts = fs.readFileSync(name, 'utf-8')
    const lexer = new Lexer(Object.values(T))
    const input = lexer.feed(contents)
    const scope = bare_decl_scope(null)().parse(input)!
    this.files[path] = {scope, lexer}
  }

  /**
   * Get a list of all interesting declarations.
   * @param path
   * @param pos the position of
   */
  getDeclarationsInScope(path: string, pos: number) {

  }

  /**
   * Get a declaration by its name from a given scope.
   * @param path The path of the file
   * @param pos The position in the file
   * @param name The name of the symbol to resolve
   */
  getDeclarationByName(path: string, pos: number, name: string) {

  }

  /**
   *
   * @param decl
   * @param path
   */
  getMembersChain(decl: Declaration, path: string[]): Declaration[] | null {
    return null
  }

  getMembers(decl: Declaration) {

  }

}
