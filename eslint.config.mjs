// Next.js 16 ships eslint-config-next as native ESLint flat config, so we
// import the shared configs directly. (The old FlatCompat wrapper crashed
// with a "circular structure" error under ESLint 9 + config-next 16.)
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/globals": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/refs": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@next/next/no-img-element": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".eslint-output.json",
      "scripts/**",
      "tests/**",
    ],
  },
];

export default eslintConfig;

