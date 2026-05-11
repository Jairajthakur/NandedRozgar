module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for react-native-gesture-handler to work correctly
      'react-native-reanimated/plugin',
    ],
  };
};
