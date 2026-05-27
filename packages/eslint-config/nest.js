const base = require("./index");

module.exports = {
  ...base,
  rules: {
    ...base.rules,
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
  },
};
