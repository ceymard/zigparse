import { Scope, Declaration, MemberField, VariableDeclaration, ContainerDeclaration } from "./ast"
import { Lexer, Lexeme } from "./libparse"
import { bare_decl_scope, T } from "./parser"


// go to definition
// completion provider
// documentSymbolProvider
// signature help
// handle refactoring, especially across files !


export class File {

  constructor(
    public host: ZigHost,
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

  /**
   * Get declarations corresponding to what can complete at a given location.
   *
   * @param file_pos: The 0 based position in the file (not line or column)
   */
  getCompletionsAt(file_pos: number) {
    // look at the current token. If it is a dot, then we have to proceed to resolve members.
    // otherwise, just complete to whatever we have in scope
  }

  /**
   * Resolve a type defined by a series of Lexemes.
   */
  resolveType(lx: Lexeme[]): Declaration | null {
    return null
  }

  resolveMemberExpressionchain(decl: Declaration, chain: string[]) {

  }

  /**
   *
   */
  resolveDotCompletion(token: Lexeme) {
    // we got here because the current token is .
    // we're going to check the expression before

    // the first step is to look for a chainable expression (id.id.fn(...).id)
    // and start at the first item.

    // we get it from the current scope, and from there we just look at its member chain.

    // note : if there is no expression, we look for the current scope and figure out wether we're
    // in a switch or a struct instanciation ; the fields are not resolvable in the same way.
  }

}


export class ZigHost {

  files: {[name: string]: File} = {}

  constructor() {
    // should call `zig builtin` to get this
    // this is a special import done to resolve @symbols.
    // this.addFile('--builtin--', '')
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

    const res = this.files[path] = new File(this, lexer, scope, contents, lex_hrtime, parse_hrtime)
    return res
  }

  getScopeFromPosition(path: string, pos: number) {
    const f = this.files[path]
    if (!f) return null

    const lexeme = f.lexer.getLexemeAt(pos)

  }

}
