import { getByPath, setByPath, type UIElement, type UITree } from "@json-render/core";
import { createTool } from "@mastra/core/tools";
import { randomUUID } from "crypto";
import { z } from "zod";
import { jsonRendererCatalog } from "../../json-render/catalog";

const MAX_TREE_BYTES = 60000;
const MAX_DEPTH = 10;

type LegacyNode = {
  type?: string;
  children?: LegacyNode[];
  props?: Record<string, unknown>;
  [key: string]: unknown;
};

const componentPropMap: Record<string, string[]> = {
  Section: ["title", "description"],
  Card: ["title", "description", "footer"],
  Metric: ["label", "valuePath", "format", "value_path"],
  Button: ["label", "action", "variant", "size", "value", "url", "params"],
  Badge: ["label", "variant"],
  Alert: ["title", "description", "variant"],
  Table: ["rowsPath", "columns", "rows_path"],
  Tabs: ["items", "defaultValue"],
  TabPanel: ["value"],
  Heading: ["text", "level"],
  Text: ["text", "tone"],
  Input: ["label", "valuePath", "placeholder", "type"],
  Textarea: ["label", "valuePath", "placeholder", "rows"],
  TextField: ["label", "valuePath", "placeholder", "type", "checks", "validateOn", "enabled"],
  Select: ["label", "valuePath", "placeholder", "options"],
  Checkbox: ["label", "valuePath"],
  Switch: ["label", "valuePath"],
  Slider: ["label", "valuePath", "min", "max", "step"],
  Progress: ["valuePath"],
  Avatar: ["name", "imageUrl", "fallback"],
  Separator: ["orientation"],
  Image: ["src", "alt", "caption"],
  Carousel: ["items"],
  Tooltip: ["label", "content"],
  Popover: ["triggerLabel", "title", "description"],
  Dialog: ["triggerLabel", "title", "description", "actionLabel", "action", "size"],
  LineChart: ["dataPath", "xKey", "series", "height"],
  AreaChart: ["dataPath", "xKey", "series", "height"],
  BarChart: ["dataPath", "xKey", "series", "height"],
  PieChart: ["dataPath", "labelKey", "valueKey", "height"],
  Grid: ["columns", "gap"],
  Stack: ["gap"],
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeButtonProps(input: Record<string, unknown>) {
  const props: Record<string, unknown> = { ...input };
  const action = props.action;
  const value = props.value ?? props.url;

  if (typeof action === "string") {
    const params: Record<string, unknown> = {};
    if (typeof value === "string") {
      params.url = value;
    }
    props.action = { name: action, params };
  } else if (!action && typeof value === "string") {
    props.action = { name: "open_link", params: { url: value } };
  }

  if (props.variant === "primary") props.variant = "default";
  if (props.variant === "solid") props.variant = "default";
  if (props.variant === "danger") props.variant = "destructive";
  if (props.size === "small") props.size = "sm";
  if (props.size === "medium") props.size = "md";
  if (props.size === "large") props.size = "lg";

  return props;
}

function normalizeSelectOptions(input: unknown) {
  if (!Array.isArray(input)) return input;
  return input
    .map((option) => {
      if (!option || typeof option !== "object") return null;
      const raw = option as { label?: unknown; value?: unknown };
      const label =
        typeof raw.label === "string"
          ? raw.label
          : raw.value !== undefined
          ? String(raw.value)
          : "Option";
      const value =
        raw.value !== undefined
          ? String(raw.value)
          : typeof raw.label === "string"
          ? raw.label
          : "option";
      return { label, value };
    })
    .filter(Boolean);
}

function normalizeCarouselItems(input: unknown) {
  if (!Array.isArray(input)) return input;
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as { src?: unknown; alt?: unknown; caption?: unknown };
      if (typeof raw.src !== "string") return null;
      return {
        src: raw.src,
        alt: typeof raw.alt === "string" ? raw.alt : undefined,
        caption: typeof raw.caption === "string" ? raw.caption : undefined,
      };
    })
    .filter(Boolean);
}

