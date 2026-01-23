"use client"

import { jsonRendererActionHandlers } from "@/json-render/actions"
import { jsonRendererRegistry } from "@/json-render/registry"
import type { JsonRendererResult } from "@/json-render/types"
import { ConfirmDialog, JSONUIProvider, Renderer, useActions } from "@json-render/react"

interface JsonRendererEmbedProps {
  result: JsonRendererResult
}

function ActionConfirmationLayer() {
  const { pendingConfirmation, confirm, cancel } = useActions()

  if (!pendingConfirmation?.action.confirm) return null

  return (
    <ConfirmDialog
      confirm={pendingConfirmation.action.confirm}
      onConfirm={confirm}
      onCancel={cancel}
    />
  )
}

export function JsonRendererEmbed({ result }: JsonRendererEmbedProps) {
  if (!result.tree) return null
  const dataKey = JSON.stringify(result.data ?? {})

  return (
    <div className="mt-2 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm">
      <JSONUIProvider
        key={dataKey}
        registry={jsonRendererRegistry}
        initialData={result.data || {}}
        actionHandlers={jsonRendererActionHandlers}
      >
        <Renderer tree={result.tree} registry={jsonRendererRegistry} />
        <ActionConfirmationLayer />
      </JSONUIProvider>
    </div>
  )
}

export default JsonRendererEmbed
