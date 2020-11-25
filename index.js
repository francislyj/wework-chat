const java = require("java");
const path = require('path');

const jdkPath = path.join(__dirname, "jar", "java_sdk.jar");

java.options.push('-Djava.library.path=' + path.join(__dirname, 'lib'));
java.classpath.push(jdkPath);

const Finance = java.import('com.tencent.wework.Finance'); //package.class

module.exports = Finance;
