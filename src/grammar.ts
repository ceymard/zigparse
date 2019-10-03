
import { SeqObj, Opt, Either, Token, S, ZeroOrMore, Node, RawRule, separated_by, EitherObj, Rule } from './libparse'
import { VariableDeclaration, TestDeclaration, FunctionArgument } from './declarations'
import { Expression, TypeExpression } from './expression'
import * as a from './ast'


export const T = {
  BLOCK_COMMENT: /([ \t]*\/\/\/[^\n]*\n)+/m,
  STR: /"(\\"|.)*"|\\\\[^\n]*\n(\s*\\\\[^\n]*\n)*/,
  CHAR: /'(\\'|.)*'/,
  BUILTIN_IDENT: /@[A-Za-z_][A-Za-z_0-9]*/,
  INTEGER: /sss/, // fixme
  FLOAT: /sss/, // fixme
  IDENT: /[A-Za-z_]\w*|@"[^"]+"/,
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
}


const kw_test =           'test'
const kw_const =          'const'
const kw_var =            'var'
const kw_comptime =       'comptime'
const kw_usingnamespace = 'usingnamespace'
const kw_volatile =       'volatile'
const kw_allowzero =      'allowzero'
const kw_async =          'async'
const kw_or =             'or'
const kw_and =            'and'

const OptBool = (r: RawRule<any>) => Opt(r).map(r => !!r)

const opt_kw_comptime = OptBool(kw_comptime)
const opt_kw_export = OptBool('export')
const opt_kw_inline = OptBool('inline')
const opt_kw_threadlocal = OptBool('threadlocal')
const opt_kw_pub = OptBool('pub')
const opt_kw_fncc = Opt(Either('nakedcc', 'stdcallcc', 'extern', 'async'))


const kw_const_var = Either(kw_const, kw_var)

const tk_equal = '='
const tk_semicolon = ';'
const tk_colon = ':'
const tk_lbrace = '{'
const tk_rbrace = '}'

//////////////////////////////////////////////////////////


export const DOC = Opt(Token(T.BLOCK_COMMENT).map(t => t.str))


///////////////////////////////////
export const IDENT = Token(T.IDENT)
.map(id => id.str)


///////////////////////////////
export const VAR = Token('var')
.map(r =>
  // FIXME
  new TypeExpression()
)


////////////////////////////////
export const DOT3 = Token('...')
.map(r =>
  // FIXME
  new TypeExpression()
)


///////////////////////////////
export const STR = Token(T.STR)
.map(s => s.str.slice(1, -1))
  // FIXME this is incorrect, since a string can be multiline \\


////////////////////////////////////////
const OPT_EXTERN = Opt(S`extern ${STR}`)


/////////////////////////////////
export const CHAR = Token(T.CHAR)
.map(s => s.str.slice(1, -1))


///////////////////////////////////
export const BLOCK_LABEL = SeqObj({
  name:     IDENT,
            tk_colon
})
.map(({name}) => name)


////////////////////////////////////////
export const BREAK_LABEL = S`: ${IDENT}`


////////////////////////////////////////
export const BREAK_EXPRESSION = SeqObj({
  kw_break:       'break',
  label:          Opt(BREAK_LABEL),
  exp:            Opt(() => EXPRESSION),
})


///////////////////////////////////////////
export const CONTINUE_EXPRESSION = SeqObj({
  kw_continue:    'continue',
  label:          Opt(BREAK_LABEL),
})


//////////////////////////////////////////////////////////////
export const RESUME_EXPRESSION = S`resume ${() => EXPRESSION}`


///////////////////////////////////////////////////////////////////
export const RETURN_EXPRESSION = S`return ${Opt(() => EXPRESSION)}`


///////////////////////////////
export const PAYLOAD = SeqObj({
  _s:         '|',
  opt_ptr:    OptBool('*'),
  ident:      IDENT,
  opt_index:  Opt(SeqObj({
                _1:       ',',
                ident:    IDENT,
              })
              .map(e => e.ident)),
  _e:         '|',
})


//////////////////////////////////////
export const WHILE_PREFIX = SeqObj({})


/////////////////////////////////
export const IF_PREFIX = SeqObj({
  if:           'if',
  exp:          () => ASSIGN_EXPRESSION,
  opt_payload:  Opt(PAYLOAD),
})


