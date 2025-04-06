import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable the rule for explicit 'any' type
      "@typescript-eslint/no-explicit-any": "off",
      // Disable the rule for unused variables
      "@typescript-eslint/no-unused-vars": "off",
      // Also disable the standard no-unused-vars rule
      "no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
