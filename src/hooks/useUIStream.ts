"use client";

import type { DataModel, JsonPatch, UIElement, UITree } from "@json-render/core";
import { setByPath } from "@json-render/core";
import { useMemo, useState } from "react";

/**
 * Parse JSON patches from a buffer that may contain partial JSON
 * Returns array of successfully parsed patches and remaining unparsed buffer
 */
function parseJsonPatches(buffer: string): { patches: JsonPatch[]; remaining: string } {
  const patches: JsonPatch[] = [];
  let remaining = buffer;
  let depth = 0;
  let inString = false;
  let escape = false;
  let jsonStart = -1;

  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i];

    // Track string state
    if (char === '"' && !escape) {
      inString = !inString;
    }

    // Track escape sequences
    escape = char === "\\" && !escape;

    // Only track depth outside of strings
    if (!inString) {
      if (char === "{") {
        if (depth === 0) {
          jsonStart = i;
        }
        depth++;
      } else if (char === "}") {
        depth--;
        
        // When we close a complete JSON object
        if (depth === 0 && jsonStart !== -1) {
          const jsonStr = remaining.substring(jsonStart, i + 1);
          try {
            const parsed = JSON.parse(jsonStr) as JsonPatch;
            if (parsed && typeof parsed === "object" && "op" in parsed) {
              patches.push(parsed);
            }
          } catch (e) {
            // Invalid JSON, skip it
          }
          jsonStart = -1;
        }
      }
    }
  }

  // If we have an incomplete JSON object, keep it in the buffer
  if (jsonStart !== -1) {
    remaining = remaining.substring(jsonStart);
  } else {
    // All JSON objects were parsed, clear the buffer (keep only whitespace/newlines)
    remaining = remaining.substring(
      patches.length > 0 
        ? remaining.lastIndexOf("}") + 1 
        : 0
    ).trim();
  }

  return { patches, remaining };
}

/**
 * Apply a JSON patch to the current tree
 */
function removeByPath(target: Record<string, unknown>, path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return;
  const key = parts[parts.length - 1];
  let parent: Record<string, unknown> | null = target;
  for (const part of parts.slice(0, -1)) {
    const next = parent?.[part];
    if (!next || typeof next !== "object") {
      parent = null;
      break;
    }
    parent = next as Record<string, unknown>;
  }
  if (parent && typeof parent === "object") {
    delete (parent as Record<string, unknown>)[key];
  }
}

function applyPatch(tree: UITree, data: DataModel, patch: JsonPatch): {
  tree: UITree;
  data: DataModel;
} {
  const newTree = { ...tree, elements: { ...tree.elements } };
  let newData: DataModel = { ...data };

  switch (patch.op) {
    case "set":
    case "add":
    case "replace": {
      // Handle root path
      if (patch.path === "/root") {
        newTree.root = patch.value as string;
        return { tree: newTree, data: newData };
      }

      // Handle elements paths
      if (patch.path.startsWith("/elements/")) {
        const pathParts = patch.path.slice("/elements/".length).split("/");
        const elementKey = pathParts[0];

        if (!elementKey) return { tree: newTree, data: newData };

        if (pathParts.length === 1) {
          // Setting entire element
          newTree.elements[elementKey] = patch.value as UIElement;
        } else {
          // Setting property of element
          const element = newTree.elements[elementKey];
          if (element) {
            const propPath = "/" + pathParts.slice(1).join("/");
            const newElement = { ...element };
            setByPath(
              newElement as unknown as Record<string, unknown>,
              propPath,
              patch.value,
            );
            newTree.elements[elementKey] = newElement;
          }
        }
      } else if (patch.path.startsWith("/data")) {
        const dataPath = patch.path.slice("/data".length);
        if (dataPath === "" || dataPath === "/") {
          newData =
            patch.value && typeof patch.value === "object"
              ? (patch.value as DataModel)
              : {};
        } else {
          setByPath(newData as Record<string, unknown>, dataPath, patch.value);
        }
      }
      break;
    }
    case "remove": {
      if (patch.path.startsWith("/elements/")) {
        const elementKey = patch.path.slice("/elements/".length).split("/")[0];
        if (elementKey) {
          const { [elementKey]: _, ...rest } = newTree.elements;
          newTree.elements = rest;
        }
      } else if (patch.path.startsWith("/data")) {
        const dataPath = patch.path.slice("/data".length);
        if (dataPath === "" || dataPath === "/") {
          newData = {};
        } else {
          removeByPath(newData as Record<string, unknown>, dataPath);
        }
      }
      break;
    }
  }

  return { tree: newTree, data: newData };
}

/**
 * Hook that manages streaming JSON patches and returns the parsed UI tree
 * @returns Object with tree and setTreeString function
 */
export function useUIStream(): {
  tree: UITree;
  data: DataModel;
  setTreeString: (jsonString: string) => void;
} {
  const [jsonString, setJsonString] = useState("");

  const { tree, data } = useMemo(() => {
    // Parse all complete JSON patches from the string
    const { patches } = parseJsonPatches(jsonString);
    
    // Build tree by applying patches
    let currentTree: UITree = { root: "", elements: {} };
    let currentData: DataModel = {};
    
    for (const patch of patches) {
      const next = applyPatch(currentTree, currentData, patch);
      currentTree = next.tree;
      currentData = next.data;
    }
    
    return { tree: currentTree, data: currentData };
  }, [jsonString]);

  return { tree, data, setTreeString: setJsonString };
}

/**
 * Convert a flat element list to a UITree
 */
export function flatToTree(
  elements: Array<UIElement & { parentKey?: string | null }>,
): UITree {
  const elementMap: Record<string, UIElement> = {};
  let root = "";

  // First pass: add all elements to map
  for (const element of elements) {
    elementMap[element.key] = {
      key: element.key,
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible,
    };
  }

  // Second pass: build parent-child relationships
  for (const element of elements) {
    if (element.parentKey) {
      const parent = elementMap[element.parentKey];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(element.key);
      }
    } else {
      root = element.key;
    }
  }

  

  return { root, elements: elementMap };
}
