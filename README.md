# wework-chat
使用 java 封装了企业微信会话存档金融版 SDK 接口，提供给 node.js 直接调用。

[企业微信获取会话内容文档链接]https://work.weixin.qq.com/api/doc/90000/90135/91774

### Installation
```
npm install wework-chat
```
如果需要升级企业微信SDK,请更新 lib/libWeWorkFinanceSdk_Java.so 以及 jar/java_sdk.jar。
本模块也会持续更新优化。

##### Compiling
由于企业微信提供的 sdk 仅支持 linux 与 windows,在 OS X 下可编译成功，但无法正常使用。


### Example

```javascript

const {
    init,
    getChatData,
    getMediaData,
} = require("wework-chat");


// keyMap 私钥键值对{version, privateKey} 需采用RSA PKCS1秘钥 
const keyMap = {"1":"-----BEGIN RSA PRIVATE KEY----- ...... -----END RSA PRIVATE KEY-----"};

const test = async function (seq, limit, proxy, passwd, timeout) {
    await init(corpid, secret);
    let result = await getChatData(seq, limit, proxy, passwd, timeout, keyMap);
};

test(0, 100, null, null, 20);

```

### TO DO
* 1
* 2
