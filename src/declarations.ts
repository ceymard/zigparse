import { Block } from "./ast"
import { TypeExpression, ValueExpression, Expression } from "./expression"
import { Node } from "./libparse"

export class Declaration extends Node {
  name: string = ''
}


export class VariableDeclaration extends Declaration {
  type: TypeExpression | null = null
  value: Expression | null = null

  isComptime() {
    if (!this.value || !this.type) return false
    return this.type
  }

  getOriginalDeclaration(): Declaration | null {

  }

  getTypeDeclaration(): Declaration | null {

  }
}


export class TestDeclaration extends Declaration {
  scope!: Block
}


export class FunctionDeclaration extends Declaration {
  args: FunctionArgument[] = []
  return_type: TypeExpression | null = null

  scope: Block | null = null
}


export class FunctionArgument extends VariableDeclaration {
  parent!: FunctionDeclaration
}


