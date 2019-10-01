import { Declaration } from "./declarations"
import { Node } from "./libparse"


export class Block extends Node {

  parent_block: Block | null = null
  label: string | null = null
  declarations: {[name: string]: Declaration} = {}
  statements: Node[] = []

  onParsed() {
    // find the closest scope and add this scope to it.
    const parent_block = this.queryParent(Block)
    this.parent_block = parent_block

    for (var s of this.statements) {
      if (s instanceof Declaration)
        this.declarations[s.name] = s
    }
  }
}


export class ComptimeBlock extends Block {

}


/**
 *
 */
export class FileBlock extends Block {

  path: string = ''

  // TODO a file should let me find a Node by its position.

}


export class Literal extends Node {

}

export class StringLiteral extends Literal { value = '' }
export class CharLiteral extends Literal { value = '' }
export class BooleanLiteral extends Literal { value = false }
export class IntegerLiteral extends Literal { value = 0 }
export class FloatLiteral extends Literal { value = 0 }
