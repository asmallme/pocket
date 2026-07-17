// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Reanimated 的 sharedValue.value 赋值是官方标准写法，规则误报
      "react-hooks/immutability": "off",
      // 异步加载后 setState 的惯用模式（await 之后才触发），规则误判为同步
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