function normalizeLegacyNode(node: LegacyNode, depth = 0): UITree {
  if (!node || depth > MAX_DEPTH) {
    return { root: "", elements: {} };
  }

  const elements: Record<string, UIElement> = {};

  const walk = (current: LegacyNode): string => {
    const key = randomUUID();
    const type = typeof current.type === "string" ? current.type : "Text";
    const rawProps =
      current.props && typeof current.props === "object" ? current.props : {};
    const propKeys = componentPropMap[type] || [];
    const merged: Record<string, unknown> = { ...rawProps };

    for (const keyName of propKeys) {
      if (keyName in current && current[keyName] !== undefined) {
        merged[keyName] = current[keyName];
      }
    }

    if (!("text" in merged) && type === "Text" && typeof current.text !== "string") {
      merged.text = typeof current.title === "string" ? current.title : "Content";
    }

    if (type === "Stack" || type === "Grid") {
      merged.gap = clampNumber(merged.gap, 2, 6, 4);
    }

    if (type === "Grid") {
      merged.columns = clampNumber(merged.columns, 1, 4, 2);
    }

    if (type === "Heading" && typeof merged.level === "number") {
      merged.level = String(merged.level);
    }

    if (type === "Metric" && !merged.valuePath && typeof merged.value_path === "string") {
      merged.valuePath = merged.value_path;
    }

    if (type === "Table" && !merged.rowsPath && typeof merged.rows_path === "string") {
      merged.rowsPath = merged.rows_path;
    }

    if (type === "Button") {
      Object.assign(merged, normalizeButtonProps(merged));
    }

    if (type === "Select") {
      merged.options = normalizeSelectOptions(merged.options);
    }

    if (type === "Carousel") {
      merged.items = normalizeCarouselItems(merged.items);
    }

    if (type === "Tooltip") {
      if (!merged.label) merged.label = "Info";
      if (!merged.content) merged.content = "More details";
    }

    if (type === "Popover") {
      if (!merged.triggerLabel) merged.triggerLabel = "Details";
      if (!merged.title) merged.title = "Details";
    }

    if (type === "Dialog") {
      if (!merged.triggerLabel) merged.triggerLabel = "Open";
      if (!merged.title) merged.title = "Details";
      if (!merged.actionLabel) merged.actionLabel = "Confirm";
      if (!merged.action) merged.action = { name: "refresh_data" };
    }

    const children = Array.isArray(current.children) ? current.children : [];
    const childKeys = children.map((child) => walk(child));

    elements[key] = {
      key,
      type,
      props: merged,
      children: childKeys,
    };

    return key;
  };

  const root = walk(node);
  return { root, elements };
}

function normalizeTree(input: unknown): UITree {
  if (
    input &&
    typeof input === "object" &&
    "root" in input &&
    "elements" in input
  ) {
    const tree = input as UITree;
    const elements: Record<string, UIElement> = {};
    for (const [key, element] of Object.entries(tree.elements || {})) {
      const children = Array.isArray(element.children) ? element.children : [];
      elements[key] = {
        ...element,
        key: element.key || key,
        children,
      };
    }
    return { root: tree.root, elements };
  }

  return normalizeLegacyNode(input as LegacyNode);
}

function normalizeInlineChildren(tree: UITree): UITree {
  const elements = { ...tree.elements };

  const materializeChild = (child: unknown): string | null => {
    if (typeof child === "string") return child;
    if (!child || typeof child !== "object") return null;
    const legacy = child as LegacyNode;
    const key = randomUUID();
    const type = typeof legacy.type === "string" ? legacy.type : "Text";
    const rawProps =
      legacy.props && typeof legacy.props === "object" ? legacy.props : {};
    const propKeys = componentPropMap[type] || [];
    const merged: Record<string, unknown> = { ...rawProps };

    for (const keyName of propKeys) {
      if (keyName in legacy && legacy[keyName] !== undefined) {
        merged[keyName] = legacy[keyName];
      }
    }

    if (!("text" in merged) && type === "Text" && typeof legacy.text !== "string") {
      merged.text = typeof legacy.title === "string" ? legacy.title : "Content";
    }

    if (type === "Stack" || type === "Grid") {
      merged.gap = clampNumber(merged.gap, 2, 6, 4);
    }

    if (type === "Grid") {
      merged.columns = clampNumber(merged.columns, 1, 4, 2);
    }

    if (type === "Heading" && typeof merged.level === "number") {
      merged.level = String(merged.level);
    }

    if (type === "Metric" && !merged.valuePath && typeof merged.value_path === "string") {
      merged.valuePath = merged.value_path;
    }

    if (type === "Table" && !merged.rowsPath && typeof merged.rows_path === "string") {
      merged.rowsPath = merged.rows_path;
    }

    if (type === "Button") {
      Object.assign(merged, normalizeButtonProps(merged));
    }

    if (type === "Select") {
      merged.options = normalizeSelectOptions(merged.options);
    }

    if (type === "Carousel") {
      merged.items = normalizeCarouselItems(merged.items);
    }

    elements[key] = {
      key,
      type,
      props: merged,
      children: [],
    };

    if (Array.isArray(legacy.children) && legacy.children.length > 0) {
      const childKeys = legacy.children
        .map((childItem) => materializeChild(childItem))
        .filter((childKey): childKey is string => typeof childKey === "string");
      elements[key].children = childKeys;
    }

    return key;
  };

  for (const element of Object.values(elements)) {
    if (!Array.isArray(element.children) || element.children.length === 0) continue;
    const normalized = element.children
      .map((child) => materializeChild(child))
      .filter((childKey): childKey is string => typeof childKey === "string");
    element.children = normalized;
  }

  return { root: tree.root, elements };
}

