// config-overrides.js
const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    os: require.resolve('os-browserify/browser'),
    path: require.resolve('path-browserify'),
    process: require.resolve('process/browser'),
    buffer: require.resolve('buffer/'),
  };

  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
        process: require.resolve('process/browser.js'),
        Buffer: ['buffer', 'Buffer'],
    }),
  ]);

  return config;
};
