// Web stub for native-only packages (@react-native-firebase, @react-native-google-signin).
// These packages include their own Google OAuth client ID (947711...) which conflicts
// with the project's client ID when bundled for web. This stub prevents them from
// being included in the Expo web build. The web login flow uses direct OAuth2 instead.
module.exports = {};
module.exports.default = {};
