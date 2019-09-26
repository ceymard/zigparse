import { Scope, Declaration } from "./ast"
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

  getDeclarationsInScope(scope: Scope) {

  }

  /**
   *
   * @param pos position in the file
   */
  getScopeFromPosition(pos: number) {
    const lex = this.lexer.getLexemeAt(pos)
    return lex ? this.getScopeFromLexeme(this.scope, lex) : null
  }

  getScopeFromLexeme(scope: Scope, lex: Lexeme): Scope {
    for (var d of scope.declarations) {

      if (!(d instanceof Scope))
        continue

      if (lex.input_position >= d.position.lex_start && lex.input_position <= d.position.lex_end) {
          return this.getScopeFromLexeme(d, lex)
        }
    }
    return scope
  }

  /**
   * Get declarations corresponding to what can complete at symbol.
   *
   * @param file_pos: The 0 based position in the file (not line or column)
   */
  getCompletionsAt(file_pos: number) {

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

  /**
   * Get a list of all interesting declarations.
   * @param path
   * @param pos the position of
   */
  getDeclarationsInScope(path: string, pos: number) {

  }

  /**
   * Get a declaration by its name from a given scope.
   * @param path The path of the file
   * @param pos The position in the file
   * @param name The name of the symbol to resolve
   */
  getDeclarationByName(path: string, pos: number, name: string) {

  }

  /**
   *
   * @param decl
   * @param path
   */
  getMembersChain(decl: Declaration, path: string[]): Declaration[] | null {
    return null
  }


  getMembers(decl: Declaration) {

  }

}
