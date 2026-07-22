import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * Next.js 16 ships native ESLint flat configs, so we compose them directly
 * (no FlatCompat bridge needed).
 */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "src/generated/**",
      "collab-server/**",
    ],
  },
];

export default eslintConfig;
