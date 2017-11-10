'use strict';

const ExternalModule = require('webpack/lib/ExternalModule')
const webpack = require('webpack')

const nativeExternalModuleGetSourceForCommonJsExternal = ExternalModule.prototype.getSourceForCommonJsExternal

const externalNodeModules = ['url', 'http', 'https', 'stream', 'form-data', 'buffer']

ExternalModule.prototype.getSourceForCommonJsExternal = function(moduleAndSpecifiers) {
  if (typeof moduleAndSpecifiers === 'string' && externalNodeModules.includes(moduleAndSpecifiers)) {
    //we must not include external NodeJs packages to "dist" build by several reasons,
    //one of these is problem with ReactNative http://support.backendless.com/topic/latest-npm-version-4-1-6-not-working-with-react-native
    return [
      'throw new Error(\'',
      'This Backendless JS SDK assembly is not intended for Node.js environment. ' +
      'You should use "lib" folder modules instead. ' +
      'For any questions please contact as at http://support.backendless.com/',
      '\')'
    ].join('');
  }

  return nativeExternalModuleGetSourceForCommonJsExternal.apply(this, arguments)
}

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

module.exports = {

  devtool: 'source-map',

  target: 'web',

  externals: function(context, moduleName, callback) {
    if (externalNodeModules.includes(moduleName)) {
      return callback(null, `commonjs ${moduleName}`);
    }

    callback();
  },

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
