
import { SeqObj, Opt, Either, Token, S, ZeroOrMore, Node } from './libparse'
import { VariableDeclaration, TestDeclaration, Declaration } from './declarations'
import { Expression, TypeExpression } from './expression'
import { Block } from './ast'


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


const kw_test = 'test'
const kw_const =    'const'
const kw_var =      'var'
const kw_comptime = 'comptime'

const opt_kw_comptime = Opt(kw_comptime)
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
            opt_kw_comptime,
            kw_const_var,
  ident:    IDENT,
  opt_type: S`: ${Opt(EXPRESSION)}`,
            tk_equal,
  value:    EXPRESSION,
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
  .set('declarations', statements.filter(s => s instanceof Declaration) as Declaration[])
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


//////////////////////////////////////
export const ROOT = ZeroOrMore(Either(

))