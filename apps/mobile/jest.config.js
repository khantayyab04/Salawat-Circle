const preset = require("jest-expo/jest-preset.js");

/**
 * pnpm nests packages as `node_modules/.pnpm/<pkg>@<v>/node_modules/<pkg>`.
 * The preset's ignore pattern allows the outer `.pnpm` segment but then
 * matches the inner `node_modules/<pkg>` segment again, so any ESM-only
 * dependency has to be named explicitly here as well.
 */
const esmDependencies = ["lucide-react-native", "react-native-svg"];

/**
 * Those dependencies also ship `.mjs`, which the preset's `\.[jt]sx?$` rule
 * does not cover, so the same Babel transform is widened to include it.
 */
const scriptTransform = preset.transform["\\.[jt]sx?$"];

module.exports = {
  ...preset,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    ...preset.transform,
    "\\.mjs$": scriptTransform,
  },
  transformIgnorePatterns: preset.transformIgnorePatterns.map((pattern) =>
    pattern.startsWith("/node_modules/(?!(")
      ? pattern.replace("(?!(", `(?!(${esmDependencies.join("|")}|`)
      : pattern,
  ),
  testMatch: ["**/*.ui.test.tsx"],
};
