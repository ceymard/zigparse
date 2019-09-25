import { Lexeme } from "./libparse"

export class PropertyChainer {
  set<K extends keyof this>(k: K, value: this[K]) {
    this[k] = value
    return this
  }
}


export class Position {
  constructor(
    /**
     * The first lexeme of this element
     */
    public lex_start: number,

    /**
     * The last lexeme position of this element
     */
    public lex_end: number,

    /**
     * The file tied to this position
     */
    public path: string
  ) { }
}


export class PositionedElement extends PropertyChainer {
  position!: Position
}


/**
 * A declaration is the declaration of a name.
 * It is always tied to a scope.
 */
export class Declaration extends PositionedElement {
  name: string = ''
}


export class UnprocessedType {

  constructor(public lexemes: Lexeme[]) { }

}


export class VariableDeclaration extends Declaration {
  type!: UnprocessedType | ContainerDeclaration // explicit type declaration.
}


/**
 * A scope contains declarations. That's about it.
 */
export class Scope extends PositionedElement {
  // A scope can exist inside another scope.
  parent: Scope | null = null
  declarations: Declaration[] = []

  handleDeclaration(decl: Declaration) {

  }

  appendDeclarations(decl: Declaration[]) {
    for (var d of decl) this.handleDeclaration(d)
    this.declarations = [...this.declarations, ...decl]
    return this
  }

  prependDeclarations(decl: Declaration[]) {
    for (var d of decl) this.handleDeclaration(d)
    this.declarations = [...decl, ...this.declarations]
    return this
  }


}


/**
 * A container is tied to a scope, in which some of its declarations
 * are to be treated as members and others as regular symbols.
 *
 * Members are accessed when variables are using this container as a
 * type.
 */
export class ContainerDeclaration extends Scope {

  members: Declaration[] = []

  // Override this in further declarations to add a declaration
  // to the list of members
  isMember(decl: Declaration) {
    return false
  }

  handleDeclaration(decl: Declaration) {
    if (this.isMember(decl))
      this.members.push(decl)
  }

}


/**
 *
 */
export class FunctionDeclaration extends Scope {
  args: Declaration[] = []
  return_type: string = ''
}


export class MemberedContainer extends ContainerDeclaration {
  // members:
}


export class EnumDeclaration extends MemberedContainer {

}


export class StructDeclaration extends MemberedContainer {

}


export class UnionDeclaration extends MemberedContainer {

}
