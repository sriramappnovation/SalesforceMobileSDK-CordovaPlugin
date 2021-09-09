console.log('Running SalesforceMobileSDK plugin android post-install script');

//--------------------------------------
// Useful functions
//--------------------------------------
var fs = require('fs');
var exec = require('child_process').exec;
var path = require('path');
var shelljs;

try {
  shelljs = require('shelljs');
  var version = require('shelljs/package.json').version;
  if (version !== '0.7.0') {
    console.log(
      "The version 0.7.0 of the node package shelljs is required to use this script. Run 'npm install shelljs@0.7.0' before running this script."
    );
    process.exit(1);
  }
} catch (e) {
  console.log(
    "The node package shelljs is required to use this script. Run 'npm install shelljs@0.7.0' before running this script."
  );
  process.exit(1);
}

var copyFile = function (srcPath, targetPath) {
  fs.createReadStream(srcPath).pipe(fs.createWriteStream(targetPath));
};

var getAndroidSDKToolPath = function () {
  var androidHomeDir = process.env.ANDROID_HOME;
  if (typeof androidHomeDir !== 'string') {
    console.log(
      'You must set the ANDROID_HOME environment variable to the path of your installation of the Android SDK.'
    );
    return null;
  }
  var androidExePath = path.join(androidHomeDir, 'tools', 'android');
  var isWindows = /^win/i.test(process.platform);
  if (isWindows) {
    androidExePath = androidExePath + '.bat';
  }
  if (!fs.existsSync(androidExePath)) {
    console.log(
      'The "android" utility does not exist at ' +
        androidExePath +
        ".  Make sure you've properly installed the Android SDK."
    );
    return null;
  }
  return androidExePath;
};

//--------------------------------------
// Doing actual post installation work
//--------------------------------------
var androidExePath = getAndroidSDKToolPath();
if (androidExePath === null) {
  process.exit(2);
}

var pluginRoot = path.join('plugins', 'cordova-salesforce-hybrid-mobile-sdk');
var libProjectRoot = path.join(
  'plugins',
  'cordova-salesforce-hybrid-mobile-sdk',
  'src',
  'android',
  'libs'
);
var appProjectRoot = path.join('platforms', 'android');

console.log('Moving Salesforce libraries to the correct location');
shelljs.cp(
  '-R',
  path.join(libProjectRoot, 'SalesforceAnalytics'),
  appProjectRoot
);
shelljs.cp('-R', path.join(libProjectRoot, 'SalesforceSDK'), appProjectRoot);
shelljs.cp('-R', path.join(libProjectRoot, 'SmartStore'), appProjectRoot);
shelljs.cp('-R', path.join(libProjectRoot, 'MobileSync'), appProjectRoot);
shelljs.cp('-R', path.join(libProjectRoot, 'SalesforceHybrid'), appProjectRoot);

console.log('Fixing Gradle dependency paths in Salesforce libraries');
var oldSalesforceAnalyticsDep = "api project(':libs:SalesforceAnalytics')";
var oldSalesforceSdkDep = "api project(':libs:SalesforceSDK')";
var oldSmartStoreDep = "api project(':libs:SmartStore')";
var oldMobileSyncDep = "api project(':libs:MobileSync')";
replaceTextInFile(
  path.join(appProjectRoot, 'SalesforceSDK', 'build.gradle'),
  oldSalesforceAnalyticsDep,
  "api project(':SalesforceAnalytics')"
);
replaceTextInFile(
  path.join(appProjectRoot, 'SmartStore', 'build.gradle'),
  oldSalesforceSdkDep,
  "api project(':SalesforceSDK')"
);
replaceTextInFile(
  path.join(appProjectRoot, 'MobileSync', 'build.gradle'),
  oldSmartStoreDep,
  "api project(':SmartStore')"
);
replaceTextInFile(
  path.join(appProjectRoot, 'SalesforceHybrid', 'build.gradle'),
  oldMobileSyncDep,
  "api project(':MobileSync')"
);

console.log('Fixing root level Gradle file for the generated app');
replaceTextInFile(
  path.join(appProjectRoot, 'settings.gradle'),
  'include ":CordovaLib"',
  ''
);
shelljs
  .echo('include ":SalesforceAnalytics"\n')
  .toEnd(path.join(appProjectRoot, 'settings.gradle'));
