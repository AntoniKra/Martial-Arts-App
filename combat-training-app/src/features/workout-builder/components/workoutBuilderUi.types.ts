export type ActiveInlinePanel =
  | {
      type: 'addBreak'
      blockId: string
    }
  | {
      type: 'editBreak'
      blockId: string
      itemId: string
    }
  | {
      type: 'confirmBlockDelete'
      blockId: string
      itemCountAtOpen: number
    }
  | null

export type FocusRestoreTarget =
  | {
      type: 'addBlock'
    }
  | {
      type: 'addBreak'
      blockId: string
    }
  | {
      type: 'editBreak'
      itemId: string
    }
