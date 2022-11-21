module.exports = {
  'parser': '@babel/eslint-parser',

  'env': {
    'node'        : true,
    'browser'     : true,
    'es6'         : true,
    'jest/globals': true
  },

  'extends': 'plugin:jest/recommended',

  'plugins': ['jest'],

  'rules': {
    'global-require'       : 0,
    'no-invalid-this'      : 0,
    'camelcase'            : 0,
    'require-await'        : 0,
    'prefer-const'         : 0,
    'max-lines'            : 0,
    'max-len'              : 0,
    'no-trailing-spaces'   : 0,
    'no-return-assign'     : 0,
    'array-bracket-newline': 0
  }
}
