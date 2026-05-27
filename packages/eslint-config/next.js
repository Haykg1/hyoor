const base = require("./index");

module.exports = {
  ...base,
  extends: [...base.extends, "next/core-web-vitals"],
  rules: {
    ...base.rules,
    "@next/next/no-html-link-for-pages": "error",
  },
};
