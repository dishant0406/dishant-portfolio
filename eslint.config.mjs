import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom rule overrides
  {
    rules: {
      // Disable overly strict rules - valid for URL sync patterns
      "@next/next/no-sync-scripts": "off",
    },
  },
  // Ignore specific patterns in page.tsx where useCallback + useEffect is a valid pattern
  {
    files: ["**/page.tsx"],
    rules: {
      // Disable React compiler rule for URL-based state synchronization patterns
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
