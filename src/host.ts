import { Lexer, Lexeme, T } from "./libparse"
import { bare_decl_scope, lexemes } from "./parser"
import { Scope, Declaration, MemberField, VariableDeclaration, ContainerDeclaration, FunctionArgumentDeclaration, resolvable_outer_expr } from "./ast"
import * as w from 'which'

import * as pth from 'path'
import * as fs from 'fs'
import * as cp from 'child_process'

// go to definition
// completion provider
// documentSymbolProvider
// signature help
// handle refactoring, especially across files !


export class File {

  constructor(
    public host: ZigHost,
    public path: string,
    public lexer: Lexer,
    public scope: Scope,
    public contents: string,
    public lex_hrtime: [number, number] = [0, 0],
    public parse_hrtime: [number, number] = [0, 0]
  ) {

  }

  iterDeclarations(fn: (d: Declaration) => void, check_public = false) {

    function iter(d: Declaration) {

      if ((d.is(VariableDeclaration) || d instanceof ContainerDeclaration)
        && !d.is(Scope) && check_public && !d.is_public) return

      if (d.name)
        fn(d)

      if (d instanceof Scope) {
        for (var sub_decl of d.declarations)
          iter(sub_decl)
      }
    }

    iter(this.scope)
  }

  mapDeclarations<T>(fn: (d: Declaration) => T | undefined, check_public = false): T[] {
    var res: T[] = []
    this.iterDeclarations(d => {
      var r = fn(d)
      if (r !== undefined)
        res.push(r)
    })
    return res
  }

  getDeclarationsInScope(scope: Scope, pub_only = false): Declaration[] {
    var res: Declaration[] = []
    if (scope.parent) {
      res = [...this.getDeclarationsInScope(scope.parent, pub_only), ...res]
      // Object.assign(res, this.getDeclarationsInScope(scope.parent, pub_only))
    }

    for (var d of scope.declarations) {
      if (d.name && (!pub_only || d.is_public))
        res.push(d)
    }

    return res.filter(d => !d.is(MemberField))
  }

  getDeclarationsAt(pos: number) {
    const scope = this.getScopeAt(pos)
    if (!scope) return null
    return this.getDeclarationsInScope(scope)
  }

  /**
   *
   * @param pos position in the file
   */
  getScopeAt(pos: number) {
    const lex = this.lexer.getLexemeAt(pos)
    return lex ? this.getScopeFromLexeme(this.scope, lex) : null
  }

  getScopeFromLexeme(scope: Scope, lex: Lexeme): Scope {
    for (var d of scope.declarations) {

      if (!(d instanceof Scope))
        continue

      if (lex.input_position >= d.position.start.input_position && lex.input_position <= d.position.end.input_position) {
          return this.getScopeFromLexeme(d, lex)
        }
    }
    return scope
  }

  getDeclarationByName(decls: Declaration[], name: string) {
    for (var d of decls)
      if (d.name === name) return d
    return null
  }

  getDeclarationAt(file_pos: number): Declaration | null {
    const lx = this.lexer.getLexemeAt(file_pos)
    if (!lx) return null
    const expr = resolvable_outer_expr.map(lexemes).tryParse(lx.input_position, this.lexer.lexed, -1)
    if (!expr) return null
    const scope = this.getScopeAt(file_pos)
    if (!scope) return null
    return scope.resolveExpression(expr[1])
  }

  /**
   * Get declarations corresponding to what can complete at a given location.
   *
   * @param file_pos: The 0 based position in the file (not line or column)
   */
  getCompletionsAt(file_pos: number): Declaration[] {
    const lx = this.lexer.getLexemeAt(file_pos)

    if (!lx) return []

    // If the current token is a dot, then go backwards one step to get the preceding expression.
    // if it is not, then see if we're on an expression and that we want to potentially replace the current token.
    const expr = resolvable_outer_expr
      .map(lexemes).tryParse(lx.is('.') ? lx.input_position - 1 : lx.input_position, this.lexer.lexed, -1)
    var scope = this.getScopeAt(file_pos)
    if (!scope || !expr) return []
    const decl = scope.resolveExpression(expr[1])
    if (!decl && lx.is('.')) return []
    if (!decl) return this.getDeclarationsAt(file_pos)||[]
    return decl.getMembers() || []
  }

  /**
   * When given a declaration, iter through its member chain and their types.
   */
  resolveMemberExpressionchain(decl: Declaration, chain: string[]) {
    // scopes are their own type and thus give back their scope content.
    // values have a type -> from which we want the members
    // functions have a return_type -> from which we want the members
    const type_decl = (decl instanceof ContainerDeclaration) ? decl : this.resolveTypeDeclaration(decl)

    if (!type_decl) return null

    for (var c of chain) {

    }
  }

  /**
   * @param decl: a value declaration. It should have a type with stuff in it, or at least a value
   *    that lets us read into it.
   */
  resolveTypeDeclaration(decl: Declaration): Declaration | null {
    var typ = (decl as any).type as Lexeme[]

    if (decl.is(FunctionArgumentDeclaration))
      typ = decl.type!

    if (!typ) return null
    return null
  }

}


export class ZigHost {

  files: {[name: string]: File} = {}
  zigroot: string = ''
  librairies: {[name: string]: string} = {}

  constructor(public zigpath: string) {
    var path = zigpath && fs.existsSync(zigpath) && fs.statSync(zigpath).isFile() ? zigpath : w.sync('zig', {nothrow: true})
    if (path) {
      path = fs.realpathSync(path)
      this.zigroot = pth.dirname(path)
      this.zigpath = path
      this.librairies['std'] = pth.join(this.zigroot, './lib/zig/std/std.zig')
    }

    const contents = cp.execSync(`${this.zigpath} builtin`, {encoding: 'utf-8'})
    this.addFile('builtin', contents)
  }

  /**
   * Get several c files, generally imports
   */
  getCFile(fromfile: string, paths: string[]): File | null {
    return null
  }

  getZigFile(fromfile: string, path: string): File | null {
    try {
      if (path === 'builtin') {
        return this.files['builtin']
      }
      if (this.librairies[path]) {
        return this.addFile(this.librairies[path], fs.readFileSync(this.librairies[path], 'utf-8'))
      } else {

        path = pth.resolve(pth.dirname(fromfile), path)
        return this.addFile(path, fs.readFileSync(path, 'utf-8'))
      }
    } catch (e) {
      return null
    }
    // should get std and such
  }

  addFile(path: string, contents: string) {
    const prev_file = this.files[path]

    if (prev_file && prev_file.contents === contents)
      return prev_file

    // const cts = fs.readFileSync(name, 'utf-8')

    var start = process.hrtime()
    const lexer = new Lexer(Object.values(T))
    const input = lexer.feed(contents)
    const lex_hrtime = process.hrtime(start)

    start = process.hrtime()
    const scope = bare_decl_scope(null)().parse(input)!
    const parse_hrtime = process.hrtime(start)

    const res = this.files[path] = new File(this, path, lexer, scope, contents, lex_hrtime, parse_hrtime)
    scope.setFile(res)
    return res
  }

  getScopeFromPosition(path: string, pos: number) {
    const f = this.files[path]
    if (!f) return null

    const lexeme = f.lexer.getLexemeAt(pos)

  }

}