///////////////////////////////////////////
export const COMPTIME_EXPRESSION = SeqObj({
  kw_comptime:      'comptime',
  exp:              () => ASSIGN_EXPRESSION
})
.map(e => new Node()) // FIXME !


//////////////////////////////////////////
export const IF_ELSE_EXPRESSION = SeqObj({
  prefix:       IF_PREFIX,
  exp:          () => ASSIGN_EXPRESSION,
  opt_else:     SeqObj({
                  kw_else:      'else',
                  opt_payload:  Opt(PAYLOAD),
                  exp:          () => EXPRESSION,
                })
})
.map(i => new Node) // FIXME !


///////////////////////////////////////
export const LOOP_EXPRESSION = SeqObj({
  label:          Opt(BLOCK_LABEL),
  inline:         Opt('inline'),
  kw:             Either('for', 'while'),
  _:              '(',
  loop_exp:       () => ASSIGN_EXPRESSION,
  _2:             ')',
  opt_payload:    Opt(PAYLOAD),
  continue_exp:   Opt(S`: ( ${() => ASSIGN_EXPRESSION} )`),
  body:           () => BLOCK_OR_EXPR,
  opt_else:       Opt(SeqObj({
                    kw_else:        'else',
                    opt_payload:    Opt(PAYLOAD),
                    statement:      Opt(() => STATEMENT),
                  })),
  opt_semi:       Opt(';')
})



export const FIELD_INIT = SeqObj({
  _dt:        '.',
  ident:      IDENT,
  _eq:        '=',
  exp:        () => EXPRESSION,
})


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
export const INIT_LIST = SeqObj({
  _st:      '{',
  lst:      Opt(Either(
              separated_by(',', () => EXPRESSION),
              separated_by(',', FIELD_INIT)
            )),
  _end:     '}'
})
.map(r => r.lst)


////////
export const CURLY_SUFFIX_EXPRESSION = SeqObj({
  type:       () => TYPE_EXPRESSION,
  lst:        INIT_LIST
})


/////////////////////////////////////////
export const PRIMARY_EXPRESSION = Either(
  IF_ELSE_EXPRESSION,
  COMPTIME_EXPRESSION,
  LOOP_EXPRESSION,
)


/////////////////////////////////////////
export const PREFIX_EXPRESSION = SeqObj({
  op:           /\!/,
  exp:          PRIMARY_EXPRESSION
})
.map(e => e.exp)

const BinOp = (op: RawRule<any>, exp: Rule<Expression>) => SeqObj({
  exp,
  rest: ZeroOrMore(SeqObj({op, exp}))
}).map(({exp, rest}) => {
  var res = exp
  for (var r of rest) {

  }
  return res
})

export const MULTIPLY_EXPRESSION = BinOp(/\*/, PREFIX_EXPRESSION)
export const ADDITION_EXPRESSION = BinOp(/\+/, MULTIPLY_EXPRESSION)
export const BITSHIFT_EXPRESSION = BinOp(/<</, ADDITION_EXPRESSION)
export const BITWISE_EXPRESSION = BinOp(/>>/, BITSHIFT_EXPRESSION)
export const COMPARE_EXPRESSION = BinOp(/==/, BITWISE_EXPRESSION)
export const BOOL_AND_EXPRESSION = BinOp('and', COMPARE_EXPRESSION)
export const BOOL_OR_EXPRESSION = BinOp('or', BOOL_AND_EXPRESSION)


////////////////////////////////////
export const EXPRESSION = SeqObj({
  maybe_try:      Opt('try'),
  expression:     BOOL_OR_EXPRESSION,
})
.map(() => new Expression())


///////////////////////////////////////////////////////
export const ASSIGN_EXPRESSION = BinOp('=', EXPRESSION)


export const LABELED_TYPE_EXPRESSION = Either(
  SeqObj({lbl: BLOCK_LABEL, blk: () => BLOCK }),
  LOOP_EXPRESSION
)


