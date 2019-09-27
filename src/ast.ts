import { Lexeme } from "./libparse"

const spaces: {[name: string]: string} = {
  const: 'const '
}

export function reJoin(lex: Lexeme[] | null, prefix = '') {
  if (!lex) return ''
  // fixme need list of rejoinders
  return prefix + lex.map(l => spaces[l.str] ? spaces[l.str] : l.str).join('')
}


export class PropertyChainer {
  is<T extends {new (...a: any[]): any}>(kls: T): this is InstanceType<T> {
    return this.constructor === kls
  }

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
    public start: Lexeme,

    /**
     * The last lexeme position of this element
     */
    public end: Lexeme,
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
  parent: Scope | null = null
  doc = ''
  is_public: boolean = false
  name: string = ''

  fullName() {
    return this.name
  }
}


export class UnprocessedType {

  constructor(public lexemes: Lexeme[]) { }

}


export class VariableDeclaration extends Declaration {
  varconst = 'const'
  value: Lexeme[] | null = null
  type: Lexeme[] | null = null // explicit type declaration.

  //
  _resolved_type: Declaration | null = null
  resolved_type(t?: Declaration) {
    if (t) this._resolved_type = t
    return this._resolved_type
  }

  fullName() {
    return `${this.name}${reJoin(this.type, ': ')}`
  }
}


/**
 * A scope contains declarations. That's about it.
 */
export class Scope extends Declaration {
  // A scope can exist inside another scope.
  declarations: Declaration[] = []

  handleDeclaration(decl: Declaration) {
    decl.parent = this
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
    super.handleDeclaration(decl)
    if (this.isMember(decl))
      this.members.push(decl)
  }

}


export class FunctionArgumentDeclaration extends VariableDeclaration {

}

/**
 *
 */
export class FunctionDeclaration extends Scope {
  args: FunctionArgumentDeclaration[] = []
  return_type: Lexeme[] | null = null

  fullName() {
    return `${this.name}(${this.args.map(a => a.fullName()).join(', ')})${reJoin(this.return_type, ': ')}`
  }
}


export class MemberField extends VariableDeclaration {

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
