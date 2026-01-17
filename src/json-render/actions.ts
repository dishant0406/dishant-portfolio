export const jsonRendererActionHandlers: Record<
  string,
  (params: Record<string, unknown>) => Promise<unknown> | unknown
> = {
  refresh_data: () => {
    return { status: "ok", refreshedAt: new Date().toISOString() }
  },
  export_report: () => {
    return { status: "queued", downloadUrl: "" }
  },
  open_link: ({ url }) => {
    if (typeof window !== "undefined" && typeof url === "string") {
      window.open(url, "_blank", "noopener,noreferrer")
    }
    return { status: "opened" }
  },
  run_query: ({ query }) => {
    return { status: "ok", query }
  },
  apply_filter: ({ path, value }) => {
    return { status: "applied", path, value }
  },
}
