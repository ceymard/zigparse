
import { Node } from "./libparse"


export class Declaration extends Node {
  pub = false
  comptime = false
  extern = false
  name = ''
  type!: Expression | null
  value!: Expression | null // when used with extern, there may not be a value
}


export class Expression extends Node {

}


export class Block extends Expression {

  parent_block: Block | null = null
  label: string | null = null
  declarations: {[name: string]: Declaration} = {}
  statements: Node[] = []

  onParsed() {
    // find the closest scope and add this scope to it.
    const parent_block = this.queryParent(Block)
    this.parent_block = parent_block

    for (var s of this.statements) {
      if (s instanceof Declaration)
        this.declarations[s.name] = s
    }
  }
}


export class ComptimeBlock extends Expression {

}


/**
 *
 */
export class FileBlock extends Expression {

  path: string = ''

  // TODO a file should let me find a Node by its position.

}

export class LeadingDotAccess extends Expression {
  name = ''
}


export class ErrorField extends Expression {
  name = ''
}

export class ErrorUnion extends Expression {
  fields = [] as ErrorField[]
}


export class Undefined extends Expression { }
export class Null extends Expression { }
export class Promise extends Expression { }
export class Unreachable extends Expression { }
export class True extends Expression { }
export class False extends Expression { }


export class Literal extends Expression {
  value = ''
}

export class Identifier extends Literal { }
export class StringLiteral extends Literal { }
export class CharLiteral extends Literal { }
export class BooleanLiteral extends Literal { }
export class IntegerLiteral extends Literal { }
export class FloatLiteral extends Literal { }

export class BuiltinFunctionCall extends Expression {
  name = ''
  args = [] as Expression[]
}

////////////////////////////////////////////////////////

export class FunctionArgumentDefinition extends Expression {
  comptime = false
  name = ''
  type!: Expression
}


export class FunctionDefinition extends Expression {
  pub = false
  extern = false
  name: string | null = null
  args = [] as FunctionArgumentDefinition[]
  return_type!: Expression
}


export class VariableDeclaration extends Expression {
  pub = false
  extern = false
  name = ''
  type: Expression | null = null
  value: Expression | null = null
}