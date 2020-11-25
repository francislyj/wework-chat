const java = require("java"); //引入nodejs的java模块
const path = require('path');

java.options.push('-Djava.library.path=' + path.join(__dirname, 'lib'));
java.classpath.push("./jar/java_sdk.jar"); //导入编写的jar包

const Finance = java.import('com.tencent.wework.Finance'); //package.class

module.exports = Finance;
