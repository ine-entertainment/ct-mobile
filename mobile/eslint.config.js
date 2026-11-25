// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "dist-check/*", "android/*", "ios/*", ".expo/*"],
    rules: {
      // Data-loading screens legitimately synchronize fetched data into state.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
