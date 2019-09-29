
import { SeqObj, Opt, Either, Token, S, ZeroOrMore, Node, RawRule } from './libparse'
import { VariableDeclaration, TestDeclaration, Declaration } from './declarations'
import { Expression, TypeExpression } from './expression'
import { Block, FileBlock } from './ast'


export const T = {
  BLOCK_COMMENT: /([ \t]*\/\/\/[^\n]*\n)+/m,
  STR: /"(\\"|.)*"|\\\\[^\n]*\n(\s*\\\\[^\n]*\n)*/,
  CHAR: /'(\\'|.)*'/,
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
}


const kw_test =     'test'
const kw_const =    'const'
const kw_var =      'var'
const kw_comptime = 'comptime'
const kw_use =      'use'

const OptBool = (r: RawRule<any>) => Opt(r).map(r => !!r)

const opt_kw_comptime = OptBool(kw_comptime)
const opt_kw_extern = OptBool('extern')
const opt_kw_export = OptBool('export')
const opt_kw_inline = OptBool('inline')
const opt_kw_threadlocal = OptBool('threadlocal')


const kw_const_var = Either(kw_const, kw_var)

const tk_equal = '='
const tk_semicolon = ':'
const tk_lbrace = '{'
const tk_rbrace = '}'

//////////////////////////////////////////////////////////


export const IDENT = Token(T.IDENT)
.map(id => id.str)


///////////////////////////////
export const STR = Token(T.STR)
.map(s => s.str.slice(1, -1))
  // FIXME this is incorrect, since a string can be multiline \\


/////////////////////////////////
export const CHAR = Token(T.CHAR)
.map(s => s.str.slice(1, -1))


///////////////////////////////////
export const BLOCK_LABEL = SeqObj({
  name:     IDENT,
            tk_semicolon
})
.map(({name}) => name)


////////////////////////////////////
export const EXPRESSION = SeqObj({})
.map(() => new Expression())


/////////////////////////////////////////
export const TYPE_EXPRESSION = SeqObj({})
.map(() => new TypeExpression())


////////////////////////////////////////////
export const VARIABLE_DECLARATION = SeqObj({
              opt_kw_export,
  opt_extern: Opt(`extern ${STR}`),
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


///////////////////////////////////
export const STATEMENT = SeqObj({})
.map(() => new Node())


/////////////////////////////
export const BLOCK = SeqObj({
              tk_lbrace,
  statements: ZeroOrMore(STATEMENT),
              tk_rbrace,
})
.map(({statements}) =>
  new Block()
  .set('statements', statements)
)


////////////////////////////////////////
export const BLOCK_EXPRESSION = SeqObj({
  opt_label:    Opt(BLOCK_LABEL),
  block:        BLOCK
})
.map(r => r.block.set('label', r.opt_label))


//////////////////////////////////////
export const COMPTIME_BLOCK = SeqObj({
          kw_comptime,
  block:  BLOCK,
})
.map(r => r.block)


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


/////////////////////////////////////////
export const TOPLEVEL_COMPTIME = SeqObj({
            kw_comptime,
  block:    BLOCK_EXPRESSION,
})
.map(b => b.block)


/////////////////////////////////////////
export const FUNCTION_DECLARATION = SeqObj({
                opt_kw_export,
  opt_extern:   Opt(S`extern ${STR}`),
                opt_kw_threadlocal,
                opt_kw_inline
})


//////////////////////////////////////
export const ROOT = ZeroOrMore(Either(
  TEST_DECLARATION,
  TOPLEVEL_COMPTIME,
  // FUNCTION_DECLARATION,
  VARIABLE_DECLARATION,
))
.map(statements => new FileBlock()
  .set('statements', statements)
)