
import { Node } from "./libparse"


export type Opt<T> = T | null | undefined


// FIXME missing Node.getDeclarations

export class ZigNode extends Node {

  parent!: ZigNode

  getAvailableNames(): {[name: string]: ZigNode} {
    if (this.parent) {
      return this.parent.getAvailableNames()
    }
    return {}
  }

}

export class Declaration extends ZigNode {
  pub = false
  comptime = false
  extern = false
  name!: Identifier
  type: Opt<Expression>
  value: Opt<Expression> // when used with extern, there may not be a value
}


export class Expression extends ZigNode {

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
  name!: Identifier
}


export class ErrorField extends Expression {
  name!: Identifier
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
  name!: Identifier
}

export class FunctionCall extends Expression {
  lhs!: Expression
  args = [] as Expression[]
}


export class BuiltinFunctionCall extends Expression {
  name = ''
  args = [] as Expression[]
}

////////////////////////////////////////////////////////

export class FunctionArgumentDefinition extends Expression {
  comptime = false
  name!: Identifier
  type!: Expression
}


export class FunctionDefinition extends Expression {
  pub = false
  extern = false
  args = [] as FunctionArgumentDefinition[]
  return_type: Opt<Expression>
  block: Opt<Block>
}


export class VariableDeclaration extends Declaration {
  pub = false
  extern = false
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


export class UnaryOpExpression extends Expression {
  op: Opt<Operator>
  rhs: Opt<Expression>
}

// .*
export class DerefOp extends UnaryOpExpression { }
// .?
export class DeOpt extends UnaryOpExpression { }
// !
export class NotOpt extends UnaryOpExpression { }

export class Operator extends Expression {
  value = ''
}

export class BinOpExpression extends Expression {
  operator!: Operator
  rhs: Opt<Expression>
  lhs: Opt<Expression>
}

export class Payload extends ZigNode {
  is_pointer = false
  name!: Identifier
  index: Opt<Identifier>
}

export class CatchOperator extends Operator {
  value = 'catch'
  payload: Opt<Payload>

  getAvailableNames() {
    var names = {} as {[name: string]: ZigNode}
    if (this.payload) {

      // More like this should be a variable declaration
      // whose value is @typeInfo(original_exp).ErrorUnion.error_set
      names[this.payload.name.value] = this.payload.name

      throw 'not implemented'
      // throw 'not implemented'
      // names[this.payload.exp]
    }
    return Object.assign({}, this.parent.getAvailableNames(), names)
  }
}

// exp . ident
export class DotBinOp extends BinOpExpression { }

// exp [ .. ]
export class ArrayAccessOp extends BinOpExpression {
  slice: Opt<Expression>
}


export class ReturnExpression extends Expression {
  exp: Opt<Expression>
}