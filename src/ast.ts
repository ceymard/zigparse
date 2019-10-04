
import { Node } from "./libparse"


export type Opt<T> = T | null | undefined


export class Declaration extends Node {
  pub = false
  comptime = false
  extern = false
  name = ''
  type: Opt<Expression>
  value: Opt<Expression> // when used with extern, there may not be a value
}


export class Expression extends Node {

  getValue(): Expression | null {
    return null
  }

  getOriginalDeclaration() {

  }

  getType(): Expression | null {
    return null
  }
}


/**
 *
 */
export class Block extends Expression {

  comptime = false
  parent_block: Opt<Block>
  label: Opt<string>

  declarations: {[name: string]: Declaration} = {}
  statements: Node[] = []
  import_namespaces: UsingNamespace[] = []

  // used when the block is asked what type it is...
  breaks: Expression[] = []

  onParsed() {
    // find the closest scope and add this scope to it.
    const parent_block = this.queryParent(Block)
    this.parent_block = parent_block

    // Update declarations according to the statements we have in scope.
    for (var s of this.statements) {
      if (s instanceof Declaration)
        this.declarations[s.name] = s
    }


  }
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

export class TryExpression extends Expression {
  exp!: Expression
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

export class PrimitiveType extends Expression {
  name = ''
}

export class FunctionCall extends Expression {
  name = ''
  args = [] as Expression[]
}


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
  args = [] as FunctionArgumentDefinition[]
  return_type: Opt<Expression>
}


export class VariableDeclaration extends Declaration {
  pub = false
  extern = false
  name = ''
  type: Opt<Expression>
  value: Opt<Expression>
}


export class ContainerDeclaration extends Expression {
  extern = false
  packed = false

  statements: Node[] = []
  members: Declaration[] = []
}


export class EnumDeclaration extends ContainerDeclaration {
  opt_type = null as Expression | null
}


export class StructDeclaration extends ContainerDeclaration {

}


export class UnionDeclaration extends ContainerDeclaration {
  opt_enum = null as Expression | null
}


export class UsingNamespace extends Expression {

  exp!: Expression

  onParsed() {
    // get the closest scope and tell it it should import us.
    const block = this.queryParent(Block)
    if (!block) return
    block.import_namespaces.push(this)
  }

}


export class Optional extends Expression {
  ref!: Expression
}

export class Pointer extends Expression {
  ref!: Expression
}

export class Reference extends Expression {
  ref!: Expression
}

// ????
export class ArrayOrSliceDeclaration extends Expression {
  number: Opt<Expression> // if _ then infer the nember of members, otherwise it is provided.
  type!: Expression
}

/**
 *
 */
export class FileBlock extends StructDeclaration {

  path: string = ''

  // TODO a file should let me find a Node by its position.

}
