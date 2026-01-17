import type { DataModel, UITree } from "@json-render/core"

export type JsonRendererResult = {
  id: string
  tree: UITree
  data?: DataModel
}