function normalizeTreeProps(tree: UITree): UITree {
  const elements: Record<string, UIElement> = {};

  for (const [key, element] of Object.entries(tree.elements)) {
    const props = (element.props ?? {}) as Record<string, unknown>;
    const merged = { ...props };

    if (element.type === "Stack" || element.type === "Grid") {
      merged.gap = clampNumber(merged.gap, 2, 6, 4);
    }

    if (element.type === "Grid") {
      merged.columns = clampNumber(merged.columns, 1, 4, 2);
    }

    if (element.type === "Heading" && typeof merged.level === "number") {
      merged.level = String(merged.level);
    }

    if (element.type === "Metric" && !merged.valuePath && typeof merged.value_path === "string") {
      merged.valuePath = merged.value_path;
    }

    if (element.type === "Table" && !merged.rowsPath && typeof merged.rows_path === "string") {
      merged.rowsPath = merged.rows_path;
    }

    if (element.type === "Button") {
      Object.assign(merged, normalizeButtonProps(merged));
    }

    if (element.type === "Select") {
      merged.options = normalizeSelectOptions(merged.options);
    }

    if (element.type === "Carousel") {
      merged.items = normalizeCarouselItems(merged.items);
    }

    if (element.type === "Tooltip") {
      if (!merged.label) merged.label = "Info";
      if (!merged.content) merged.content = "More details";
    }

    if (element.type === "Popover") {
      if (!merged.triggerLabel) merged.triggerLabel = "Details";
      if (!merged.title) merged.title = "Details";
    }

    if (element.type === "Dialog") {
      if (!merged.triggerLabel) merged.triggerLabel = "Open";
      if (!merged.title) merged.title = "Details";
      if (!merged.actionLabel) merged.actionLabel = "Confirm";
      if (!merged.action) merged.action = { name: "refresh_data" };
    }

    elements[key] = {
      ...element,
      key: element.key || key,
      props: merged,
    };
  }

  return { root: tree.root, elements };
}

function ensureTabsCoverage(tree: UITree): UITree {
  const elements = { ...tree.elements };
  const root = tree.root;

  for (const element of Object.values(elements)) {
    if (element.type !== "Tabs") continue;
    const items = element.props?.items as Array<{ value: string }> | undefined;
    if (!items?.length) continue;
    if (!element.props?.defaultValue && items[0]?.value) {
      element.props = { ...element.props, defaultValue: items[0].value };
    }

    const children = element.children || [];
    const panelsByValue = new Map<string, string>();
    const usedPanels = new Set(children);

    for (const childKey of children) {
      const child = elements[childKey];
      if (child?.type === "TabPanel" && typeof child.props?.value === "string") {
        panelsByValue.set(child.props.value, childKey);
      }
    }

    for (const [panelKey, panel] of Object.entries(elements)) {
      if (panel.type !== "TabPanel") continue;
      if (usedPanels.has(panelKey)) continue;
      const value = panel.props?.value;
      if (typeof value !== "string") continue;
      if (!items.some((item) => item.value === value)) continue;
      children.push(panelKey);
      usedPanels.add(panelKey);
      panelsByValue.set(value, panelKey);
    }

    for (const item of items) {
      if (!item?.value || panelsByValue.has(item.value)) continue;

      const panelKey = randomUUID();
      const textKey = randomUUID();

      elements[textKey] = {
        key: textKey,
        type: "Text",
        props: {
          text: "No content yet",
          tone: "muted",
        },
        children: [],
      };

      elements[panelKey] = {
        key: panelKey,
        type: "TabPanel",
        props: { value: item.value },
        children: [textKey],
      };

      children.push(panelKey);
    }

    elements[element.key] = {
      ...element,
      children,
    };
  }

  return { root, elements };
}

