'use strict';

const webpack = require('webpack')
const isProd = process.env.NODE_ENV === 'production'
const uglify = new webpack.optimize.UglifyJsPlugin({
  compressor: {
    pure_getters: true,
    unsafe      : true,
    unsafe_comps: true,
    warnings    : false,
    screw_ie8   : false
  },
  mangle    : {
    screw_ie8: false
  },
  output    : {
    screw_ie8: false
  },
  sourceMap : true
})

function ignoreRequiresFor(packages) {
  return function(context, moduleName, callback) {
    if (packages.includes(moduleName)) {
      return callback(null, `commonjs ${moduleName}`);
    }

    callback();
  }
}

module.exports = {

  devtool: 'source-map',

  target: 'web',

  externals: [ignoreRequiresFor(['url', 'http', 'https', 'stream', 'form-data', 'buffer'])],

  module: {
    rules: [
      {
        test   : /\.js$/,
        exclude: /node_modules/,
        loader : 'babel-loader'
      }
    ]
  },

  output: {
    library      : 'BackendlessRequest',
    libraryTarget: 'umd'
  },

  plugins: isProd ? [uglify] : []
}
