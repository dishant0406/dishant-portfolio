"use client"

import { createContext, useContext, useMemo, useState } from "react"

type FollowUpContextValue = {
  isLatest: boolean
  isDismissed: boolean
  dismiss: () => void
}

const FollowUpContext = createContext<FollowUpContextValue | null>(null)

export function FollowUpProvider({
  isLatest,
  children,
}: {
  isLatest: boolean
  children: React.ReactNode
}) {
  const [isDismissed, setIsDismissed] = useState(false)
  const value = useMemo(
    () => ({
      isLatest,
      isDismissed,
      dismiss: () => setIsDismissed(true),
    }),
    [isLatest, isDismissed]
  )

  return <FollowUpContext.Provider value={value}>{children}</FollowUpContext.Provider>
}

export function useFollowUpContext() {
  return useContext(FollowUpContext)
}
