import { Lexeme } from "./libparse"

export class Declaration {

  is_public = false
  name = ''
  start = -1
  end = -1
  parent: Declaration | null = null

  own_fields: {[name: string]: Declaration} = {}
  symbols: {[name: string]: Declaration} = {}

  setPosition(start: number, end: number) {
    this.start = start
    this.end = end
    return this
  }

  setName(v: string) {
    this.name = v
    return this
  }

  setPublic(v: any) {
    this.is_public = !!v
    return this
  }

  repr() { return '' }

  declarations: Declaration[] = []

  /**
   * get the list of symbols that are members (ie, that are resolved
   * using the . operator)
   */
  getMembers(): Declaration[] {
    return []
  }

  /**
   * Get the type of the current declaration.
   */
  getType(): Declaration | null {
    return null
  }

  /**
   * Get a single member by name
   * @param name the name of the member to resolve
   */
  getMember(name: string): Declaration | null {
    var decl = this.symbols[name]
    if (!decl) {
      if (!this.parent)
        return null
      return this.parent.getMember(name)
    }
    return decl
  }

  getDecl(path: string[]): Declaration | null {
    if (path.length === 0) return null
    var sym = this.getMember(path[0])
    if (path.length === 1) return sym
    if (!sym) return null
    return sym.getDecl(path.slice(1))
  }

  addDeclarations(decl: Declaration[] | null) {
    for (var d of (decl||[])) {
      d.parent = this
      if (d instanceof ContainerField) {
        this.own_fields[d.name] = d
      } else if (d.name) {
        this.symbols[d.name] = d
      }
    }
    if (decl)
      this.declarations = [...this.declarations, ...decl]
    return this
  }

  findScope(lexeme: Lexeme): Declaration {
    for (var d of this.declarations) {
      if (lexeme.input_position >= d.start && lexeme.input_position <= d.end)
        return d.findScope(lexeme)
    }
    return this
  }
}

export class Scope extends Declaration {

  repr() { return this.name ? `${this.constructor.name.toLowerCase()} ${this.name}` : '' }
}


export class FunctionDecl extends Scope {

  error_sets: string[] = []
  return_type: string | null = null

  // These resolve to basic types or structs / enums / union / ...
  setReturnType(t: string | null) {
    this.return_type = t
    return this
  }

  repr() {
    return `fn ${this.name} -> ${this.return_type}`
  }
}


export class Variable extends Declaration {

  qualifier: string = 'const'
  type: string | null = null

  resolveTypeDecl() {

  }

  // A variable looks for declarations in its type
  getDecl(path: string[]): Declaration | null {
    if (path.length === 0 || !this.type) return null

    var typ = this.parent!.getMember(this.type)
    if (!typ) return null

    // variables look for own fields
    var sym = typ.own_fields[path[0]]
    if (path.length === 1) return sym || null
    if (!sym) return null
    return sym.getDecl(path.slice(1))
  }


  setType(t: string | null) {
    this.type = t
    return this
  }

  repr() {
    return `${this.qualifier} ${this.name}${this.type ? ': ' + this.type : ''}`
  }

}


export class ContainerField extends Variable {
  repr() {
    return `.${this.name}${this.type ? ': ' + this.type : ''}`
  }
}


export class EnumField extends ContainerField {

  parent!: Enum

  setParent(parent: Enum) {
    this.parent = parent
    return this
  }
}



export class Container extends Scope {
  fields: ContainerField[] = []
}


export class Struct extends Scope {
  type = 'type'
}


export class Enum extends Scope {
  type = 'type'
}


export class Union extends Scope {
  type = 'type'
}
