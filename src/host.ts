import { Scope, Declaration } from "./ast"
import { Lexer, Lexeme } from "./libparse"
import { bare_decl_scope } from "./parser"



export class File {

  constructor(
    public lexer: Lexer,
    public scope: Scope,
    public contents: string
  ) {

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

      if (lex.input_position >= scope.position.lex_start
        && lex.input_position <= scope.position.lex_end) {
          return this.getScopeFromLexeme(d, lex)
        }
    }
    return scope
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
    const lexer = new Lexer(Object.values(T))
    const input = lexer.feed(contents)
    const scope = bare_decl_scope(null)().parse(input)!
    const res = this.files[path] = new File(lexer, scope, contents)
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
