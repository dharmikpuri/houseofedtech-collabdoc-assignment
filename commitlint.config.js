/**
 * Enforces Conventional Commits so the history reads as intentional, phase-by-phase work.
 * Allowed types kept deliberately small — one per kind of change we actually make.
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "chore", "docs", "refactor", "style", "test", "ci", "perf"],
    ],
  },
};