function mergeImageGroups(tree: UITree): UITree {
  const elements = { ...tree.elements };

  for (const element of Object.values(elements)) {
    if (!Array.isArray(element.children) || element.children.length === 0) continue;
    const nextChildren: string[] = [];
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      if (buffer.length === 1) {
        nextChildren.push(buffer[0]);
        buffer = [];
        return;
      }

      const items = buffer
        .map((key) => elements[key])
        .filter((node) => node?.type === "Image")
        .map((node) => ({
          src: node.props?.src,
          alt: node.props?.alt,
          caption: node.props?.caption,
        }))
        .filter((item) => typeof item.src === "string");

      const carouselKey = randomUUID();
      elements[carouselKey] = {
        key: carouselKey,
        type: "Carousel",
        props: { items },
        children: [],
      };
      nextChildren.push(carouselKey);

      for (const key of buffer) {
        delete elements[key];
      }

      buffer = [];
    };

    for (const childKey of element.children) {
      const child = elements[childKey];
      if (child?.type === "Image") {
        buffer.push(childKey);
        continue;
      }

      flushBuffer();
      nextChildren.push(childKey);
    }

    flushBuffer();
    element.children = nextChildren;
  }

  return { root: tree.root, elements };
}

function normalizeChartGrids(tree: UITree): UITree {
  const elements = { ...tree.elements };
  const chartTypes = new Set(["LineChart", "AreaChart", "BarChart", "PieChart"]);

  for (const element of Object.values(elements)) {
    if (element.type !== "Grid" || !Array.isArray(element.children)) continue;
    const chartCardChildren = element.children.filter((childKey) => {
      const child = elements[childKey];
      if (!child || child.type !== "Card") return false;
      const cardChildren = Array.isArray(child.children) ? child.children : [];
      return cardChildren.some((grandKey) => chartTypes.has(elements[grandKey]?.type));
    });

    if (chartCardChildren.length >= 2) {
      element.props = { ...(element.props || {}), columns: 1, gap: 4 };
    }
  }

  return { root: tree.root, elements };
}

function groupButtonRows(tree: UITree): UITree {
  const elements = { ...tree.elements };

  for (const element of Object.values(elements)) {
    if (!Array.isArray(element.children) || element.children.length === 0) continue;

    const nextChildren: string[] = [];
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      if (buffer.length === 1) {
        nextChildren.push(buffer[0]);
        buffer = [];
        return;
      }

      const gridKey = randomUUID();
      elements[gridKey] = {
        key: gridKey,
        type: "Grid",
        props: {
          columns: Math.min(2, buffer.length),
          gap: 3,
        },
        children: buffer,
      };
      nextChildren.push(gridKey);
      buffer = [];
    };

    for (const childKey of element.children) {
      const child = elements[childKey];
      if (child?.type === "Button") {
        buffer.push(childKey);
        continue;
      }
      flushBuffer();
      nextChildren.push(childKey);
    }

    flushBuffer();
    element.children = nextChildren;
  }

  return { root: tree.root, elements };
}

function stripRefreshButtons(tree: UITree): UITree {
  const elements = { ...tree.elements };
  const removed = new Set<string>();

  for (const [key, element] of Object.entries(elements)) {
    if (element.type !== "Button") continue;
    const actionName = (element.props?.action as { name?: string })?.name;
    if (actionName === "refresh_data") {
      removed.add(key);
      delete elements[key];
    }
  }

  if (!removed.size) return tree;

  for (const element of Object.values(elements)) {
    if (!Array.isArray(element.children)) continue;
    element.children = element.children.filter((child) => !removed.has(child));
  }

  return { root: tree.root, elements };
}

