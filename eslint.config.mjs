// Next.js 16 ships eslint-config-next as native ESLint flat config, so we
// import the shared configs directly. (The old FlatCompat wrapper crashed
// with a "circular structure" error under ESLint 9 + config-next 16.)
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
