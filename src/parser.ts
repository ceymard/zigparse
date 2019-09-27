import { RawRule, Either, Seq, Rule, Z, ZF, Lexeme, Opt, Token, any, Balanced, first, S, second, T, SeqObj } from './libparse'
// import { Variable, Declaration, Enum, Union, ContainerField, Scope, FunctionDecl, Struct } from './pseudo-ast'
import { Scope, PositionedElement, VariableDeclaration, FunctionDeclaration, StructDeclaration, EnumDeclaration, UnionDeclaration, Position, MemberField, FunctionArgumentDeclaration, Declaration } from './ast'

const mkset = (l: Lexeme[]) => new Set(l.map(l => l.str))
export const lexemes = (l: any, start: Lexeme, end: Lexeme, input: Lexeme[]) => input.slice(start.input_position, end.input_position + 1)

const doc = Opt(T.BLOCK_COMMENT).map(d => {
  if (!d) return ''
  return d.str.replace(/^\s*\/\/\/\s*/gm, '')
})
const pub = Opt('pub')
const comptime = Opt('comptime')
const qualifiers = Either('var', 'const')
const struct_qualifiers = Z(Either('packed', 'aligned')).map(mkset)
const func_qualifiers = Z(Either(
  S`extern ${Opt(T.STR)}`,
  'inline',
  'export'
))

export const ident = Token(T.IDENT).map(i => i.str.replace(/@"/, '').replace(/"$/, ''))

function set_position<T extends PositionedElement>(decl: T, start: Lexeme, end: Lexeme) {
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
    control_struct,
    scope,
  ), '}'),
  '}'
).map(([_1, decls, _2]) => new Scope()
    .appendDeclarations(decls)
).map(set_position)


const payload_expression = SeqObj({
  _lpipe:         '|',
  is_pointer:     Opt('*').map(r => !!r),
  ident:          ident,
  iter_ident:     Opt(Seq(',', ident).map(second)),
  _rpipe:         '|',
}).map(({is_pointer, ident, iter_ident}) => { return {is_pointer, ident, iter_ident} })


const control_struct = SeqObj({
  inline:      Opt('inline'),
  _kind:       Either('for', 'while', 'if'),
  expr:        Balanced('(', any, ')'),
  payload:     Opt(payload_expression), // payload !
  main_scope:  scope,
  maybe_else:  Opt(SeqObj({
    kw:           'else',
    payload:      Opt(payload_expression),
    else_scope:   scope
  }))
}).map(({expr, payload, main_scope, maybe_else}) => {
  if (payload && payload.ident !== '_') {
    main_scope.prependDeclarations([
      new VariableDeclaration()
        .set('name', payload.ident)
        .set('value', expr)
    ])
  }

  const scope = new Scope()
  const decls = [main_scope] as Declaration[]

  if (maybe_else) {
    var sc = maybe_else.else_scope
    if (sc) {
      decls.push(sc)
    }
  }

  scope.prependDeclarations(decls)
  return scope
}).map(set_position)



const container_field = (base_type: typeof VariableDeclaration) => Seq(
  doc,
  ident,
  ':',
  ZF(Either(Balanced('(', any, ')'), any), Either('=', ')', '}', ',', ';')).map(lexemes)
  // ident
).map(([doc, id, _, typ]) => new base_type()
  .set('doc', doc)
  .set('name', id)
  .set('type', typ)
).map(set_position)


const func_decl = Seq(
  doc, pub, Opt(func_qualifiers), 'fn', ident, Balanced('(', container_field(FunctionArgumentDeclaration), ')'), // function arguments, they contain variable declarations.
  ZF(any, Either(';', '{')).map(lexemes), // return type, unparsed for now.
  Either(
    Token(';').map(() => null),
    scope
  )
).map(([doc, pub, qual, _1, id, args, retr, maybe_scope]) => new FunctionDeclaration()
  .set('doc', doc)
  .set('is_public', !!pub)
  .set('name', id)
  .set('args', args)
  .set('return_type', retr)
  .appendDeclarations(args) // args are in scope !
  .appendDeclarations(maybe_scope ? maybe_scope.declarations : [])
).map(set_position)


const var_decl: Rule<VariableDeclaration> = Seq(
  doc,
  pub,
  qualifiers,
  ident,
  Opt(Seq(':', ZF(any, Either('=', '}', ',', ';')).map(lexemes)).map(second)),
  '=',
  ZF(Either(Balanced('{', any, '}'), any), ';').map(lexemes)
).map(([doc, pub, qual, ident, typ, _, val]) => new VariableDeclaration()
  .set('doc', doc)
  .set('is_public', !!pub)
  .set('varconst', qual.str)
  .set('name', ident)
  .set('type', typ)
  .set('value', val)
).map(set_position)


// ContainerField <- IDENTIFIER (COLON TypeExpr)? (EQUAL Expr)?

const container_decl: Rule<StructDeclaration | EnumDeclaration | UnionDeclaration> = Seq(
  doc,
  pub,
  qualifiers,
  ident,
  '=',
  struct_qualifiers,
  Either(
    'struct',
    Seq('enum', Balanced('(', any, ')')).map(first),
    'union'
  ).map(a => a.str),
  decl_scope
).map(([doc, pub, qual, ident, _1, quals, kind, scope]) => (kind === 'struct' ? new StructDeclaration() : kind === 'union' ? new UnionDeclaration() : new EnumDeclaration())
  .set('doc', doc)
  .set('is_public', !!pub)
  .set('name', ident)
  .appendDeclarations(scope.declarations)
).map(set_position)