export const PRIMARY_TYPE_EXPRESSION: Rule<Expression> = Either(
  Either(
    Token('true').map(() => new a.True),
    Token('false').map(() => new a.False),
    Token('null').map(() => new a.Null),
    Token('undefined').map(() => new a.Undefined),
    Token('promise').map(() => new a.Promise),
    Token('unreachable').map(() => new a.Unreachable),
  ),
  Either(
    Token(T.IDENT).map(n => new a.Identifier().set('value', n.str)),
    Token(T.CHAR).map(n => new a.CharLiteral().set('value', n.str)),
    Token(T.FLOAT).map(n => new a.FloatLiteral().set('value', n.str)),
    Token(T.INTEGER).map(n => new a.IntegerLiteral().set('value', n.str)),
    Token(T.CHAR).map(n => new a.CharLiteral().set('value', n.str)),
    Token(T.STR).map(n => new a.StringLiteral().set('value', n.str)),
  ),
  Either(
    // parenthesized expression
    S`( ${() => PRIMARY_TYPE_EXPRESSION} )`,
    SeqObj({ident: T.BUILTIN_IDENT, args: () => FUNCTION_CALL_ARGUMENTS}),
    () => CONTAINER_DECL,
    S`. ${IDENT}`.map(n => new a.LeadingDotAccess().set('name', n)),
    S`error . ${IDENT}`.map(n => new a.ErrorField().set('name', n)),
    () => SWITCH_EXPRESSION,
    () => IF_ELSE_EXPRESSION,
    () => FUNCTION_DECLARATION,
    LABELED_TYPE_EXPRESSION,
  ),
)


///
export const PREFIX_TYPE_OP = EitherObj({
  optional: '?',
  promise: S`promise ->`,
  array_type: SeqObj({
              _1: '[',
              exp: EXPRESSION,
              _2: ']',
              z: ZeroOrMore(Either(S`align ( ${EXPRESSION} )`, 'const', 'volatile', 'allowzero'))
            }),
  pointer: SeqObj({
    ptrtype: Either('*', '**', '[*]', '[*c]'),
    modifiers: EitherObj({
      align:  S`align ( ${EXPRESSION} ${Opt(S`: ${INTEGER} : ${INTEGER}`)} )`,
              kw_const,
              kw_volatile,
              kw_allowzero
    })
  })
})


export const SUFFIX_OPERATOR = EitherObj({
  slice:    SeqObj({
              _1: '[',
              exp: EXPRESSION,
              slice: Opt(S`.. ${EXPRESSION}`),
              _2: ']'
            }),
  dot_identifier: S`. ${IDENT}`,
  dot_asterisk: S`. *`,
  dot_question: S`. ?`,
})



export const ASYNC_TYPE_EXPRESSION = SeqObj({
            kw_async,
  type:     PRIMARY_TYPE_EXPRESSION,
  suffix:   ZeroOrMore(SUFFIX_OPERATOR),
  args:     () => FUNCTION_CALL_ARGUMENTS,
})


export const SUFFIX_EXPRESSION = Either(
  ASYNC_TYPE_EXPRESSION,
  SeqObj({
    type: PRIMARY_TYPE_EXPRESSION,
    modifiers: ZeroOrMore(Either(() => FUNCTION_CALL_ARGUMENTS, SUFFIX_OPERATOR))
  })
)


export const ERROR_UNION_EXPRESSION = SeqObj({
  suffix_exp: SUFFIX_EXPRESSION,
  opt_type:   Opt(S`! ${() => TYPE_EXPRESSION}`),
})


/////////////////////////////////////////
export const TYPE_EXPRESSION: Rule<TypeExpression> = SeqObj({
  prefix: ZeroOrMore(PREFIX_TYPE_OP),
  error_union_expr: ERROR_UNION_EXPRESSION
})
.map(() => new TypeExpression())


////////////////////////////////////////
export const CONTAINER_FIELD = SeqObj({
  doc:        DOC,
              opt_kw_pub,
  ident:      IDENT,
  type:       S` : ${Opt(TYPE_EXPRESSION)}`,
  value:      S` = ${Opt(EXPRESSION)}`,
  opt_comma:  Opt(',')
})


////////////////////////////////////////////
export const VARIABLE_DECLARATION = SeqObj({
  doc:        DOC,
              opt_kw_export,
  opt_extern: Opt(S`extern ${STR}`),
              opt_kw_threadlocal,
              opt_kw_comptime,
              kw_const_var,
  ident:      IDENT,
  opt_type:   S` : ${Opt(EXPRESSION)}`,
              tk_equal,
  value:      EXPRESSION,
})
.map(({ident, opt_type, value}) =>
  new VariableDeclaration()
  .set('name', ident)
  .set('type', opt_type)
  .set('value', value)
)


/////////////////////////////////////////
export const FUNCTION_ARGUMENT = SeqObj({
  doc:      DOC,
            opt_kw_comptime,
  ident:    IDENT,
            tk_colon,
  type:     Either(TYPE_EXPRESSION, DOT3, VAR),
})
.map(r =>
  new FunctionArgument()
  .set('name', r.ident)
  .set('type', r.type)
)


