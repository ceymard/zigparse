import { File } from "./host"
import { Lexeme, Rule, Opt, Balanced, any, Z, Either, Seq, separated_by, third, T, Token } from "./libparse"

export const ident = Token(T.IDENT).map(i => i.str.replace(/@"/, '').replace(/"$/, ''))
/**
 * A resolvable expression, where operators are ignored and we only care about
 * symbols (and function calls).
 */
const modified_ident: Rule<string> = Seq(
  // pointers and such
  Z(Either('*', '&')),
  Z(Balanced('[', any, ']')),
  Opt('const'),
  ident,
  // several chained array access
  Z(Balanced('[', any, ']')),
).map(([_1, _2, _3, i]) => i)

const potential_fncall = Seq(
  modified_ident,
  Opt(Balanced('(', any, ')')),
).map(([i, c]) => i)

export const resolvable_outer_expr = Seq(Opt('try'), Opt(Seq(any, '!')), separated_by('.', potential_fncall)).map(third).map((lst, start, end) => {
  return {
    expr: lst,
    start, end
  }
})


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
  file!: File

  setFile(f: File) {
    this.file = f
  }
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

  /**
   * Get the members of the given declaration.
   * For variables, returns the list of .names
   *
  */
  getMembers(as_type = false): Declaration[] {
    return []
  }

  getMemberByName(name: string): Declaration | null {
    var res = this.getMembers()
    for (var d of res)
      if (d.name === name) return d
    return null
  }

  getMemberByPath(path: string[]): Declaration | null {
    if (path.length === 0) return this
    var [here, ...rest] = path
    var sub = this.getMemberByName(here)
    if (!sub) return null
    return sub.getMemberByPath(rest)
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

  getMembers(as_type = false): Declaration[] {
    // console.log(this.name)
    // look first at the type. If we find it, then return its definition.
    var typ = this.parent!.resolveExpression(this.type)
    if (typ) return typ.getMembers(true)

    // if we didn't find a type, then we look at the value.

    // First try to see if it's an import
    if (this.value && this.value[0].is('@import')) {
      var import_path = this.value![2].str.replace(/"/g, '')
      var f = this.file.host.getZigFile(this.file.path, import_path)
      if (!f) return []
      return f.scope.getMembers()
    }

    // then try to see if it's a cImport
    // TODO

    // At last, just look at the value, try to resolve it and print its members.
    var val = this.parent!.resolveExpression(this.value)
    if (!val) return []

    return val.getMembers(as_type)
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

  setFile(f: File) {
    this.file = f
    for (var d of this.declarations)
      d.setFile(f)
  }

  getMembers() {
    return this.declarations
  }

  getDeclarations(): Declaration[] {
    if (this.parent) return [...this.parent.getDeclarations(), ...this.declarations]
    return this.declarations
  }

  /**
   *
   */
  getDeclarationByName(name: string) {
    for (var d of this.getDeclarations()) {
      if (d.name === name)
        return d
    }
    return null
  }

  resolveExpression(expr: Lexeme[] | null): Declaration | null {
    if (!expr) return null
    const exp = resolvable_outer_expr.parse(expr)
    if (!exp) return null
    const [variable_name, ...path] = exp.expr
    var iter: Declaration | null = this.getDeclarationByName(variable_name)
    if (!iter) return null
    for (var n of path) {
      iter = iter.getMemberByName(n)
      if (!iter) return null
    }
    return iter
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

  getMembers() {
    var typ = this.parent!.resolveExpression(this.return_type)
    if (!typ) return []
    return typ.getMembers(true)
  }
}


export class MemberField extends VariableDeclaration {

}

export class MemberedContainer extends ContainerDeclaration {
  // members:

  getMembers(as_type = false): Declaration[] {
    if (as_type) {
      return this.declarations.filter(d => {
        if (d instanceof MemberField) return true
        if (d instanceof FunctionDeclaration) {
          if (d.args.length > 0) {
            var first_arg = d.args[0]
            return d.resolveExpression(first_arg.type) === this
          }
        }
        return false
      })
    }

    // as value
    return this.declarations.filter(d => !(d instanceof MemberField))
  }
}


export class EnumDeclaration extends MemberedContainer {

}


export class StructDeclaration extends MemberedContainer {

}


export class UnionDeclaration extends MemberedContainer {

}