shelljs
  .echo('include ":SalesforceSDK"\n')
  .toEnd(path.join(appProjectRoot, 'settings.gradle'));
shelljs
  .echo('include ":SmartStore"\n')
  .toEnd(path.join(appProjectRoot, 'settings.gradle'));
shelljs
  .echo('include ":MobileSync"\n')
  .toEnd(path.join(appProjectRoot, 'settings.gradle'));
shelljs
  .echo('include ":SalesforceHybrid"\n')
  .toEnd(path.join(appProjectRoot, 'settings.gradle'));

console.log('Moving Gradle wrapper files to application directory');
shelljs.cp('-R', path.join(pluginRoot, 'gradle.properties'), appProjectRoot);
shelljs.cp('-R', path.join(pluginRoot, 'gradlew.bat'), appProjectRoot);
shelljs.cp('-R', path.join(pluginRoot, 'gradlew'), appProjectRoot);
shelljs.cp('-R', path.join(pluginRoot, 'gradle'), appProjectRoot);

var data = fs.readFileSync(
  path.join(appProjectRoot, 'app', 'build.gradle'),
  'utf8'
);

// First verify that we didn't already modify the build.gradle file.
if (data.indexOf('SalesforceHybrid') < 0) {
  console.log('Fixing application build.gradle');
  var oldAndroidDepTree = 'android {';
  var newAndroidDepTree =
    "android {\n\tpackagingOptions {\n\t\texclude 'META-INF/LICENSE'\n\t\texclude 'META-INF/LICENSE.txt'\n\t\texclude 'META-INF/DEPENDENCIES'\n\t\texclude 'META-INF/NOTICE'\n\t}";
  replaceTextInFile(
    path.join(appProjectRoot, 'app', 'build.gradle'),
    oldAndroidDepTree,
    newAndroidDepTree
  );
  var oldGradleToolsVersion = 'com.android.tools.build:gradle:4.0.0';
  var newGradleToolsVersion = 'com.android.tools.build:gradle:4.2.1';
  replaceTextInFile(
    path.join(appProjectRoot, 'app', 'build.gradle'),
    oldGradleToolsVersion,
    newGradleToolsVersion
  );
  var newLibDep = "api project(':SalesforceHybrid')";
  replaceTextInFile(
    path.join(appProjectRoot, 'app', 'build.gradle'),
    'implementation(project(path: ":CordovaLib"))',
    newLibDep
  );
}

// Replacing values in top level build.gradle to avoid conflicts in Gradle builds.
console.log('Fixing project workspace build.gradle');
var oldGradleToolsVersion = 'com.android.tools.build:gradle:4.0.0';
var newGradleToolsVersion = 'com.android.tools.build:gradle:4.2.1';

replaceTextInFile(
  path.join(appProjectRoot, 'build.gradle'),
  oldGradleToolsVersion,
  newGradleToolsVersion
);
replaceTextInFile(
  path.join(appProjectRoot, 'build.gradle'),
  /defaultBuildToolsVersion=.*/,
  ''
);
replaceTextInFile(
  path.join(appProjectRoot, 'build.gradle'),
  /defaultMinSdkVersion=.*/,
  'defaultMinSdkVersion=23'
);
replaceTextInFile(
  path.join(appProjectRoot, 'build.gradle'),
  /defaultTargetSdkVersion=.*/,
  'defaultTargetSdkVersion=30'
);
replaceTextInFile(
  path.join(appProjectRoot, 'build.gradle'),
  /defaultCompileSdkVersion=.*/,
  'defaultCompileSdkVersion=30'
);

console.log(
  'Done running SalesforceMobileSDK plugin android post-install script'
);

function replaceTextInFile(fileName, textInFile, replacementText) {
  var contents = fs.readFileSync(fileName, 'utf8');
  var lines = contents.split(/\r*\n/);
  var result = lines
    .map(function (line) {
      return line.replace(textInFile, replacementText);
    })
    .join('\n');
  fs.writeFileSync(fileName, result, 'utf8');
}
