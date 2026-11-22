const { ModuleFederationPlugin } = require('webpack').container;
const dependencies = require('./package.json').dependencies;

module.exports = {
  webpack: {
    configure: config => {
      config.output.publicPath = 'auto';
      config.plugins.push(
        new ModuleFederationPlugin({
          name: 'rpsGame',
          filename: 'remoteEntry.js',
          exposes: {
            './Game': './src/App',
          },
          shared: {
            react: {
              singleton: true,
              strictVersion: true,
              requiredVersion: dependencies.react,
            },
            'react-dom': {
              singleton: true,
              strictVersion: true,
              requiredVersion: dependencies['react-dom'],
            },
          },
        })
      );
      return config;
    },
  },
};
