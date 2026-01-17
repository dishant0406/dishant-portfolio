"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar"
import { Badge } from "@/components/shadcn/badge"
import { Checkbox } from "@/components/shadcn/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/dialog"
import { Input } from "@/components/shadcn/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover"
import { Progress } from "@/components/shadcn/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select"
import { Separator } from "@/components/shadcn/separator"
import { Slider } from "@/components/shadcn/slider"
import { Switch } from "@/components/shadcn/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs"
import { Textarea } from "@/components/shadcn/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip"
import { Button as BaseButton } from "@/components/ui/Button"
import { Card as BaseCard } from "@/components/ui/Card"
import { cn } from "@/lib/utils"
import type { ComponentRegistry } from "@json-render/react"
import {
  useAction,
  useDataBinding,
  useDataValue,
  useFieldValidation,
} from "@json-render/react"
import { AlertCircle } from "lucide-react"
import Image from "next/image"
import { useMemo } from "react"
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  AreaChart as RechartsAreaChart,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts"
import "swiper/css"
import "swiper/css/navigation"
import "swiper/css/pagination"
import { Pagination } from "swiper/modules"
import { Swiper, SwiperSlide } from "swiper/react"

type MetricFormat = "currency" | "percent" | "number" | "compact"

const CHART_PALETTE = [
  "#2563eb",
  "#10b981",
  "#f97316",
  "#e11d48",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#22c55e",
]

type CarouselItem = {
  src: string
  alt?: string
  caption?: string
}

function formatMetricValue(value: unknown, format: MetricFormat) {
  if (value === null || value === undefined) return "-"
  const numeric = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(numeric)) return String(value)

  if (format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numeric)
  }
  if (format === "percent") {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(numeric)
  }
  if (format === "compact") {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numeric)
  }
  return new Intl.NumberFormat("en-US").format(numeric)
}

