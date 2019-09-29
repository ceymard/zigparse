import { Node } from "./libparse";
import { Declaration, VariableDeclaration } from "./declarations";
import { Block } from "./ast";


export class Expression extends Node {

  getTypeDeclaration(): Declaration | null {
    return null
  }

  isComptime(): boolean {
    return false
  }

}


export class BinOpExpression extends Expression {
  operator: string = ''
  lhs: Expression | null = null
  rhs: Expression | null = null
}


export class UnaryOpExpression extends Expression {
  operator: string = ''
  rhs: Expression | null = null
}


export class FunctionCallExpression extends Expression {
  fn!: Expression
}


export class LambdaFunctionOrFunctionType extends Expression {
  args: VariableDeclaration[] = []
  return_type: Expression | null = null
}


export class ErrorSetMemberExpression extends Expression {

}


export class ErrorSetExpression extends Expression {
  members: ErrorSetMemberExpression[] = []
}


export class ValueExpression extends Expression {

}


export class TypeExpression extends Expression {

}


export class InstantiableExpression extends Expression {

  scope!: Block
  instance_fields: VariableDeclaration[] = []

}


export class StructExpression extends InstantiableExpression {
  packed = false
  extern = false
  members: VariableDeclaration[] = []
}


export class UnionExpression extends InstantiableExpression {
  packed = false
  extern = false
  members: VariableDeclaration[] = []
}


export class EnumExpression extends InstantiableExpression {
  members: VariableDeclaration[] = []
}