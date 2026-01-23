import { ActionSchema, ValidationConfigSchema, createCatalog } from "@json-render/core"
import { z } from "zod"

const AlignmentSchema = z.enum(["left", "center", "right"])

export const jsonRendererCatalog = createCatalog({
  name: "portfolio-ui-catalog",
  components: {
    Section: {
      props: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      }),
      hasChildren: true,
    },
    Card: {
      props: z.object({
        title: z.string().optional()?.describe("Title for the card, max 5 words"),
        description: z.string().optional()?.describe("Short description for the card, max 80 characters, min also 80 characters"),
        footer: z.string().describe("Footer text for the card, action items like button, links, etc. should be added as children"),
      }),
      hasChildren: true,
    },
    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        format: z.enum(["currency", "percent", "number", "compact"]).default("number"),
      }),
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: ActionSchema,
        variant: z.enum(["default", "secondary", "outline", "ghost", "destructive"]).default("default"),
        size: z.enum(["sm", "md", "lg"]).default("md"),
      }),
    },
    Badge: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["default", "secondary", "outline", "destructive"]).default("default"),
      }),
    },
    Alert: {
      props: z.object({
        title: z.string(),
        description: z.string().optional(),
        variant: z.enum(["default", "destructive"]).default("default"),
      }),
    },
    Table: {
      props: z.object({
        rowsPath: z.string(),
        columns: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            align: AlignmentSchema.optional(),
          })
        ).min(1),
      }),
    },
    Tabs: {
      props: z.object({
        items: z.array(
          z.object({
            value: z.string(),
            label: z.string(),
          })
        ).min(1),
        defaultValue: z.string().optional(),
      }),
      hasChildren: true,
    },
    TabPanel: {
      props: z.object({
        value: z.string(),
      }),
      hasChildren: true,
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["1", "2", "3", "4"]).default("2"),
      }),
    },
    Text: {
      props: z.object({
        text: z.string(),
        tone: z.enum(["default", "muted", "lead"]).default("default"),
      }),
    },
    Image: {
      props: z.object({
        src: z.string(),
        alt: z.string().optional(),
        caption: z.string().optional(),
      }),
    },
    Carousel: {
      props: z.object({
        items: z.array(
          z.object({
            src: z.string(),
            alt: z.string().optional(),
            caption: z.string().optional(),
          })
        ).min(1),
      }),
    },
    Tooltip: {
      props: z.object({
        label: z.string(),
        content: z.string(),
      }),
    },
    Popover: {
      props: z.object({
        triggerLabel: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
      hasChildren: true,
    },
    Dialog: {
      props: z.object({
        triggerLabel: z.string(),
        title: z.string(),
        description: z.string().optional(),
        actionLabel: z.string(),
        action: ActionSchema,
        size: z.enum(["sm", "md", "lg"]).default("md"),
      }),
      hasChildren: true,
    },
    LineChart: {
      props: z.object({
        dataPath: z.string().describe("Path to data array in context"),
        xKey: z.string().describe("Key for X-axis values"),
        series: z.array(
          z.object({
            dataKey: z.string().describe("Key for Y-axis values"),
            name: z.string().optional().describe("Display name for legend"),
            color: z.string().optional().describe("Line color (hex or named)"),
            lineWidth: z.number().int().min(1).max(6).optional().default(2),
            dashStyle: z
              .enum([
                "Solid",
                "ShortDash",
                "ShortDot",
                "ShortDashDot",
                "ShortDashDotDot",
                "Dot",
                "Dash",
                "LongDash",
                "DashDot",
                "LongDashDot",
                "LongDashDotDot",
              ])
              .optional(),
            marker: z.boolean().optional().default(false),
            connectNulls: z.boolean().optional().default(false),
          })
        ).min(1),
        height: z.number().int().min(180).max(600).default(300),
        showGrid: z.boolean().optional().default(true),
        showLegend: z.boolean().optional().default(true),
        showTooltip: z.boolean().optional().default(true),
        xAxisLabel: z.string().optional(),
        yAxisLabel: z.string().optional(),
      }),
    },
    AreaChart: {
      props: z.object({
        dataPath: z.string().describe("Path to data array in context"),
        xKey: z.string().describe("Key for X-axis values"),
        series: z.array(
          z.object({
            dataKey: z.string().describe("Key for Y-axis values"),
            name: z.string().optional().describe("Display name for legend"),
            color: z.string().optional().describe("Area color (hex or named)"),
            fillOpacity: z.number().min(0).max(1).optional().default(0.6),
            stackId: z.string().optional().describe("Stack areas with same stackId"),
          })
        ).min(1),
        height: z.number().int().min(180).max(600).default(300),
        showGrid: z.boolean().optional().default(true),
        showLegend: z.boolean().optional().default(true),
        showTooltip: z.boolean().optional().default(true),
        xAxisLabel: z.string().optional(),
        yAxisLabel: z.string().optional(),
        stacking: z.enum(["normal", "percent"]).optional().describe("Enable stacking"),
      }),
    },
    BarChart: {
      props: z.object({
        dataPath: z.string().describe("Path to data array in context"),
        xKey: z.string().describe("Key for X-axis values"),
        series: z.array(
          z.object({
            dataKey: z.string().describe("Key for Y-axis values"),
            name: z.string().optional().describe("Display name for legend"),
            color: z.string().optional().describe("Bar color (hex or named)"),
            borderRadius: z.number().optional().describe("Border radius for bars"),
            stackId: z.string().optional().describe("Stack bars with same stackId"),
          })
        ).min(1),
        height: z.number().int().min(180).max(600).default(300),
        layout: z.enum(["horizontal", "vertical"]).optional().default("horizontal"),
        showGrid: z.boolean().optional().default(true),
        showLegend: z.boolean().optional().default(true),
        showTooltip: z.boolean().optional().default(true),
        xAxisLabel: z.string().optional(),
        yAxisLabel: z.string().optional(),
        stacking: z.enum(["normal", "percent"]).optional().describe("Enable stacking"),
      }),
    },
    PieChart: {
      props: z.object({
        dataPath: z.string().describe("Path to data array in context"),
        nameKey: z.string().describe("Key for slice labels"),
        valueKey: z.string().describe("Key for slice values"),
        height: z.number().int().min(180).max(600).default(300),
        innerSize: z.number().min(0).max(90).optional().default(0).describe("Inner size % for donut chart"),
        showLabels: z.boolean().optional().default(true),
        showLegend: z.boolean().optional().default(true),
        showTooltip: z.boolean().optional().default(true),
        colors: z.array(z.string()).optional().describe("Array of colors for slices"),
      }),
    },
    Input: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        placeholder: z.string().optional(),
        type: z.enum(["text", "email", "number", "password"]).default("text"),
      }),
    },
    Textarea: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        placeholder: z.string().optional(),
        rows: z.number().int().min(2).max(8).default(3),
      }),
    },
    TextField: {
      props: ValidationConfigSchema.merge(
        z.object({
          label: z.string(),
          valuePath: z.string(),
          placeholder: z.string().optional(),
          type: z.enum(["text", "email", "number", "password"]).default("text"),
        })
      ),
    },
    Select: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        placeholder: z.string().optional(),
        options: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          })
        ).min(2),
      }),
    },
    Checkbox: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
      }),
    },
    Switch: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
      }),
    },
    Slider: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        min: z.number().default(0),
        max: z.number().default(100),
        step: z.number().default(1),
      }),
    },
    Progress: {
      props: z.object({
        valuePath: z.string(),
      }),
    },
    Avatar: {
      props: z.object({
        name: z.string(),
        imageUrl: z.string().optional(),
        fallback: z.string().optional(),
      }),
    },
    Separator: {
      props: z.object({
        orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
      }),
    },
    Grid: {
      props: z.object({
        columns: z.number().int().min(1).max(4).default(2),
        gap: z.number().int().min(2).max(6).default(4),
      }),
      hasChildren: true,
    },
    Stack: {
      props: z.object({
        gap: z.number().int().min(2).max(6).default(4),
      }),
      hasChildren: true,
    },
  },
  actions: {
    refresh_data: { description: "Refresh bound data sources" },
    export_report: { description: "Export the current view as a report" },
    open_link: { description: "Open a URL in a new tab" },
    run_query: { description: "Run a data query" },
    apply_filter: { description: "Apply a filter to the data set" },
  },
})
