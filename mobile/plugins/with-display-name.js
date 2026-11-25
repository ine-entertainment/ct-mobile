const { withInfoPlist, withStringsXml, AndroidConfig } = require("@expo/config-plugins");

const DISPLAY_NAME = "未命名项目";

/**
 * Keep the native project name ASCII (ClothTravel) while showing the Chinese
 * product name on the home screen.
 */
module.exports = function withDisplayName(config) {
  config = withInfoPlist(config, (plistConfig) => {
    plistConfig.modResults.CFBundleDisplayName = DISPLAY_NAME;
    return plistConfig;
  });

  config = withStringsXml(config, (stringsConfig) => {
    AndroidConfig.Strings.setStringItem(
      [AndroidConfig.Resources.buildResourceItem({ name: "app_name", value: DISPLAY_NAME })],
      stringsConfig.modResults
    );
    return stringsConfig;
  });

  return config;
};