export const FUNCTION_CALL_ARGUMENTS = SeqObj({
  _1:           '(',
  args:         separated_by(',', EXPRESSION),
  _2:           ')'
}).map(r => r.args)


/////////////////////////////////////////
export const FUNCTION_DECLARATION = SeqObj({
  doc:          DOC,
                opt_kw_fncc,
                OPT_EXTERN,
                opt_kw_threadlocal,
                opt_kw_inline,
  args:         separated_by(',', FUNCTION_ARGUMENT),
  return_type:  TYPE_EXPRESSION,
  definition:   EitherObj({tk_semicolon, block: () => BLOCK}),
})
.map(res =>
  new Node()
)


/////////////////////////////
export const BLOCK = SeqObj({
  opt_label:  Opt(BLOCK_LABEL),
              tk_lbrace,
  statements: ZeroOrMore(() => STATEMENT),
              tk_rbrace,
})
.map(({statements}) =>
  new Block()
  .set('statements', statements)
)


////////////////////////////////////
export const BLOCK_OR_EXPR = Either(
  BLOCK,
  EXPRESSION
)



//////////////////////////////////////
export const COMPTIME_BLOCK = SeqObj({
          kw_comptime,
  block:  BLOCK,
})
.map(r => r.block)


///////////////////////////////////////
export const DEFER_STATEMENT = SeqObj({
  kw:         Either('defer', 'errdefer'),
  contents:   BLOCK_OR_EXPR,
})


////////////////////////////////////
export const SWITCH_PRONG = SeqObj({
  case:       Either(
                'else',
                SeqObj({
                  lst: separated_by(',', SeqObj({
                    item: SeqObj({
                      item: EXPRESSION,
                      opt:  Opt(S`... ${EXPRESSION}`),
                    })
                  })),
                  opt: Opt(',')
                })
              ),
  tk:         '=>',
  payload:    Opt(PAYLOAD),
  exp:        EXPRESSION
})
.map(n => new Node())


/////////////////////////////////////////
export const SWITCH_EXPRESSION = SeqObj({
  _1:        'switch',
  _2:         '(',
  exp:        EXPRESSION,
  _3:         ')',
  _4:         '{',
  stmts:      separated_by(',', SWITCH_PRONG),
  _5:         '}',
})
.map(n => new Node())


////////////////////////////////
export const STATEMENT: Rule<Node> = SeqObj({
  stmt: Either(
    VARIABLE_DECLARATION,
    COMPTIME_BLOCK,
    DEFER_STATEMENT,
    IF_ELSE_EXPRESSION,
    DEFER_STATEMENT,
    LOOP_EXPRESSION,
    SWITCH_EXPRESSION,
    ASSIGN_EXPRESSION,
  ),
  opt_: Opt(';')
}).map(e => e.stmt)


////////////////////////////////////////
export const TEST_DECLARATION = SeqObj({
              kw_test,
  name:       Token(T.STR).map(t => t.str.slice(1, -1)),
  block:      BLOCK
})
.map(r =>
  new TestDeclaration()
  .set('name', r.name)
  .set('scope', r.block)
)


//////////////////////////////////////
export const USINGNAMESPACE = SeqObj({
          kw_usingnamespace,
  exp:    EXPRESSION,
  semi:   Opt(tk_semicolon),
})
.map(n => new Node()) // FIXME !


//////////////////////////////////////
export const CONTAINER_DECL = SeqObj({
  opt_extern:       Opt('extern'),
  opt_packed:       Opt('packed'),
  kind: Either(
    SeqObj({ kind: Either('enum', 'struct') }),
    SeqObj({ kind: 'union', opt: S`( ${S`  `} )` }) // FIXME !!!
  ),
  _1: '{',
  members: () => CONTAINER_MEMBERS,
  _2: '}',
})


//////////////////////////////////////
export const CONTAINER_MEMBERS = ZeroOrMore(Either(
  TEST_DECLARATION,
  COMPTIME_BLOCK,
  USINGNAMESPACE,
  FUNCTION_DECLARATION,
  VARIABLE_DECLARATION,
  CONTAINER_FIELD,
))


export const ROOT = CONTAINER_MEMBERS
.map(statements => new FileBlock()
  .set('statements', statements)
)