function CarouselView({ items }: { items: CarouselItem[] }) {
  if (!items || items.length === 0) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm">
      <Swiper
        modules={[ Pagination]}
        navigation
        pagination={{ clickable: true }}
        spaceBetween={0}
        slidesPerView={1}
        loop={items.length > 1}
        className="w-full"
      >
        {items.map((item, index) => (
          <SwiperSlide key={index}>
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <Image
                src={item.src}
                alt={item.alt || "Carousel image"}
                fill
                className="object-cover"
              />
            </div>
            {item.caption && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground">
                {item.caption}
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}

export const jsonRendererRegistry: ComponentRegistry = {
  Carousel: ({ element }) => {
    const items = useMemo(() => {
      const raw = Array.isArray(element.props.items) ? element.props.items : []
      return raw
        .filter((item: { src?: unknown }) => typeof item?.src === "string")
        .map((item: CarouselItem) => ({
          src: item.src,
          alt: item.alt,
          caption: item.caption,
        }))
    }, [element.props.items])
    return <CarouselView items={items} />
  },
  Section: ({ element, children }) => (
    <section className="space-y-2 rounded-2xl border border-border bg-card/90 p-3 shadow-sm">
      {element.props.title && (
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            {element.props.title}
          </h3>
          {element.props.description && (
            <p className="text-sm text-muted-foreground">
              {element.props.description}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  ),
  Card: ({ element, children }) => (
    <BaseCard className="" padding="md">
      {(element.props.title || element.props.description) && (
        <div className="space-y-1 pb-1.5">
          {element.props.title && (
            <h4 className="text-base font-semibold text-foreground">
              {element.props.title}
            </h4>
          )}
          {element.props.description && (
            <p className="text-sm text-muted-foreground">
              {element.props.description}
            </p>
          )}
        </div>
      )}
      {children && <div className="flex flex-col gap-3">{children}</div>}
      {element.props.footer && (
        <div className="pt-2 text-xs text-muted-foreground">
          {element.props.footer}
        </div>
      )}
    </BaseCard>
  ),
  Metric: ({ element }) => {
    const value = useDataValue(element.props.valuePath)
    return (
      <div className="rounded-xl border border-border bg-card/90 p-3 shadow-sm">
        <p className="text-xs text-muted-foreground">{element.props.label}</p>
        <p className="text-lg font-semibold text-foreground">
          {formatMetricValue(value, element.props.format)}
        </p>
      </div>
    )
  },
  Button: ({ element }) => {
    const { execute, isLoading } = useAction(element.props.action)
    const size =
      element.props.size === "sm"
        ? "sm"
        : element.props.size === "lg"
        ? "lg"
        : "md"
    const variant =
      element.props.variant === "secondary"
        ? "outline"
        : element.props.variant === "ghost"
        ? "ghost"
        : "primary"
    return (
      <BaseButton
        variant={variant}
        size={size}
        onClick={execute}
        disabled={isLoading}
      >
        {element.props.label}
      </BaseButton>
    )
  },
  Badge: ({ element }) => (
    <Badge
      variant={element.props.variant}
      className="rounded-full border border-border bg-card text-muted-foreground"
    >
      {element.props.label}
    </Badge>
  ),
  Alert: ({ element }) => (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        element.props.variant === "destructive"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-card/90 text-foreground"
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4" />
        <div className="space-y-1">
          <p className="font-medium">{element.props.title}</p>
          {element.props.description && (
            <p className="text-xs text-muted-foreground">
              {element.props.description}
            </p>
          )}
        </div>
      </div>
    </div>
  ),
  Table: ({ element }) => {
    const rows = useDataValue<Record<string, unknown>[]>(element.props.rowsPath)
    const safeRows = Array.isArray(rows) ? rows : []
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm">
        <Table>
          <TableHeader >
            <TableRow>
              {element.props.columns.map((column: unknown) => (
                <TableHead
                  key={(column as {key: string}).key}
                  className={cn(
                    "text-xs uppercase text-muted-foreground",
                    (column as {align?: string}).align === "center" && "text-center",
                    (column as {align?: string}).align === "right" && "text-right"
                  )}
                >
                  {(column as {label: string}).label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeRows.map((row, index) => (
              <TableRow key={index}>
                {element.props.columns.map((column: unknown) => (
                  <TableCell
                    key={(column as {key: string}).key}
                    className={cn(
                      "text-sm text-foreground/90",
                      (column as {align?: string}).align === "center" && "text-center",
                      (column as {align?: string}).align === "right" && "text-right"
                    )}
                  >
                    {row[(column as {key: string}).key] !== undefined
                      ? String(row[(column as {key: string}).key])
                      : "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {safeRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={element.props.columns.length}
                  className="text-center text-sm text-muted-foreground"
                >
                  No rows available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  },
  Tabs: ({ element, children }) => {
    const defaultValue =
      element.props.defaultValue || element.props.items[0]?.value
    return (
      <Tabs defaultValue={defaultValue} className="w-full">
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="flex w-fit min-w-full gap-2 rounded-full border border-border bg-card/90 p-1 text-muted-foreground shadow-sm">
            {element.props.items.map((item: unknown) => (
              <TabsTrigger
                key={(item as {value: string}).value}
                value={(item as {value: string}).value}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {(item as {label: string}).label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {children}
      </Tabs>
    )
  },
  TabPanel: ({ element, children }) => (
    <TabsContent value={element.props.value} className="mt-4 space-y-3">
      {children}
    </TabsContent>
  ),
  Heading: ({ element }) => {
    const Tag = element.props.level
      ? (`h${element.props.level}` as "h1")
      : "h2"
    return (
      <Tag className="text-lg font-semibold text-foreground">
        {element.props.text}
      </Tag>
    )
  },
  Text: ({ element }) => (
    <p
      className={cn(
        "text-sm",
        element.props.tone === "muted" && "text-muted-foreground",
        element.props.tone === "lead" && "text-base text-foreground",
        element.props.tone === "default" && "text-foreground/90"
      )}
    >
      {element.props.text}
    </p>
  ),
  Image: ({ element }) => {
    const items: CarouselItem[] = [
      {
        src: element.props.src,
        alt: element.props.alt,
        caption: element.props.caption,
      },
    ]
    return <CarouselView items={items} />
  },
  Tooltip: ({ element }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground/90 shadow-sm">
          {element.props.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{element.props.content}</TooltipContent>
    </Tooltip>
  ),
  Popover: ({ element, children }) => (
    <Popover>
      <PopoverTrigger asChild>
        <BaseButton variant="outline" size="sm">
          {element.props.triggerLabel}
        </BaseButton>
      </PopoverTrigger>
      <PopoverContent className="space-y-2">
        {element.props.title && (
          <div className="text-sm font-semibold text-foreground">
            {element.props.title}
          </div>
        )}
        {element.props.description && (
          <p className="text-xs text-muted-foreground">
            {element.props.description}
          </p>
        )}
        {children}
      </PopoverContent>
    </Popover>
  ),
  Dialog: ({ element, children }) => {
    const { execute, isLoading } = useAction(element.props.action)
    return (
      <Dialog>
        <DialogTrigger asChild>
          <BaseButton variant="outline" size="sm">
            {element.props.triggerLabel}
          </BaseButton>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{element.props.title}</DialogTitle>
            {element.props.description && (
              <DialogDescription>{element.props.description}</DialogDescription>
            )}
          </DialogHeader>
          {children}
          <DialogFooter>
            <BaseButton onClick={execute} disabled={isLoading}>
              {element.props.actionLabel}
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
  LineChart: ({ element }) => {
    const data = useDataValue<Record<string, unknown>[]>(element.props.dataPath) || []
    return (
      <div className="rounded-2xl border border-border bg-card/90 p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={element.props.height}>
          <RechartsLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey={element.props.xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            {element.props.series.map((series: unknown, index: number) => {
              const seriesTyped = series as {key: string; label: string};
              const color = CHART_PALETTE[index % CHART_PALETTE.length]
              return (
                <Line
                  key={seriesTyped.key}
                  type="monotone"
                  dataKey={seriesTyped.key}
                  name={seriesTyped.label}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              )
            })}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    )
  },
  AreaChart: ({ element }) => {
    const data = useDataValue<Record<string, unknown>[]>(element.props.dataPath) || []
    return (
      <div className="rounded-2xl border border-border bg-card/90 p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={element.props.height}>
          <RechartsAreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey={element.props.xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            {element.props.series.map((series: unknown, index: number) => {
              const seriesTyped = series as {key: string; label: string};
              const color = CHART_PALETTE[index % CHART_PALETTE.length]
              return (
                <Area
                  key={seriesTyped.key}
                  type="monotone"
                  dataKey={seriesTyped.key}
                  name={seriesTyped.label}
                  stroke={color}
                  fill={color + "22"}
                />
              )
            })}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    )
  },
  BarChart: ({ element }) => {
    const data = useDataValue<Record<string, unknown>[]>(element.props.dataPath) || []
    return (
      <div className="rounded-2xl border border-border bg-card/90 p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={element.props.height}>
          <RechartsBarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
            <XAxis dataKey={element.props.xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RechartsTooltip />
            {element.props.series.map((series: unknown, index: number) => {
              const seriesTyped = series as {key: string; label: string};
              const color = CHART_PALETTE[index % CHART_PALETTE.length]
              return (
                <Bar
                  key={seriesTyped.key}
                  dataKey={seriesTyped.key}
                  name={seriesTyped.label}
                  fill={color}
                  radius={[6, 6, 0, 0]}
                />
              )
            })}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    )
  },
  PieChart: ({ element }) => {
    const data = useDataValue<Record<string, unknown>[]>(element.props.dataPath) || []
    return (
      <div className="rounded-2xl border border-border bg-card/90 p-3 shadow-sm">
        <ResponsiveContainer width="100%" height={element.props.height}>
          <RechartsPieChart>
            <RechartsTooltip />
            <Pie
              data={data}
              dataKey={element.props.valueKey}
              nameKey={element.props.labelKey}
              outerRadius={80}
              fill="#111827"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    )
  },
  Input: ({ element }) => {
    const [value, setValue] = useDataBinding<string>(element.props.valuePath)
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {element.props.label}
        </label>
        <Input
          type={element.props.type}
          placeholder={element.props.placeholder}
          value={value ?? ""}
          onChange={(event) => setValue(event.target.value)}
          className="rounded-full border-input bg-card text-foreground shadow-sm focus-visible:ring-ring/40"
        />
      </div>
    )
  },
  Textarea: ({ element }) => {
    const [value, setValue] = useDataBinding<string>(element.props.valuePath)
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {element.props.label}
        </label>
        <Textarea
          rows={element.props.rows}
          placeholder={element.props.placeholder}
          value={value ?? ""}
          onChange={(event) => setValue(event.target.value)}
          className="rounded-2xl border-input bg-card text-foreground shadow-sm focus-visible:ring-ring/40"
        />
      </div>
    )
  },
  Select: ({ element }) => {
    const [value, setValue] = useDataBinding<string>(element.props.valuePath)
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {element.props.label}
        </label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="rounded-full border-input bg-card text-foreground shadow-sm">
            <SelectValue placeholder={element.props.placeholder} />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border bg-card">
            {element.props.options.map((option: unknown) => (
              <SelectItem key={(option as {value: string}).value} value={(option as {value: string}).value}>
                {(option as {label: string}).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  },
  Checkbox: ({ element }) => {
    const [checked, setChecked] = useDataBinding<boolean>(element.props.valuePath)
    return (
      <label className="flex items-center gap-2 text-sm text-foreground/90">
        <Checkbox
          checked={checked ?? false}
          onCheckedChange={(next) => setChecked(Boolean(next))}
          className="border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        />
        {element.props.label}
      </label>
    )
  },
  Switch: ({ element }) => {
    const [checked, setChecked] = useDataBinding<boolean>(element.props.valuePath)
    return (
      <label className="flex items-center justify-between gap-2 text-sm text-foreground/90">
        {element.props.label}
        <Switch
          checked={checked ?? false}
          onCheckedChange={(next) => setChecked(Boolean(next))}
          className="data-[state=checked]:bg-primary"
        />
      </label>
    )
  },
  Slider: ({ element }) => {
    const [value, setValue] = useDataBinding<number>(element.props.valuePath)
    const sliderValue =
      typeof value === "number" ? [value] : [element.props.min]
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{element.props.label}</span>
          <span>{sliderValue[0]}</span>
        </div>
        <Slider
          value={sliderValue}
          min={element.props.min}
          max={element.props.max}
          step={element.props.step}
          onValueChange={(next) => setValue(next[0])}
          className="data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:rounded-full"
        />
      </div>
    )
  },
  Progress: ({ element }) => {
    const value = useDataValue<number>(element.props.valuePath)
    return (
      <Progress
        value={typeof value === "number" ? value : 0}
        className="h-2 bg-muted"
      />
    )
  },
  Avatar: ({ element }) => (
    <div className="flex items-center gap-2">
      <Avatar>
        {element.props.imageUrl && (
          <AvatarImage src={element.props.imageUrl} />
        )}
        <AvatarFallback>
          {element.props.fallback || element.props.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-foreground/90">
        {element.props.name}
      </span>
    </div>
  ),
  Separator: ({ element }) => (
    <Separator
      orientation={element.props.orientation}
      className="bg-border"
    />
  ),
  Grid: ({ element, children }) => (
    <div
      className={cn(
        "grid",
        element.props.columns === 1 && "grid-cols-1",
        element.props.columns === 2 && "grid-cols-1 md:grid-cols-2",
        element.props.columns === 3 && "grid-cols-1 md:grid-cols-3",
        element.props.columns === 4 && "grid-cols-1 md:grid-cols-4",
        element.props.gap === 2 && "gap-2",
        element.props.gap === 3 && "gap-3",
        element.props.gap === 4 && "gap-4",
        element.props.gap === 5 && "gap-5",
        element.props.gap === 6 && "gap-6"
      )}
    >
      {children}
    </div>
  ),
  Stack: ({ element, children }) => (
    <div
      className={cn(
        "flex flex-col",
        element.props.gap === 2 && "gap-2",
        element.props.gap === 3 && "gap-3",
        element.props.gap === 4 && "gap-4",
        element.props.gap === 5 && "gap-5",
        element.props.gap === 6 && "gap-6"
      )}
    >
      {children}
    </div>
  ),
  TextField: ({ element }) => {
    const [value, setValue] = useDataBinding<string>(element.props.valuePath)
    const { errors, validate, touch } = useFieldValidation(element.props.valuePath, {
      checks: element.props.checks,
      validateOn: element.props.validateOn,
      enabled: element.props.enabled,
    })
    const hasErrors = errors.length > 0
    const handleBlur = () => {
      touch()
      if (element.props.validateOn === "blur") {
        validate()
      }
    }
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value)
      if (element.props.validateOn === "change") {
        validate()
      }
    }

    return (
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          {element.props.label}
        </label>
        <Input
          type={element.props.type}
          placeholder={element.props.placeholder}
          value={value ?? ""}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "rounded-full border-input bg-card text-foreground shadow-sm focus-visible:ring-ring/40",
            hasErrors && "border-destructive/60 focus-visible:ring-destructive/30"
          )}
        />
        {hasErrors && (
          <p className="text-xs text-destructive">{errors[0]}</p>
        )}
      </div>
    )
  },
}
