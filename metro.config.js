const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    ...defaultConfig.resolver,
    // Ensure tslib helpers are available for echarts and zrender
    // Force all tslib imports to use the root version
    extraNodeModules: {
      ...defaultConfig.resolver.extraNodeModules,
      tslib: path.resolve(__dirname, 'node_modules/tslib'),
    },
    // Disable package exports to avoid resolution issues with echarts
    unstable_enablePackageExports: false,
  },
  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);
