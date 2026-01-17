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
        title: z.string().optional(),
        description: z.string().optional(),
        footer: z.string().optional(),
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
        variant: z.enum(["default", "secondary", "outline", "destructive"]).default("secondary"),
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
        dataPath: z.string(),
        xKey: z.string(),
        series: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            color: z.string().optional(),
          })
        ).min(1),
        height: z.number().int().min(180).max(360).default(220),
      }),
    },
    AreaChart: {
      props: z.object({
        dataPath: z.string(),
        xKey: z.string(),
        series: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            color: z.string().optional(),
          })
        ).min(1),
        height: z.number().int().min(180).max(360).default(220),
      }),
    },
    BarChart: {
      props: z.object({
        dataPath: z.string(),
        xKey: z.string(),
        series: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            color: z.string().optional(),
          })
        ).min(1),
        height: z.number().int().min(180).max(360).default(220),
      }),
    },
    PieChart: {
      props: z.object({
        dataPath: z.string(),
        labelKey: z.string(),
        valueKey: z.string(),
        height: z.number().int().min(180).max(320).default(220),
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
