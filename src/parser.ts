import { RawRule, Either, Seq, Rule, Z, ZF, Lexer, Lexeme, Opt, Token, any, balanced_expr, first, separated_by, S } from './libparse'
// import { Variable, Declaration, Enum, Union, ContainerField, Scope, FunctionDecl, Struct } from './pseudo-ast'
import { Declaration, Scope, PositionedElement, VariableDeclaration, FunctionDeclaration, StructDeclaration, EnumDeclaration, UnionDeclaration, Position, MemberField } from './ast'

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
  S`extern ${Opt(T.STR)}`,
  'inline',
  'export'
))

const ident = Token(T.IDENT).map(i => i.str.replace(/@"/, '').replace(/"$/, ''))

function set_position<T extends PositionedElement>(decl: T, start: number, end: number) {
  decl.set('position', new Position (start, end))
  return decl
}

// const inner_scope = Seq('{', '}')

export const bare_decl_scope = (until: RawRule<any> | null) => () => ZF(
  Either(
    container_decl,
    func_decl,
    var_decl,
    container_field(MemberField)
  ),
  until
).map((objs) => new Scope()
  .appendDeclarations(objs)
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
    .appendDeclarations(decls)
).map(set_position)


const container_field = (base_type: typeof VariableDeclaration) => Seq(
  ident,
  ':',
  ZF(any, Either('=', ')', '}', ',', ';')).map(t => t.map(t => t.str).join(' '))
  // ident
).map(([id, _, typ]) => new base_type()
  .set('name', id)
  .set('type', typ)
).map(set_position)


const func_decl = Seq(
  pub, Opt(func_qualifiers), 'fn', ident, balanced_expr('(', container_field(VariableDeclaration), ')'), // function arguments, they contain variable declarations.
  ZF(any, Either(';', '{')).map(t => t.map(t => t.str).join(' ')), // return type, unparsed for now.
  Either(
    Token(';').map(() => null),
    scope
  )
).map(([pub, qual, _1, id, args, retr, maybe_scope]) => new FunctionDeclaration()
  .set('is_public', !!pub)
  .set('name', id)
  .set('args', args)
  .set('return_type', retr)
  .appendDeclarations(args) // args are in scope !
  .appendDeclarations(maybe_scope ? maybe_scope.declarations : [])
).map(set_position)


const var_decl: Rule<VariableDeclaration> = Seq(
  pub,
  qualifiers,
  ident,
  Opt(Seq(':', ZF(any, Either('=', '}', ',', ';'))).map(([_, t]) => t.map(t => t.str).join(' '))),
  '=',
  ZF(any, ';')
).map(([pub, qual, ident, typ]) => new VariableDeclaration()
  .set('is_public', !!pub)
  .set('varconst', qual.str)
  .set('name', ident)
  .set('type', typ)
).map(set_position)


// ContainerField <- IDENTIFIER (COLON TypeExpr)? (EQUAL Expr)?

const container_decl: Rule<StructDeclaration | EnumDeclaration | UnionDeclaration> = Seq(
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
).map(([pub, qual, ident, _1, quals, kind, scope]) => (kind === 'struct' ? new StructDeclaration() : kind === 'union' ? new UnionDeclaration() : new EnumDeclaration())
  .set('is_public', !!pub)
  .set('name', ident)
  .appendDeclarations(scope.declarations)
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
