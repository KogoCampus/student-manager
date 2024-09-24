module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // example: git commit -m "foo: test eslint"
    // type [foo] is for any neglectable changes
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'ci', 'test', 'foo']],
  },
};