function ensureDataForTree(tree: UITree, data: Record<string, unknown>) {
  const nextData = { ...data };

  for (const element of Object.values(tree.elements)) {
    if (element.type === "Table") {
      const rowsPath = element.props?.rowsPath as string | undefined;
      const columns = element.props?.columns as Array<{ key: string }> | undefined;
      if (!rowsPath || !columns?.length) continue;
      const existing = getByPath(nextData, rowsPath);
      if (Array.isArray(existing) && existing.length > 0) continue;

      const placeholder = columns.reduce<Record<string, string>>((acc, column) => {
        acc[column.key] = "—";
        return acc;
      }, {});

      setByPath(nextData, rowsPath, [placeholder, { ...placeholder }, { ...placeholder }]);
    }

    if (element.type === "Select") {
      const valuePath = element.props?.valuePath as string | undefined;
      const options = element.props?.options as Array<{ value: string }> | undefined;
      if (!valuePath || !options?.length) continue;
      const existing = getByPath(nextData, valuePath);
      const normalizedOptions = normalizeSelectOptions(options) as Array<{ value: string }>;
      if (existing === undefined) {
        setByPath(nextData, valuePath, normalizedOptions?.[0]?.value ?? "");
        continue;
      }
      if (typeof existing !== "string") {
        setByPath(nextData, valuePath, String(existing));
        continue;
      }
      if (!normalizedOptions?.some((opt) => opt.value === existing)) {
        setByPath(nextData, valuePath, normalizedOptions?.[0]?.value ?? "");
      }
    }

    if (element.type === "TextField" || element.type === "Input" || element.type === "Textarea") {
      const valuePath = element.props?.valuePath as string | undefined;
      if (!valuePath) continue;
      const existing = getByPath(nextData, valuePath);
      if (existing !== undefined) continue;
      setByPath(nextData, valuePath, "");
    }

    if (element.type === "Checkbox" || element.type === "Switch") {
      const valuePath = element.props?.valuePath as string | undefined;
      if (!valuePath) continue;
      const existing = getByPath(nextData, valuePath);
      if (existing !== undefined) continue;
      setByPath(nextData, valuePath, false);
    }

    if (element.type === "Slider") {
      const valuePath = element.props?.valuePath as string | undefined;
      if (!valuePath) continue;
      const existing = getByPath(nextData, valuePath);
      if (existing !== undefined) continue;
      const min = typeof element.props?.min === "number" ? element.props.min : 0;
      setByPath(nextData, valuePath, min);
    }

    if (element.type === "Metric" || element.type === "Progress") {
      const valuePath = element.props?.valuePath as string | undefined;
      if (!valuePath) continue;
      const existing = getByPath(nextData, valuePath);
      if (existing !== undefined) continue;
      setByPath(nextData, valuePath, element.type === "Progress" ? 40 : 0);
    }

    if (
      element.type === "LineChart" ||
      element.type === "AreaChart" ||
      element.type === "BarChart" ||
      element.type === "PieChart"
    ) {
      const dataPath = element.props?.dataPath as string | undefined;
      if (!dataPath) continue;
      const existing = getByPath(nextData, dataPath);
      if (Array.isArray(existing) && existing.length > 0) continue;

      const xKey =
        element.type === "PieChart"
          ? (element.props?.labelKey as string | undefined)
          : (element.props?.xKey as string | undefined);
      const series = element.props?.series as Array<{ key: string }> | undefined;
      const valueKey =
        element.type === "PieChart"
          ? (element.props?.valueKey as string | undefined)
          : series?.[0]?.key;

      if (!xKey || !valueKey) {
        continue;
      }

      if (element.type === "PieChart") {
        setByPath(nextData, dataPath, [
          { [xKey]: "A", [valueKey]: 40 },
          { [xKey]: "B", [valueKey]: 60 },
        ]);
      } else {
        setByPath(nextData, dataPath, [
          { [xKey]: "Jan", [valueKey]: 24 },
          { [xKey]: "Feb", [valueKey]: 38 },
          { [xKey]: "Mar", [valueKey]: 52 },
          { [xKey]: "Apr", [valueKey]: 41 },
        ]);
      }
    }
  }

  return nextData;
}

export const generateJsonRendererTool = createTool({
  id: "generate-json-renderer",
  description:
    "Register a JSON Renderer UI tree that matches the catalog schema. Returns an id that can be used in <JSONRenderer>{id}</JSONRenderer> tags.",
  inputSchema: z.object({
    tree: z.unknown(),
    data: z.record(z.unknown()).optional(),
  }),
  outputSchema: z.object({
    id: z.string(),
    tree: z.unknown(),
    data: z.record(z.unknown()).optional(),
  }),
  execute: async ({ context }) => {
    const tree = stripRefreshButtons(
      ensureTabsCoverage(
        normalizeChartGrids(
          mergeImageGroups(
            groupButtonRows(
              normalizeInlineChildren(normalizeTreeProps(normalizeTree(context?.tree)))
            )
          )
        )
      )
    );
    const data = ensureDataForTree(tree, context?.data ?? {});
    const validation = jsonRendererCatalog.validateTree(tree);

    if (!validation.success) {
      const firstIssue = validation.error?.issues?.[0];
      const detail = firstIssue
        ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
        : "Unknown schema error";
      throw new Error(`JSON renderer tree failed catalog validation: ${detail}`);
    }

    const encoded = JSON.stringify(tree);

    if (encoded.length > MAX_TREE_BYTES) {
      throw new Error("JSON renderer tree is too large.");
    }

    return {
      id: randomUUID(),
      tree: validation.data,
      data,
    };
  },
});
