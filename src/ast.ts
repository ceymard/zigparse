import { Declaration } from "./declarations"
import { Node } from "./libparse"


export class Block extends Node {

  parent_block: Block | null = null
  label: string | null = null
  declarations: Declaration[] = []
  statements: Node[] = []

  onParsed() {
    // find the closest scope and add this scope to it.
    const parent_scope = this.queryParent(Block)
    this.parent_block = this
  }
}


export class ComptimeBlock extends Block {

}


/**
 *
 */
export class FileScope {

  path: string = ''

  // TODO a file should let me find a Node by its position.

}
